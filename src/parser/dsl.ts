export class QueryParser {
    static parse(queryStr: string, entryPoint: any): any {
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
        const methodRegex = /\.([a-zA-Z0-9_]+)\(([^)]*)\)/g;
        
        let match;
        while ((match = methodRegex.exec(remainingStr)) !== null) {
            const methodName = match[1];
            const argStr = match[2].trim();
            
            if (typeof requestObj[methodName] !== 'function') {
                throw new Error(`Method ${methodName} not found on request object`);
            }
            
            // Basic argument parser
            let parsedArg;
            if (argStr === '') {
                // No arguments
                requestObj[methodName]();
                continue;
            } else if (argStr === 'true') {
                parsedArg = true;
            } else if (argStr === 'false') {
                parsedArg = false;
            } else if (!isNaN(Number(argStr))) {
                parsedArg = Number(argStr);
            } else if ((argStr.startsWith('"') && argStr.endsWith('"')) || (argStr.startsWith("'") && argStr.endsWith("'"))) {
                // Strip quotes
                parsedArg = argStr.substring(1, argStr.length - 1);
            } else {
                // Fallback
                parsedArg = argStr;
            }
            
            // Invoke the builder method
            requestObj[methodName](parsedArg);
        }
        
        return requestObj;
    }
}
