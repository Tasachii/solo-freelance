import { describe, expect, it } from 'vitest'
import {
  CHUNK_CHARS, MIN_SYNC_GAP_MS, SHEETS_FORMAT,
  buildPayload, chunk, isWebAppUrl, joinChunks, shouldSync, type SheetsConfig,
} from '../../src/core/sheets'
import { buildScenario } from '../../src/core/scenarios'
import { reducer } from '../../src/core/store'
import { isWellFormed } from '../../src/core/backup'

const cfg = (over: Partial<SheetsConfig> = {}): SheetsConfig => ({
  url: 'https://script.google.com/macros/s/AKfycbx_9-Zq/exec', token: 't', auto: true, ...over,
})

describe('ปลายทางที่ยอมส่งข้อมูลไปให้', () => {
  it('รับเฉพาะเว็บแอปของ Apps Script — ข้อมูลลูกค้าทั้งก้อนห้ามไปโดเมนอื่น', () => {
    expect(isWebAppUrl('https://script.google.com/macros/s/AKfycbx_9-Zq/exec')).toBe(true)
    expect(isWebAppUrl('  https://script.google.com/macros/s/AK-1_2/exec  ')).toBe(true)
    for (const bad of [
      'http://script.google.com/macros/s/AK/exec',        // ไม่ใช่ https
      'https://script.google.com.evil.test/macros/s/AK/exec',
      'https://evil.test/macros/s/AK/exec',
      'https://script.google.com/macros/s/AK/dev',        // ไม่ใช่ /exec
      'https://script.google.com/macros/s/AK/exec/extra',
      'https://script.google.com/a/macros/s/AK/exec',
      'not a url', '',
    ]) expect(isWebAppUrl(bad), bad).toBe(false)
  })
})

describe('ก้อนข้อมูลที่ส่งขึ้นชีต', () => {
  const state = reducer(buildScenario('default'), { type: 'track', name: 'init' })

  it('มีทุกแท็บที่ครูต้องเห็น และแต่ละแท็บมีหัวตาราง', () => {
    const p = buildPayload(state, 'secret', '2026-09-06T00:00:00.000Z')
    expect(p.format).toBe(SHEETS_FORMAT)
    expect(p.token).toBe('secret')
    expect(p.tables.map((t) => t.name)).toEqual(['รายชื่อ', 'ตาราง', 'บิล', 'สรุปรายเดือน'])
    for (const t of p.tables) {
      expect(t.rows.length, t.name).toBeGreaterThan(1) // หัว + อย่างน้อยหนึ่งแถว
      expect(t.rows[0].every((c) => typeof c === 'string')).toBe(true)
    }
    // ทุกแถวกว้างเท่าหัวตาราง — ไม่งั้นค่าจะเลื่อนคอลัมน์ในชีต
    for (const t of p.tables) {
      const width = t.rows[0].length
      for (const r of t.rows) expect(r.length, `${t.name} ${r[0]}`).toBe(width)
    }
  })

  it('ตัวเลขเงินส่งเป็นตัวเลข ไม่ใช่ข้อความ — ชีตจะได้บวกได้', () => {
    const bills = buildPayload(state, 't', 'x').tables.find((t) => t.name === 'บิล')!
    const first = bills.rows[1]
    expect(typeof first[2]).toBe('number') // ยอด
    expect(typeof first[3]).toBe('number') // จ่ายแล้ว
    expect(typeof first[4]).toBe('number') // คงเหลือ
  })

  it('สำเนา JSON กู้กลับได้ครบทุกตัวอักษร', () => {
    const p = buildPayload(state, 't', 'x')
    const back = JSON.parse(joinChunks(p.backup))
    expect(isWellFormed(back)).toBe(true)
    expect(back).toEqual(state)
  })

  it('แบ่งท่อนไม่เกินเพดานของช่องในชีต', () => {
    expect(chunk('')).toEqual([''])
    expect(chunk('abc')).toEqual(['abc'])
    // เพดานจริงของช่องใน Google Sheets คือ 50,000 ตัวอักษร — ท่อนต้องเล็กกว่านั้นเสมอ
    expect(CHUNK_CHARS).toBeLessThan(50_000)
    const long = 'x'.repeat(CHUNK_CHARS * 2 + 5)
    const parts = chunk(long)
    expect(parts).toHaveLength(3)
    for (const part of parts) expect(part.length).toBeLessThan(50_000)
    expect(joinChunks(parts)).toBe(long)
  })
})

describe('ควรส่งตอนนี้ไหม', () => {
  const now = 1_800_000_000_000

  it('ยังไม่ตั้งค่า หรือ URL/รหัสไม่ครบ = ไม่ส่ง', () => {
    expect(shouldSync(undefined, 'real', now)).toEqual({ due: false, reason: 'not-configured' })
    expect(shouldSync(cfg({ token: '' }), 'real', now).due).toBe(false)
    expect(shouldSync(cfg({ url: 'https://evil.test/x' }), 'real', now)).toEqual({ due: false, reason: 'not-configured' })
  })

  it('โหมดเดโมไม่ส่ง — ข้อมูลสมมติห้ามปนกับของจริงในชีตครู', () => {
    expect(shouldSync(cfg(), 'demo', now)).toEqual({ due: false, reason: 'demo' })
  })

  it('ปิดส่งอัตโนมัติแล้วไม่ส่ง', () => {
    expect(shouldSync(cfg({ auto: false }), 'real', now)).toEqual({ due: false, reason: 'auto-off' })
  })

  it('เพิ่งส่งไปยังไม่ถึงรอบ = รอก่อน', () => {
    const justNow = new Date(now - MIN_SYNC_GAP_MS + 1).toISOString()
    expect(shouldSync(cfg({ lastSyncAt: justNow }), 'real', now)).toEqual({ due: false, reason: 'too-soon' })
    const older = new Date(now - MIN_SYNC_GAP_MS).toISOString()
    expect(shouldSync(cfg({ lastSyncAt: older }), 'real', now)).toEqual({ due: true })
  })

  it('เวลาล่าสุดที่อ่านไม่ออกต้องไม่ทำให้หยุดส่งถาวร', () => {
    expect(shouldSync(cfg({ lastSyncAt: 'เมื่อกี้' }), 'real', now)).toEqual({ due: true })
  })
})
