import {
  DelegatingMutationGovernanceSink,
  DelegatingMutationPolicyApprovalProvider,
  DelegatingMutationPolicyRegistry,
  MISSING_MUTATION_POLICY,
  MISSING_MUTATION_POLICY_APPROVAL,
  MutationDecision,
  MutationGovernanceWarning,
  MutationPlan,
  MutationPolicy,
  MutationPolicyError,
  MutationPolicyIdentity,
  UserContext,
} from '../src';
import {
  AbstractSQLTeaQLClient,
  SqlSession,
  TeaQLSqlDriver,
} from '../src/sql/core';

const schemas = {
  Order: { table: 'order_data', columns: {
    id: { columnName: 'id', logicalType: 'integer' as const, decode: 'string' as const },
    version: { columnName: 'version', logicalType: 'integer' as const, decode: 'number' as const },
    name: { columnName: 'name', logicalType: 'text' as const, decode: 'string' as const },
  } },
  OrderLine: { table: 'order_line_data', columns: {
    id: { columnName: 'id', logicalType: 'integer' as const, decode: 'string' as const },
    version: { columnName: 'version', logicalType: 'integer' as const, decode: 'number' as const },
    name: { columnName: 'name', logicalType: 'text' as const, decode: 'string' as const },
  } },
};

class RecordingDriver implements TeaQLSqlDriver, SqlSession {
  readonly databaseKind = 'sqlite' as const;
  providerMutations = 0;
  persistedMutations = 0;
  transactions = 0;
  commits = 0;
  rollbacks = 0;
  private next = 0;
  private pendingMutations = 0;

  async query(sql: string): Promise<any> {
    if (/^\s*(?:INSERT|UPDATE|DELETE)/i.test(sql)) {
      this.providerMutations++;
      this.pendingMutations++;
    }
    if (/^\s*SELECT/i.test(sql)) {
      return { rows: [{ id: String(this.next), version: 1, name: 'persisted' }], rowCount: 1 };
    }
    return { rows: [], rowCount: 1 };
  }
  async *stream(): AsyncIterable<any> {}
  identifier(value: string): string { return `"${value}"`; }
  placeholder(): string { return '?'; }
  encode(value: any): any { return value; }
  contains(): string { return ''; }
  aggregateFunction(name: string): string { return name; }
  async ensureSchema(): Promise<void> {}
  async transaction<T>(work: (session: SqlSession) => Promise<T>): Promise<T> {
    this.transactions++;
    this.pendingMutations = 0;
    try {
      const result = await work(this);
      this.persistedMutations += this.pendingMutations;
      this.pendingMutations = 0;
      this.commits++;
      return result;
    } catch (error) {
      this.pendingMutations = 0;
      this.rollbacks++;
      throw error;
    }
  }
  async nextId(): Promise<string> { this.next++; return String(this.next); }
  async ensureIdFloor(): Promise<void> {}
  async close(): Promise<void> {}
}

class Client extends AbstractSQLTeaQLClient {
  constructor(driver: RecordingDriver) { super(driver, schemas); }
}

class TestPolicy implements MutationPolicy {
  constructor(
    readonly identity: MutationPolicyIdentity,
    private readonly reviewer: (plan: MutationPlan) => MutationDecision,
  ) {}
  review(_context: unknown, plan: MutationPlan): MutationDecision {
    return this.reviewer(plan);
  }
}

const identity = Object.freeze({
  policyId: 'orders', version: '1', fingerprint: 'sha256:orders-v1',
});

function approvedContext(policy: MutationPolicy): UserContext {
  return new UserContext()
    .withMutationPolicyRegistry(new DelegatingMutationPolicyRegistry(() => policy))
    .withMutationPolicyApprovalProvider(new DelegatingMutationPolicyApprovalProvider(
      requested => ({ policy: requested, approvedBy: 'security-owner', approvedAt: new Date() }),
    ));
}

