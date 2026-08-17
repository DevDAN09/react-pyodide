export function getPyodideConfig() {
  const indexURL = '/pyodide/'
  return {
    indexURL,
    lockFileURL: '/pyodide/pyodide-lock.json',
    stdLibURL: '/pyodide/python_stdlib.zip',
  }
}
