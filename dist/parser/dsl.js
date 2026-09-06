"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueryParser = void 0;
const parser = __importStar(require("./query-parser.generated"));
const FORBIDDEN_PROPERTY_NAMES = new Set(['__proto__', 'prototype', 'constructor']);
function executeCallChain(node, entryPoint) {
    if (node.target !== 'Q') {
        throw new Error(`Unsupported query entry point ${node.target}; expected Q`);
    }
    let receiver = entryPoint;
    for (const call of node.calls) {
        if (FORBIDDEN_PROPERTY_NAMES.has(call.method)) {
            throw new Error(`Method ${call.method} is not allowed in a query expression`);
        }
        if ((typeof receiver !== 'object' && typeof receiver !== 'function') || receiver === null) {
            throw new Error(`Cannot call ${call.method} on a non-query value`);
        }
        const method = receiver[call.method];
        if (typeof method !== 'function') {
            throw new Error(`Method ${call.method} is not available on the generated query API`);
        }
        const args = call.arguments.map(argument => typeof argument === 'object' && argument !== null && !Array.isArray(argument)
            ? executeCallChain(argument, entryPoint)
            : argument);
        receiver = method.apply(receiver, args);
    }
    return receiver;
}
class QueryParser {
    // The concrete return type is supplied by the generated entry point at runtime.
    // Keep `any` for source compatibility with existing generated Q facades.
    static parse(querySource, entryPoint) {
        const ast = parser.parse(querySource, undefined);
        return executeCallChain(ast, entryPoint);
    }
}
exports.QueryParser = QueryParser;
//# sourceMappingURL=dsl.js.map