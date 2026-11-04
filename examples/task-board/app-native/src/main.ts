import { TeaQLClient, UserContext } from 'teaql-ts';
import { Q } from '../../ts-lib-core/src/generated/Q';

/** The same query can run on local SQLite or an explicitly configured HTTP client. */
export async function runNativeExamples(context: UserContext) {
  const tasks = await Q.tasks().withNameContaining('bug-')
    .selectStatusWith(Q.taskStatuses().comment('load task status'))
    .selectTaskExecutionLogListWith(Q.taskExecutionLogs().orderByIdAscending().limit(10)
      .comment('load bounded execution history'))
    .orderByIdAscending().limit(20)
    .comment('load bug tasks with status and history')
    .purpose('render the task board').executeForList(context);
  const facets = await Q.tasksWithMinimalFields().selectName().withNameContaining('bug-')
    .facetByStatusAs('statusFacet', Q.taskStatuses().countAs('taskCount').orderByIdAscending().limit(10)
      .comment('count tasks by status'), true)
    .orderByIdAscending().limit(20)
    .comment('load task status facets').purpose('render task board counters').executeForList(context);
  return {tasks, facets};
}

if (require.main === module) {
  const baseUrl = process.env.TEAQL_TASK_BOARD_BACKEND;
  if (!baseUrl) throw new Error('Set TEAQL_TASK_BOARD_BACKEND for the optional HTTP demo; npm run verify uses local SQLite.');
  const client = new TeaQLClient({baseUrl});
  const context = new UserContext().insertResource('dataService', client);
  runNativeExamples(context).then(result => console.log(result)).catch(error => {
    console.error(error); process.exitCode = 1;
  });
}
