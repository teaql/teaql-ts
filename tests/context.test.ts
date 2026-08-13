import { UserContext } from '../src/core/context';

describe('UserContext', () => {
  it('stores runtime dependencies during context initialization', () => {
    const service = { name: 'data-service' };
    const context = new UserContext().insertResource('dataService', service);

    expect(context.requireResource('dataService')).toBe(service);
  });

  it('fails closed when a required runtime dependency is absent', () => {
    const context = new UserContext();

    expect(() => context.requireResource('dataService')).toThrow(
      'Required UserContext resource is missing: dataService',
    );
  });
});
