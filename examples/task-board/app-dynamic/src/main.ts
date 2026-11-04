import { QueryParser, TeaQLClient, UserContext } from 'teaql-ts';
import { Q } from '../../ts-lib-core/src/generated/Q';

export const taskQuery = 'Q.tasksWithMinimalFields().selectName().withNameContaining("bug-")'
  + '.orderByIdAscending().limit(20).comment("load dynamic bug task list").purpose("render the task board")';

/** The controlled parser builds a request; it never evaluates JavaScript. */
export async function runDynamicExamples(context: UserContext) {
  return QueryParser.parse(taskQuery, Q).executeForList(context);
}

if (require.main === module) {
  const baseUrl = process.env.TEAQL_TASK_BOARD_BACKEND;
  if (!baseUrl) throw new Error('Set TEAQL_TASK_BOARD_BACKEND for the optional HTTP demo; npm run verify uses local SQLite.');
  const client = new TeaQLClient({baseUrl});
  const context = new UserContext().insertResource('dataService', client);
  runDynamicExamples(context).then(result => console.log(result)).catch(error => {
    console.error(error); process.exitCode = 1;
  });
}
