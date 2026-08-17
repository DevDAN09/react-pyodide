# Python Runner with Supabase Disabled

## Goal

Complete the remaining Pyodide execution application while retaining existing
Supabase implementation artifacts for a future opt-in integration. The shipped
application must execute Python locally in a Web Worker only.

## Scope

- Implement the Pyodide Worker runtime and its execution adapter.
- Provide a React screen with a Python editor, execution controls, status, and
  the most recent execution result.
- Preserve timeout recovery: a timed-out Worker is terminated, replaced, and
  initialized before another run is allowed.
- Add responsive, accessible styling and real-browser smoke coverage.
- Update project documentation to describe the local-only application.

## Supabase disabled mode

The existing `@supabase/supabase-js` dependency and any future repository or
migration artifacts remain in the repository. They are not imported, created,
or called by the production application. The UI has no run-history panel,
database status, save retry, load retry, or Supabase environment-variable
requirement.

Re-enabling persistence later requires an explicit feature change that adds a
repository boundary to `App`; it must not occur implicitly when environment
variables happen to exist.

## Architecture

`App` creates one `PyodideWorkerClient` through `usePythonRunner`. The hook
initializes it on mount, owns the `initializing`, `ready`, `running`,
`recovering`, and `init-error` states, normalizes successful Worker responses,
and converts client failures into a displayed execution error. It disposes the
client on unmount.

The module Worker loads Pyodide once. For each `run` message it uses
`executePython` to capture stdout, stderr, the final value, errors, and elapsed
time, then returns a structured result using the original request ID. The
Worker never uses DOM APIs.

## UI and accessibility

The page contains a labelled Python `<textarea>`, a clearly named Run Python
button, a readiness status, an initialization retry button when applicable,
and a Current result section. Result fields are rendered separately as
preformatted stdout, stderr, final value, and error regions plus duration.
Status messages use `role="status"`; failures use `role="alert"`. The layout is
one column and remains usable from narrow to wide viewports.

## Error behavior

- Initialization failure disables execution and offers retry.
- While a run is active, duplicate runs are blocked.
- Python exceptions preserve any captured stdout and stderr and are shown as a
  result error.
- A timeout is shown as an execution error while the replacement Worker
  initializes. The button becomes available again only after readiness.
- There is no persistence-specific error state in disabled mode.

## Testing

- Unit tests verify output capture, exception handling, `None`, PyProxy
  destruction, and output reset in `executePython`.
- React Testing Library verifies readiness, successful rendering, Python error
  rendering, duplicate-run prevention, timeout recovery, and accessibility.
- Playwright runs real Pyodide in a module Worker for a successful program and
  a Python exception. It does not use Supabase.

## Acceptance criteria

1. Python executes off the main thread and displays separated output, result,
   error, and duration values.
2. The app never connects to Supabase and has no persistence UI.
3. A Worker timeout recovers to a runnable state.
4. Unit tests, type checking, production build, and local Pyodide browser
   smoke tests pass.