test('whole graph is reviewed immutably and its governance reaches every audit event', async () => {
  const observed: Record<string, unknown> = {};
  const policy = new TestPolicy(identity, plan => {
    observed.operationCount = plan.operations.length;
    observed.firstName = plan.operations[0].changedValues.name;
    observed.frozen = Object.isFrozen(plan)
      && Object.isFrozen(plan.operations)
      && Object.isFrozen(plan.operations[0].changedValues);
    return { verdict: 'allow' };
  });
  const context = approvedContext(policy);
  const driver = new RecordingDriver();
  const client = new Client(driver).setUserContext(context);
  const order = { entity: 'Order', action: 'Create', payload: { name: 'DRAFT' }, comment: 'submit order' };
  const line = { entity: 'OrderLine', action: 'Create', payload: { name: 'LINE-1' }, comment: 'submit line' };

  await client.executeGraphSave(async () => {
    client.preflightMutation(order);
    client.preflightMutation(line);
    order.payload.name = 'CHANGED-AFTER-PREFLIGHT';
    await client.executeMutation({ ...order, payload: { name: 'DRAFT' } });
    await client.executeMutation(line);
  });

  expect(observed).toEqual({ operationCount: 2, firstName: 'DRAFT', frozen: true });
  expect(driver.providerMutations).toBe(2);
  expect(driver.persistedMutations).toBe(2);
  expect(driver.commits).toBe(1);
  expect(client.auditTrace).toHaveLength(2);
  expect(client.auditTrace.map(event =>
    (event.mutationGovernance as any).approvalStatus)).toEqual(['approved', 'approved']);
  expect((client.auditTrace[0].mutationGovernance as any).executionId)
    .toBe((client.auditTrace[1].mutationGovernance as any).executionId);
});

test('customer denial happens before SQL and incomplete reviewed graphs roll back', async () => {
  const deniedDriver = new RecordingDriver();
  const denied = new Client(deniedDriver).setUserContext(approvedContext(
    new TestPolicy(identity, () => ({
      verdict: 'deny', code: 'ORDER_DENIED', message: 'orders are disabled',
    })),
  ));

  await expect(denied.executeGraphSave(async () => {
    const mutation = { entity: 'Order', action: 'Create', payload: { name: 'D' }, comment: 'deny' };
    denied.preflightMutation(mutation);
    await denied.executeMutation(mutation);
  })).rejects.toThrow(/ORDER_DENIED/);
  expect(deniedDriver.providerMutations).toBe(0);
  expect(deniedDriver.persistedMutations).toBe(0);
  expect(deniedDriver.rollbacks).toBe(1);

  const incompleteDriver = new RecordingDriver();
  const incomplete = new Client(incompleteDriver).setUserContext(approvedContext(
    new TestPolicy(identity, () => ({ verdict: 'allow' })),
  ));
  const first = { entity: 'Order', action: 'Create', payload: { name: 'A' }, comment: 'first' };
  const second = { entity: 'OrderLine', action: 'Create', payload: { name: 'B' }, comment: 'second' };
  await expect(incomplete.executeGraphSave(async () => {
    incomplete.preflightMutation(first);
    incomplete.preflightMutation(second);
    await incomplete.executeMutation(first);
  })).rejects.toThrow(/were not executed/);
  expect(incompleteDriver.providerMutations).toBe(1);
  expect(incompleteDriver.persistedMutations).toBe(0);
  expect(incompleteDriver.commits).toBe(0);
  expect(incompleteDriver.rollbacks).toBe(1);
});

test('missing policy and approval warnings are stable, deduplicated, and fail open', () => {
  const warnings: MutationGovernanceWarning[] = [];
  const context = new UserContext().withMutationGovernanceSink(
    new DelegatingMutationGovernanceSink((_context, warning) => {
      warnings.push(warning);
      if (warnings.length === 1) throw new Error('warning sink unavailable');
    }),
  );
  const plan: MutationPlan = {
    executionId: 'warning-1', requestKey: 'Order.saveGraph', rootEntityType: 'Order',
    operations: [{ kind: 'update', entity: 'Order', entityId: '1',
      originalVersion: 1, changedValues: { name: 'updated' } }],
  };
  const generated = context.reviewMutationPlan(plan);
  context.reviewMutationPlan({ ...plan, executionId: 'warning-2' });
  expect(generated.warningCodes).toEqual([MISSING_MUTATION_POLICY]);
  expect(warnings.map(warning => warning.firstOccurrence)).toEqual([true, false]);

  const customerWarnings: MutationGovernanceWarning[] = [];
  const customer = new UserContext()
    .withMutationPolicyRegistry(new DelegatingMutationPolicyRegistry(() =>
      new TestPolicy(identity, () => ({ verdict: 'allow' }))))
    .withMutationGovernanceSink(new DelegatingMutationGovernanceSink(
      (_context, warning) => customerWarnings.push(warning),
    ));
  const unapproved = customer.reviewMutationPlan(plan);
  expect(unapproved.warningCodes).toEqual([MISSING_MUTATION_POLICY_APPROVAL]);
  expect(unapproved.approvalStatus).toBe('missing');

  customer.withMutationPolicyApprovalProvider(new DelegatingMutationPolicyApprovalProvider(
    () => ({
      policy: { ...identity, fingerprint: 'sha256:different' },
      approvedBy: 'security-owner',
      approvedAt: new Date(),
    }),
  ));
  expect(customer.reviewMutationPlan({ ...plan, executionId: 'mismatch' }).approvalStatus)
    .toBe('missing');
});

