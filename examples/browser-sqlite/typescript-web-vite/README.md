# TeaQL Browser SQLite workspace

Generate `typescript-lib-core` and `typescript-web-vite` from the same SQLite
model, then extract the scopes as sibling directories. Run `npm install` and
`npm run dev` from `typescript-web-vite`. The starter page initializes the
generated schema through the browser runtime. Add the application's Q/E
queries and trusted Context configuration in `src/main.ts`.

The database runs in a dedicated Web Worker and uses memory by default. Set
`storage: 'opfs'` and a simple `databaseName` in the application's call to
`openBrowserDatabase` when persistent storage is needed. Deployments serving
the built files need the cross-origin isolation headers shown in
`vite.config.ts` to enable OPFS.
