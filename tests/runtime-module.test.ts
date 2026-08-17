import { RuntimeModule } from '../src/core/runtime-module';

describe('RuntimeModule', () => {
  test('is a passive composable metadata manifest', () => {
    const first = new RuntimeModule({ A: { table: 'a', columns: {} } });
    const second = new RuntimeModule({ B: { table: 'b', columns: {} } });
    const combined = first.and(second);
    expect(Object.keys(combined.schemas)).toEqual(['A', 'B']);
    expect(Object.isFrozen(combined.schemas)).toBe(true);
  });
});