test('warning sink failure does not change generated-default persistence', async () => {
  const driver = new RecordingDriver();
  const context = new UserContext().withMutationGovernanceSink(
    new DelegatingMutationGovernanceSink(() => { throw new Error('sink unavailable'); }),
  );
  const client = new Client(driver).setUserContext(context);

  await expect(client.executeMutation({
    entity: 'Order', action: 'Create', payload: { name: 'allowed' }, comment: 'default',
  })).resolves.toBeDefined();
  expect(driver.persistedMutations).toBe(1);
  expect((client.auditTrace[0].mutationGovernance as any).warningCodes)
    .toEqual([MISSING_MUTATION_POLICY]);
});

test('customer policy requires complete generated preflight for graph saves', async () => {
  const driver = new RecordingDriver();
  const client = new Client(driver).setUserContext(approvedContext(
    new TestPolicy(identity, () => ({ verdict: 'allow' })),
  ));
  await expect(client.executeGraphSave(() => client.executeMutation({
    entity: 'Order', action: 'Create', payload: { name: 'unplanned' }, comment: 'unplanned',
  }))).rejects.toThrow(MutationPolicyError);
  expect(driver.providerMutations).toBe(0);
});

test('cyclic policy values fail explicitly instead of overflowing the stack', () => {
  const payload: Record<string, unknown> = { name: 'cycle' };
  payload.self = payload;
  const context = new UserContext();
  expect(() => context.reviewMutationPlan({
    executionId: 'cyclic-plan', requestKey: 'Order.saveGraph', rootEntityType: 'Order',
    operations: [{ kind: 'update', entity: 'Order', entityId: '1',
      originalVersion: 1, changedValues: payload }],
  })).toThrow(/must not contain cycles/);
});

test('failed graph lifecycle initialization releases the save queue', async () => {
  const context = new UserContext();
  const driver = new RecordingDriver();
  const client = new Client(driver).setUserContext(context);
  context.beginMutationPolicyGraph();

  await expect(client.executeGraphSave(async () => undefined))
    .rejects.toThrow(/already active/);
  context.endMutationPolicyGraph();

  await expect(client.executeGraphSave(async () => undefined)).resolves.toBeUndefined();
  expect(driver.transactions).toBe(1);
  expect(driver.commits).toBe(1);
});

test('stable ledger identity tolerates parent ids assigned during graph execution', async () => {
  const driver = new RecordingDriver();
  const client = new Client(driver).setUserContext(approvedContext(
    new TestPolicy(identity, plan => {
      expect(plan.operations[1].changedValues.name).toBeUndefined();
      return { verdict: 'allow' };
    }),
  ));
  const parent = { entity: 'Order', action: 'Create', payload: { name: 'parent' },
    comment: 'create graph', ledgerKey: { entity: 'Order', id: -1 } };
  const childBefore = { entity: 'OrderLine', action: 'Create',
    payload: { name: { id: undefined, label: 'parent' } }, comment: 'create graph',
    ledgerKey: { entity: 'OrderLine', id: -2 } };
  const childAfter = { ...childBefore, payload: { name: { id: '1', label: 'parent' } } };

  await client.executeGraphSave(async () => {
    client.preflightMutation(parent);
    client.preflightMutation(childBefore);
    await client.executeMutation(parent);
    await client.executeMutation(childAfter);
  });

  expect(driver.persistedMutations).toBe(2);
  expect(driver.commits).toBe(1);
});
