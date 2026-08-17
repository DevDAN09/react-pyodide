# Local Python Runner

This Vite app runs Python locally in a Pyodide Web Worker. The UI displays the
latest standard output, standard error, return value, or Python exception.

## Prerequisites

- Node.js 20 or later
- npm
- Chromium for browser smoke tests (`npx playwright install chromium`)

No Python installation, Supabase project, environment variables, or credentials
are required to run the app.

## Commands

```bash
npm install
npm run dev
npm run test:run
npm run typecheck
npm run build
npm run test:e2e
```

The browser tests start Vite automatically at `127.0.0.1:4173`.

## Example

Enter this code in the editor:

```python
print("hello")
1 + 2
```

The result appears in separate output sections: `hello` under standard output
and `3` under result.

## Execution safety

Only one execution can be active at a time. A run that exceeds the existing
10-second Worker timeout terminates the Worker, creates a replacement, and
shows recovery status before enabling execution again.

## Persistence and Supabase

The repository still contains Supabase-related dependencies and historical
code, but this application path does not import, initialize, or call
`@supabase/supabase-js`. There is no persistence, history, save, configuration,
or retry-for-execution UI, and no Supabase credentials are needed.
