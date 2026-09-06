import * as parser from './query-parser.generated';

type CallNode = {
  type: 'Call';
  method: string;
  arguments: ValueNode[];
};

type CallChainNode = {
  type: 'CallChain';
  target: string;
  calls: CallNode[];
};

type ValueNode = CallChainNode | string | number | boolean | null | ValueNode[];

const FORBIDDEN_PROPERTY_NAMES = new Set(['__proto__', 'prototype', 'constructor']);

function executeCallChain(node: CallChainNode, entryPoint: object): unknown {
  if (node.target !== 'Q') {
    throw new Error(`Unsupported query entry point ${node.target}; expected Q`);
  }
  let receiver: unknown = entryPoint;
  for (const call of node.calls) {
    if (FORBIDDEN_PROPERTY_NAMES.has(call.method)) {
      throw new Error(`Method ${call.method} is not allowed in a query expression`);
    }
    if ((typeof receiver !== 'object' && typeof receiver !== 'function') || receiver === null) {
      throw new Error(`Cannot call ${call.method} on a non-query value`);
    }
    const method = (receiver as Record<string, unknown>)[call.method];
    if (typeof method !== 'function') {
      throw new Error(`Method ${call.method} is not available on the generated query API`);
    }
    const args = call.arguments.map(argument =>
      typeof argument === 'object' && argument !== null && !Array.isArray(argument)
        ? executeCallChain(argument as CallChainNode, entryPoint)
        : argument,
    );
    receiver = method.apply(receiver, args);
  }
  return receiver;
}

export class QueryParser {
  // The concrete return type is supplied by the generated entry point at runtime.
  // Keep `any` for source compatibility with existing generated Q facades.
  static parse(querySource: string, entryPoint: object): any {
    const ast = parser.parse(querySource, undefined) as CallChainNode;
    return executeCallChain(ast, entryPoint);
  }
}
