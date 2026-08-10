"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Values = void 0;
exports.Values = {
    Null: () => ({ type: 'Null' }),
    Bool: (value) => ({ type: 'Bool', value }),
    I64: (value) => ({ type: 'I64', value }),
    U64: (value) => ({ type: 'U64', value }),
    F64: (value) => ({ type: 'F64', value }),
    Decimal: (value) => ({ type: 'Decimal', value }),
    Text: (value) => ({ type: 'Text', value }),
    Json: (value) => ({ type: 'Json', value }),
    Date: (value) => ({ type: 'Date', value }),
    Timestamp: (value) => ({ type: 'Timestamp', value }),
    Object: (value) => ({ type: 'Object', value }),
    List: (value) => ({ type: 'List', value }),
    TypedNull: (dataType) => ({ type: 'TypedNull', dataType }),
    isEmpty(v) {
        switch (v.type) {
            case 'Null':
            case 'TypedNull': return true;
            case 'Text': return v.value === '';
            case 'Object': return Object.keys(v.value).length === 0;
            case 'List': return v.value.length === 0;
            default: return false;
        }
    },
    tryI64(v) {
        if (v.type === 'I64' || v.type === 'U64')
            return Number(v.value);
        if (v.type === 'Decimal')
            return parseInt(v.value.toString(), 10);
        return null;
    }
};
//# sourceMappingURL=value.js.map