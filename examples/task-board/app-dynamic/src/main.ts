import fetch from 'node-fetch';
import { TeaQLClient, QueryParser } from '../../../../src';
import { Q } from '../../ts-lib-core/src/generated/Q';

// 1. Initialize TFP Client, pointing to the Rust backend
const client = new TeaQLClient({
  baseUrl: 'http://127.0.0.1:3001',
  fetch: fetch as any
});

// 2. Prepare request context
const ctx = { client };

async function runDynamicExamples() {
  try {
    console.log("=== Dynamic String Query Examples ===");

    // Example A: Dynamic filtering query
    const filterQuery = 'Q.tasks().withNameContaining("bug")';
    console.log(`[Execution]: ${filterQuery}`);
    
    // Parse the string DSL into AST and execute (pass entry object Q)
    const filterRequest = QueryParser.parse(filterQuery, Q);
    const filterResult = await filterRequest.executeForList(ctx);
    console.log("Result:", filterResult);

    // Example B: Dynamic aggregation and grouping
    const userQueryStr = 'Q.tasks().withNameContaining("bug").facetByStatusAs("statusFacet", Q.taskStatuses().count())';
    console.log(`\n[Execution]: ${userQueryStr}`);
    
    const aggRequest = QueryParser.parse(userQueryStr, Q);
    const aggResult = await aggRequest.executeForList(ctx);
    console.log("Result:", aggResult);

  } catch (err) {
    console.error("Query execution failed:", err);
  }
}

runDynamicExamples();
