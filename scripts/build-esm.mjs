import {rm, writeFile} from 'node:fs/promises';
import {build} from 'esbuild';

const output = new URL('../dist/esm/', import.meta.url);
await rm(output, {recursive: true, force: true});
await build({
  entryPoints: {
    index: 'src/index.ts',
    'sql/core': 'src/sql/core.ts',
    'sql/postgres': 'src/sql/postgres.ts',
    'sql/mysql': 'src/sql/mysql.ts',
    'sql/sqlite': 'src/sql/sqlite.ts',
    'sql/expo-sqlite': 'src/sql/expo-sqlite.ts',
    'sql/browser-sqlite': 'src/sql/browser-sqlite.ts',
    'sql/browser-sqlite-worker': 'src/sql/browser-sqlite-worker.ts',
    'telemetry/opentelemetry': 'src/telemetry/opentelemetry.ts',
  },
  outdir: 'dist/esm',
  bundle: true,
  splitting: true,
  chunkNames: 'chunks/[name]-[hash]',
  packages: 'external',
  platform: 'neutral',
  format: 'esm',
  target: 'es2020',
  sourcemap: true,
});
await writeFile(new URL('package.json', output), '{"type":"module"}\n');
