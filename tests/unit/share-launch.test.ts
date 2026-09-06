import { afterEach, describe, expect, it, vi } from 'vitest'
import { openLine, copyText } from '../../src/app/share'

afterEach(() => vi.restoreAllMocks())
describe('LINE launch acknowledgement', () => {
  it('does not confuse a successful noopener null handle with popup blocking', () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null)
    expect(openLine('ข้อความทดสอบ')).toBe(true)
    expect(open).toHaveBeenCalledWith(expect.stringContaining('line.me'), '_blank', 'noopener,noreferrer')
  })
  it('reports a thrown launch error and rejects an empty request', () => {
    vi.spyOn(window, 'open').mockImplementation(() => { throw new Error('blocked') })
    expect(openLine('ข้อความ')).toBe(false)
    expect(openLine('  ')).toBe(false)
  })
  it('reports clipboard rejection truthfully', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: () => Promise.reject(new Error('denied')) } })
    expect(await copyText('ข้อความ')).toBe(false)
    vi.unstubAllGlobals()
  })
})
