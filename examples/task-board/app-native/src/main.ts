import fetch from 'node-fetch';
import { TeaQLClient } from '../../../../src';
import { Q } from '../../ts-lib-core/src/generated/Q';
import { Task } from '../../ts-lib-core/src/generated/models/Task';

// 1. Initialize TFP Client, pointing to the Rust backend
const client = new TeaQLClient({
  baseUrl: 'http://127.0.0.1:3001',
  fetch: fetch as any
});

// 2. Prepare request context
const ctx = { client };

async function runNativeExamples() {
  try {
    console.log("=== Native TypeScript Query Examples ===");

    // Example A: Strongly-typed chained calls (Conditional filtering)
    console.log("[Execution]: Q.tasks().withNameContaining('bug').purpose('find bugs')");
    const filterResult = await Q.tasks()
      .withNameContaining("bug")
      .purpose("find bugs")
      .executeForList(ctx);
      
    console.log("Result:", filterResult);

    // Example B: Strongly-typed chained calls (Aggregation and Grouping)
    console.log("\n[Execution]: Q.taskStatuses().groupByDisplayOrder().avgProgress().purpose('calc average')");
    const aggResult = await Q.taskStatuses()
      .groupByDisplayOrder()
      .avgProgress()
      .purpose("calc average")
      .executeForList(ctx);
      
    console.log("Result:", aggResult);

    // Example C: Strongly-typed chained calls (Nested Facet panel aggregation)
    console.log("\n[Execution]: Q.tasks().facetByStatusAs('statusFacet', Q.taskStatuses().count()).purpose('dashboard render')");
    const facetResult = await Q.tasks()
      .facetByStatusAs("statusFacet", Q.taskStatuses().count())
      .purpose("dashboard render")
      .executeForList(ctx);
      
    console.log("Main data (Tasks):", facetResult.data);
    console.log("Statistics panel (Facets):", facetResult.facets);

    // Example D: Data Mutations
    console.log("\n[Execution]: Create Task");
    const task = new Task({ name: 'New Bug Task', status: 1001 });
    const saveResult = await task.auditAs("Create a new bug").execute(ctx);
    console.log("Create Result:", JSON.stringify(saveResult, null, 2));

    const newId = saveResult.data[0].saved_data.id;
    console.log(`Retrieved newly created Task ID: ${newId}`);

    console.log(`\n[Execution]: Update Task (ID: ${newId})`);
    const updateTask = new Task({ id: newId, name: 'New Bug Task (Fixed)', status: 1004 });
    const updateResult = await updateTask.auditAs("Fix the bug").execute(ctx);
    console.log("Update Result:", JSON.stringify(updateResult, null, 2));

    console.log(`\n[Execution]: Delete Task (ID: ${newId})`);
    const deleteResult = await Task.delete(newId).auditAs("Clean up the bug").execute(ctx);
    console.log("Delete Result:", JSON.stringify(deleteResult, null, 2));

  } catch (err) {
    console.error("Query execution failed:", err);
  }
}

runNativeExamples();
