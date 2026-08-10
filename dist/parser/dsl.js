"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueryParser = void 0;
class QueryParser {
    static parse(queryStr, entryPoint) {
        // Expected format: Q.tasks().withNameContaining("bug").withVersionIs(2)
        const entityMatch = queryStr.match(/^[a-zA-Z0-9_]+\.([a-zA-Z0-9_]+)\(\)/);
        if (!entityMatch) {
            throw new Error("Invalid query format. Must start with EntryPoint.entityName()");
        }
        const entityMethod = entityMatch[1];
        if (typeof entryPoint[entityMethod] !== 'function') {
            throw new Error(`Entity method ${entityMethod} not found on entry point`);
        }
        // Instantiate the request builder (e.g., TaskRequest)
        const requestObj = entryPoint[entityMethod]();
        // Extract all chained method calls
        const remainingStr = queryStr.substring(entityMatch[0].length);
        const methodRegex = /\.([a-zA-Z0-9_]+)\(((?:[^)(]+|\([^)(]*\))*)\)/g;
        let match;
        while ((match = methodRegex.exec(remainingStr)) !== null) {
            const methodName = match[1];
            const argStr = match[2].trim();
            if (typeof requestObj[methodName] !== 'function') {
                throw new Error(`Method ${methodName} not found on request object`);
            }
            if (argStr === '') {
                requestObj[methodName]();
                continue;
            }
            // Split arguments by comma, being careful not to split inside nested parentheses
            // A simple split won't work perfectly, but for Q.x().y() we can just split by ,
            const args = argStr.split(/,(?![^(]*\))/).map(s => s.trim());
            const parsedArgs = args.map(arg => {
                if (arg.startsWith("Q.")) {
                    return QueryParser.parse(arg, entryPoint);
                }
                else if (arg === 'true') {
                    return true;
                }
                else if (arg === 'false') {
                    return false;
                }
                else if (!isNaN(Number(arg))) {
                    return Number(arg);
                }
                else if ((arg.startsWith('"') && arg.endsWith('"')) || (arg.startsWith("'") && arg.endsWith("'"))) {
                    return arg.substring(1, arg.length - 1);
                }
                return arg;
            });
            // Invoke the builder method
            requestObj[methodName](...parsedArgs);
        }
        return requestObj;
    }
}
exports.QueryParser = QueryParser;
//# sourceMappingURL=dsl.js.map