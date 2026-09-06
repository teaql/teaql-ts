declare class peg$SyntaxError extends SyntaxError {
    constructor(message: any, expected: any, found: any, location: any);
    format(sources: any): string;
    static buildMessage(expected: any, found: any): string;
}
declare function peg$parse(input: any, options: any): any;
declare const peg$allowedStartRules: string[];
export { peg$allowedStartRules as StartRules, peg$SyntaxError as SyntaxError, peg$parse as parse };
//# sourceMappingURL=query-parser.generated.d.ts.map