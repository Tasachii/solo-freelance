import { describe, expect, it } from 'vitest'
import { LINE_TEXT_LIMIT, lineShareUrl } from '../../src/core/share'
import { buildScenario } from '../../src/core/scenarios'
import { deriveDrafts } from '../../src/core/messages'

describe('line share', () => {
  it('ข้อความไทยและขึ้นบรรทัดใหม่ต้องรอดผ่าน url', () => {
    const text = 'เรียนคุณแม่แพรว 🙏 ค่าเรียน 3,000 บาท\nสแกนที่ https://x.test/#/client/c1'
    const url = lineShareUrl(text)
    expect(url.startsWith('https://line.me/R/share?text=')).toBe(true)
    expect(decodeURIComponent(url.split('text=')[1])).toBe(text)
  })

  it('& และ # ต้องถูก encode ไม่งั้นข้อความขาดกลางทาง', () => {
    const url = lineShareUrl('a&b#c')
    expect(url).not.toMatch(/[&#]c/)
    expect(decodeURIComponent(url.split('text=')[1])).toBe('a&b#c')
  })

  it('ตัดข้อความที่ยาวเกินที่ LINE รับได้', () => {
    const url = lineShareUrl('ก'.repeat(LINE_TEXT_LIMIT + 500))
    expect(decodeURIComponent(url.split('text=')[1]).length).toBe(LINE_TEXT_LIMIT)
  })

  it('ร่างจริงทุกใบส่งผ่าน LINE ได้โดยไม่เพี้ยน', () => {
    const s = buildScenario('default')
    const drafts = deriveDrafts(s)
    expect(drafts.length).toBeGreaterThan(0)
    for (const m of drafts) {
      expect(decodeURIComponent(lineShareUrl(m.draft).split('text=')[1])).toBe(m.draft)
    }
  })
})
