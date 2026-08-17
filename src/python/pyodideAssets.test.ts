import { describe, expect, it } from 'vitest'
import { getPyodideConfig } from './pyodideAssets'

describe('getPyodideConfig', () => {
  it('uses one local asset directory for the Pyodide runtime files', () => {
    const config = getPyodideConfig()

    expect(config.indexURL).toContain('/pyodide/')
    expect(config.lockFileURL).toMatch(/pyodide-lock\.json/)
    expect(config.stdLibURL).toMatch(/python_stdlib\.zip/)
  })
})
