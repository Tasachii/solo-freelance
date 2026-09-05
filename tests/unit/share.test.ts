import { describe, expect, it } from 'vitest'
import { LINE_TEXT_LIMIT, lineShareUrl, seedOf } from '../../src/core/share'
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

describe('seedOf', () => {
  it('id เดิมได้ค่าเดิมเสมอ — เดโมจึงเดาผลได้ ไม่สุ่มใหม่ทุกครั้ง', () => {
    expect(seedOf('inv-s2-2025-08')).toBe(seedOf('inv-s2-2025-08'))
    expect(seedOf('inv-s2-2025-08')).not.toBe(seedOf('inv-s3-2025-08'))
  })
  it('อยู่ในช่วง [0,1) เสมอ', () => {
    for (const id of ['a', 'inv-1', 'ใบแจ้ง-๙', '', 'x'.repeat(200)]) {
      const v = seedOf(id)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
})
