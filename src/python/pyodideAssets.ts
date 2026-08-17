import pyodideAsmUrl from 'pyodide/pyodide.asm.mjs?url'
import pyodideWasmUrl from 'pyodide/pyodide.asm.wasm?url'
import pyodideLockUrl from 'pyodide/pyodide-lock.json?url'
import pyodideStdlibUrl from 'pyodide/python_stdlib.zip?url'

const runtimeAssetUrls = [pyodideAsmUrl, pyodideWasmUrl, pyodideStdlibUrl]

export function getPyodideConfig() {
  const isAbsolute = pyodideLockUrl.startsWith('http://') || pyodideLockUrl.startsWith('https://')
  const base = isAbsolute ? undefined : (typeof location !== 'undefined' ? location.origin : 'http://localhost')
  const resolvedLock = base ? new URL(pyodideLockUrl, base).href : pyodideLockUrl
  const resolvedIndex = new URL('.', resolvedLock).href
  const indexURL = base ? new URL(resolvedIndex).pathname : resolvedIndex

  if (!runtimeAssetUrls.every((assetUrl) => {
    const resolvedAsset = base ? new URL(assetUrl, base).href : assetUrl
    return resolvedAsset.startsWith(resolvedIndex)
  })) {
    throw new Error('Pyodide runtime assets must share one directory.')
  }

  return {
    indexURL,
    lockFileURL: pyodideLockUrl,
    stdLibURL: pyodideStdlibUrl,
  }
}
