import {
  BrowserSQLiteStorage,
  BrowserSQLiteTeaQLClient,
} from 'teaql-ts/sql/browser-sqlite';
import { UserContext } from 'teaql-ts';
import { Q } from '../../conformance/src/generated/Q';
import { WorkItem } from '../../conformance/src/generated/models/WorkItem';
import { GENERATED_RUNTIME_MODULE } from '../../conformance/src/runtime-module';
import { ENTITY_SCHEMAS } from '../../conformance/src/teaql-node-sql';
import './style.css';

const status = document.querySelector<HTMLParagraphElement>('#status')!;
const result = document.querySelector<HTMLPreElement>('#result')!;
const persist = document.querySelector<HTMLInputElement>('#persist')!;
const reset = document.querySelector<HTMLButtonElement>('#reset')!;

type Runtime = { client: BrowserSQLiteTeaQLClient; context: UserContext };
let runtime: Runtime | undefined;
const storagePreference = localStorage.getItem('teaql-browser-storage') === 'opfs' ? 'opfs' : 'memory';
persist.checked = storagePreference === 'opfs';

async function openRuntime(storage: BrowserSQLiteStorage): Promise<Runtime> {
  const worker = new Worker(new URL('./sqlite.worker.ts', import.meta.url), { type: 'module' });
  const client = await BrowserSQLiteTeaQLClient.open(worker, { ...ENTITY_SCHEMAS }, {
    storage,
    databaseName: 'teaql-browser-example.sqlite3',
  });
  client.install(GENERATED_RUNTIME_MODULE);
  const context = new UserContext().insertResource('dataService', client);
  client.setUserContext(context);
  await context.ensureSchema();
  return { client, context };
}

async function seedDemoData({ context }: Runtime): Promise<void> {
  const existing = await Q.workItemsWithMinimalFields()
    .comment('what: detect existing browser demo records')
    .purpose('why: keep generated mutation bootstrap idempotent')
    .executeForList(context);
  if (existing.length) return;
  for (const title of ['Evaluate semantic model', 'Generate typed library', 'Verify browser runtime']) {
    await new WorkItem()
      .updateTitle(title)
      .updatePlatform('1')
      .auditAs('seed deterministic browser demo data')
      .save(context);
  }
}

async function showData(active: Runtime): Promise<void> {
  const rows = await Q.workItems()
    .selectTitle()
    .orderByIdAscending()
    .limit(20)
    .comment('what: load browser-local work items')
    .purpose('why: prove the generated Q API runs without a backend')
    .executeForList(active.context);
  result.textContent = JSON.stringify(rows, null, 2);
  status.textContent = `${active.client.storage!.toUpperCase()} · ${rows.length} rows · ready`;
}

async function replaceRuntime(storage: BrowserSQLiteStorage): Promise<void> {
  status.textContent = `Opening ${storage.toUpperCase()} SQLite/WASM…`;
  const previous = runtime;
  runtime = undefined;
  await previous?.client.close();
  const next = await openRuntime(storage);
  runtime = next;
  await seedDemoData(next);
  await showData(next);
}

persist.addEventListener('change', () => {
  const storage = persist.checked ? 'opfs' : 'memory';
  localStorage.setItem('teaql-browser-storage', storage);
  replaceRuntime(storage).catch(showError);
});

reset.addEventListener('click', async () => {
  if (!runtime) return;
  reset.disabled = true;
  try {
    await runtime.client.reset(runtime.context);
    await seedDemoData(runtime);
    await showData(runtime);
  } catch (error) { showError(error); }
  finally { reset.disabled = false; }
});

function showError(value: unknown): void {
  const error = value instanceof Error ? value : new Error(String(value));
  status.textContent = `${error.name}: ${error.message}`;
}

replaceRuntime(storagePreference).catch(showError);
