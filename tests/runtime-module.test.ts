import { RuntimeModule } from '../src/core/runtime-module';

describe('RuntimeModule', () => {
  test('is a passive composable metadata manifest', () => {
    const first = new RuntimeModule({ A: { table: 'a', columns: {} } }, {}, {
      defaultDomainRoot: { entity: 'A', id: '1' },
      constants: [{ entity: 'AState', id: '1001', values: { name: 'First' } }],
    });
    const second = new RuntimeModule({ B: { table: 'b', columns: {} } }, {}, {
      constants: [
        { entity: 'AState', id: '1001', values: { name: 'Reconciled' } },
        { entity: 'BState', id: '2001' },
      ],
    });
    const combined = first.and(second);
    expect(Object.keys(combined.schemas)).toEqual(['A', 'B']);
    expect(Object.isFrozen(combined.schemas)).toBe(true);
    expect(combined.bootstrap.defaultDomainRoot).toEqual({ entity: 'A', id: '1' });
    expect(combined.bootstrap.constants).toEqual([
      { entity: 'AState', id: '1001', values: { name: 'Reconciled' } },
      { entity: 'BState', id: '2001' },
    ]);
  });

  test('rejects composition with different Default Domain Roots', () => {
    const first = new RuntimeModule({}, {}, {
      defaultDomainRoot: { entity: 'Platform', id: '1' },
    });
    const second = new RuntimeModule({}, {}, {
      defaultDomainRoot: { entity: 'Organization', id: '1' },
    });
    expect(() => first.and(second)).toThrow('different Default Domain Roots');
  });
});
