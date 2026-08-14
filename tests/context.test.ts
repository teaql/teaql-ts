import { UserContext } from '../src/core/context';
import { SelectQuery } from '../src/core/ast';

describe('UserContext', () => {
  it('stores runtime dependencies during context initialization', () => {
    const service = { name: 'data-service' };
    const context = new UserContext().insertResource('dataService', service);

    expect(context.requireResource('dataService')).toBe(service);
  });

  it('prepares a query without serializing trusted runtime resources', () => {
    const query = new SelectQuery('Order');
    const context = new UserContext().insertResource('tenant', 'trusted-tenant');
    expect(context.prepareQuery(query)).toBe(query);
    expect(JSON.stringify(query)).not.toContain('trusted-tenant');
  });

  it('fails closed when a required runtime dependency is absent', () => {
    const context = new UserContext();

    expect(() => context.requireResource('dataService')).toThrow(
      'Required UserContext resource is missing: dataService',
    );
  });
});
