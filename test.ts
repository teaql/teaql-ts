import fetch from 'node-fetch';
import { TeaQLClient } from './src/tfp/client';
import { Q } from './src/generated/Q';
import { QueryParser } from './src/parser/dsl';

const client = new TeaQLClient({
  baseUrl: 'http://127.0.0.1:3001',
  fetch: fetch as any
});

const ctx = { client };

async function runTest() {
  try {
    console.log("Testing QueryParser (Filter)...");
    const queryStr1 = 'Q.tasks().withNameContaining("bug")';
    console.log("Parsing:", queryStr1);
    const parsedRequest1 = QueryParser.parse(queryStr1);
    const parsedTasks1 = await parsedRequest1.executeForList(ctx);
    console.log("Parsed Tasks result:", parsedTasks1);

    console.log("\nTesting QueryParser (Aggregation + GroupBy)...");
    const queryStr2 = 'Q.taskStatuses().groupByDisplayOrder().sumProgress()';
    console.log("Parsing:", queryStr2);
    const parsedRequest2 = QueryParser.parse(queryStr2);
    const parsedTasks2 = await parsedRequest2.executeForList(ctx);
    console.log("Parsed Aggregation result:", parsedTasks2);

  } catch (err) {
    console.error(err);
  }
}

runTest();
