import { describe, expect, it } from 'vitest'
import { normalizeWorkerResult } from './result'

describe('normalizeWorkerResult', () => {
  it('maps a successful worker response', () => {
    expect(
      normalizeWorkerResult(
        {
          type: 'result',
          requestId: '1',
          stdout: 'hello\n',
          stderr: '',
          result: '3',
          error: '',
          durationMs: 12,
        },
        'print("hello")\n1 + 2',
      ),
    ).toEqual({
      code: 'print("hello")\n1 + 2',
      stdout: 'hello\n',
      stderr: '',
      result: '3',
      error: '',
      status: 'success',
      durationMs: 12,
    })
  })

  it('marks a traceback as an error', () => {
    expect(
      normalizeWorkerResult(
        {
          type: 'result',
          requestId: '2',
          stdout: '',
          stderr: '',
          result: '',
          error: 'Traceback: ValueError',
          durationMs: 3,
        },
        'raise ValueError()',
      ).status,
    ).toBe('error')
  })
})
