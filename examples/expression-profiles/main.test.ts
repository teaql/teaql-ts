import { Q } from 'scalar-lib/generated/Q';
import { E } from 'scalar-lib/generated/E';
import { SQLiteTeaQLClient } from 'scalar-lib/teaql-node-sqlite';
import { TeaQLNotLoadedError, UserContext } from 'teaql-ts';
import { expect, jest, test } from '@jest/globals';

test('generated E uses the selected model profile without an application override', async () => {
  const profile = process.env.TEAQL_EXPRESSION_PROFILE as 'camelCase' | 'snake_case' | 'PascalCase';
  const pointer = { camelCase: '/scalarTypeProbeList', snake_case: '/scalar_type_probe_list', PascalCase: '/ScalarTypeProbeList' }[profile];
  const suffix = { camelCase: '/0/requiredString', snake_case: '/0/required_string', PascalCase: '/0/RequiredString' }[profile];
  expect(pointer).toBeDefined();
  const client = new SQLiteTeaQLClient(process.env.TEAQL_EXPRESSION_DB!);
  const context = new UserContext().insertResource('dataService', client);
  const query = jest.spyOn((client as any).driver, 'query');
  const transaction = jest.spyOn((client as any).driver, 'transaction');
  try {
    await context.ensureSchema();
    query.mockClear(); transaction.mockClear();
    const row = await Q.typePlatforms().withIdIs('1').limit(1)
      .comment('Load the root without its reverse list')
      .purpose('Verify generated E diagnostics under the modeled JSON profile').executeForOne(context);
    expect(row).toBeDefined();
    expect(String(E.typePlatform(row!).id().eval())).toBe('1');
    const name = E.typePlatform(row!).name().eval();
    const calibrated = { query: query.mock.calls.length, transaction: transaction.mock.calls.length, audit: client.auditTrace.length };
    expect(calibrated.query).toBeGreaterThan(0);
    let diagnostic: { wire: ReturnType<TeaQLNotLoadedError['toWire']>; human: string } | undefined;
    try { E.typePlatform(row!).scalarTypeProbeList().first().requiredString().eval(); }
    catch (error) {
      if (!(error instanceof TeaQLNotLoadedError)) throw error;
      diagnostic = { wire: error.toWire(), human: error.message };
    }
    expect(diagnostic).toBeDefined();
    const { wire, human } = diagnostic!;
    const location = [{ kind: 'property', name: 'scalar_type_probe_list' }];
    expect(wire.code).toBe('NOT_LOADED');
    expect(wire.location).toEqual(location);
    expect(wire.suggestedFix).toEqual({ action: 'preload', location });
    expect(wire.attemptedLocation).toEqual([...location, { kind: 'index', index: 0 }, { kind: 'property', name: 'required_string' }]);
    expect(wire.instancePath).toBe(pointer); expect(wire.attemptedInstancePath).toBe(pointer! + suffix);
    expect(wire.breakPoint).toBe('scalar_type_probe_list'); expect(wire.breakPointIndex).toBe(0);
    expect(wire.originalExpression).toBe('E.typePlatform(<root>).scalarTypeProbeList().first().requiredString().eval()');
    expect(wire.expressionWithBrokenPoint).toBe('E.typePlatform(<root>).scalarTypeProbeList()<broken>.first().requiredString().eval()');
    expect(human.startsWith('TeaQLNotLoadedError:')).toBe(true);
    expect(human).toContain('expression=' + wire.expressionWithBrokenPoint);
    expect(human).not.toContain('"instancePath"');
    expect({ query: query.mock.calls.length, transaction: transaction.mock.calls.length, audit: client.auditTrace.length }).toEqual(calibrated);
    expect(E.typePlatform(row!).name().eval()).toBe(name);
    process.stdout.write('GENERATED_E_MODEL_PROFILE=' + JSON.stringify({
      language: 'typescript', profile, round: Number(process.env.TEAQL_EXPRESSION_ROUND), passed: true,
      wire, human, providerEntries: 0, queryCalibration: calibrated.query, selectedNameUnchanged: true,
      runtimeOrigin: require.resolve('teaql-ts'),
    }) + '\n');
  } finally { await client.close(); }
});
