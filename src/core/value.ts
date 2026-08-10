export type Value = 
  | { type: 'Null' }
  | { type: 'Bool', value: boolean }
  | { type: 'I64', value: number }
  | { type: 'U64', value: number }
  | { type: 'F64', value: number }
  | { type: 'Decimal', value: number | string }
  | { type: 'Text', value: string }
  | { type: 'Json', value: any }
  | { type: 'Date', value: string | Date }
  | { type: 'Timestamp', value: number }
  | { type: 'Object', value: Record<string, Value> }
  | { type: 'List', value: Value[] }
  | { type: 'TypedNull', dataType: string };

export const Values = {
  Null: (): Value => ({ type: 'Null' }),
  Bool: (value: boolean): Value => ({ type: 'Bool', value }),
  I64: (value: number): Value => ({ type: 'I64', value }),
  U64: (value: number): Value => ({ type: 'U64', value }),
  F64: (value: number): Value => ({ type: 'F64', value }),
  Decimal: (value: number | string): Value => ({ type: 'Decimal', value }),
  Text: (value: string): Value => ({ type: 'Text', value }),
  Json: (value: any): Value => ({ type: 'Json', value }),
  Date: (value: string | Date): Value => ({ type: 'Date', value }),
  Timestamp: (value: number): Value => ({ type: 'Timestamp', value }),
  Object: (value: Record<string, Value>): Value => ({ type: 'Object', value }),
  List: (value: Value[]): Value => ({ type: 'List', value }),
  TypedNull: (dataType: string): Value => ({ type: 'TypedNull', dataType }),

  isEmpty(v: Value): boolean {
    switch (v.type) {
      case 'Null':
      case 'TypedNull': return true;
      case 'Text': return v.value === '';
      case 'Object': return Object.keys(v.value).length === 0;
      case 'List': return v.value.length === 0;
      default: return false;
    }
  },

  tryI64(v: Value): number | null {
    if (v.type === 'I64' || v.type === 'U64') return Number(v.value);
    if (v.type === 'Decimal') return parseInt(v.value.toString(), 10);
    return null;
  }
};
