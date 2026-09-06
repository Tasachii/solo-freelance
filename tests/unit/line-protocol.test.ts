import { describe, expect, it } from 'vitest'
import {
  LINE_PUSH_URL, LINE_TEXT_MAX, RETRY_DELAYS_MS, SEND_FROM_HOUR, SEND_UNTIL_HOUR,
  classifyPush, isOptOut, nextSendWindow, parseWebhook, pickOnePerRecipient,
  planWebhookEvent, pushRequest, replyRequest, retryDelayMs, withinSendWindow,
  type Candidate, type LineEvent,
} from '../../src/core/lineProtocol'

const hook = (events: unknown[]) => JSON.stringify({ destination: 'Uabc', events })

describe('อ่าน webhook', () => {
  it('แปลง follow · unfollow · ข้อความ ได้ครบ', () => {
    const w = parseWebhook(hook([
      { type: 'follow', source: { userId: 'U1' }, replyToken: 'r1' },
      { type: 'unfollow', source: { userId: 'U2' } },
      { type: 'message', source: { userId: 'U3' }, message: { type: 'text', text: '123456' }, replyToken: 'r3' },
    ]))
    expect(w?.destination).toBe('Uabc')
    expect(w?.events).toEqual([
      { type: 'follow', userId: 'U1', replyToken: 'r1' },
      { type: 'unfollow', userId: 'U2' },
      { type: 'message', userId: 'U3', text: '123456', replyToken: 'r3' },
    ])
  })

  it('เหตุการณ์ที่ไม่รู้จักกลายเป็น other ไม่ใช่ทำให้ทั้งก้อนพัง — webhook ต้องตอบ 2xx เสมอ', () => {
    const w = parseWebhook(hook([
      { type: 'sticker', source: { userId: 'U1' } },
      { type: 'message', source: { userId: 'U1' }, message: { type: 'image' } },
      { type: 'follow' }, // ไม่มี userId
    ]))
    expect(w?.events).toEqual([{ type: 'other' }, { type: 'other' }, { type: 'other' }])
  })

  it('body ที่อ่านไม่ออกหรือผิดรูปคืน null ไม่ throw', () => {
    expect(parseWebhook('ไม่ใช่ json')).toBeNull()
    expect(parseWebhook('null')).toBeNull()
    expect(parseWebhook('{"events":[]}')).toBeNull()
    expect(parseWebhook('{"destination":"U","events":"ไม่ใช่ array"}')).toBeNull()
  })
})

describe('เหตุการณ์นี้ควรทำอะไร', () => {
  const msg = (text: string): LineEvent => ({ type: 'message', userId: 'U1', text })

  it('แอดเพื่อน → บันทึกไว้แล้วขอรหัส', () => {
    expect(planWebhookEvent({ type: 'follow', userId: 'U1' }, false))
      .toEqual({ kind: 'register', userId: 'U1', reply: 'ask-code' })
  })

  it('บล็อก → บันทึกว่าเลิกติดตาม', () => {
    expect(planWebhookEvent({ type: 'unfollow', userId: 'U1' }, true)).toEqual({ kind: 'unfollow', userId: 'U1' })
  })

  it('พิมพ์รหัส 6 หลักตอนยังไม่จับคู่ = ขอจับคู่ · มีเว้นวรรคหรือขีดก็ได้', () => {
    expect(planWebhookEvent(msg('123456'), false)).toEqual({ kind: 'link', userId: 'U1', code: '123456', reply: 'linked' })
    expect(planWebhookEvent(msg('123-456'), false)).toMatchObject({ kind: 'link', code: '123456' })
  })

  it('จับคู่แล้วพิมพ์เลข 6 หลักคือข้อความธรรมดา ไม่ใช่รหัส', () => {
    // ผู้ปกครองพิมพ์เลขบ้านหรือเบอร์ห้องมา ต้องไม่ถูกจับคู่ใหม่
    expect(planWebhookEvent(msg('123456'), true)).toEqual({ kind: 'inbound', userId: 'U1', text: '123456' })
  })

  it('ขอหยุดรับข้อความต้องหยุดทันที ไม่ต้องรอครู', () => {
    for (const w of ['ยกเลิก', 'หยุด', ' STOP ', 'unsubscribe']) {
      expect(planWebhookEvent(msg(w), true), w).toEqual({ kind: 'opt-out', userId: 'U1', reply: 'opted-out' })
    }
    expect(isOptOut('หยุดส่งได้ไหมคะ')).toBe(false) // ประโยคยาวไม่ใช่คำสั่ง
    expect(planWebhookEvent(msg('หยุดส่งได้ไหมคะ'), true).kind).toBe('inbound')
  })
})

describe('ประกอบคำขอไปยัง LINE', () => {
  it('push แนบ token ใน header และตัดข้อความที่ยาวเกินเพดาน', () => {
    const long = 'ก'.repeat(LINE_TEXT_MAX + 50)
    const r = pushRequest('tok', 'U1', long)
    expect(r.url).toBe(LINE_PUSH_URL)
    expect(r.init.headers.Authorization).toBe('Bearer tok')
    const body = JSON.parse(r.init.body) as { to: string; messages: { text: string }[] }
    expect(body.to).toBe('U1')
    expect(body.messages[0].text).toHaveLength(LINE_TEXT_MAX)
  })

  it('reply ใช้ replyToken ไม่ใช่ userId', () => {
    const body = JSON.parse(replyRequest('tok', 'rt', 'สวัสดี').init.body) as { replyToken: string }
    expect(body.replyToken).toBe('rt')
  })
})

describe('ผลจาก LINE แปลว่าอะไร', () => {
  it('สำเร็จ · ลองใหม่ได้ · token เสีย · เลิกลอง', () => {
    expect(classifyPush(200)).toBe('sent')
    expect(classifyPush(429)).toBe('retry')
    expect(classifyPush(500)).toBe('retry')
    expect(classifyPush(503)).toBe('retry')
    expect(classifyPush(401)).toBe('invalid-token')
    expect(classifyPush(403)).toBe('invalid-token')
    expect(classifyPush(400)).toBe('failed')
    expect(classifyPush(404)).toBe('failed')
  })

  it('ผู้ปกครองบล็อกไว้ต้องแยกจากคำขอผิด จะได้ไม่ไปแก้ข้อความให้เสียเวลา', () => {
    expect(classifyPush(400, '{"message":"You can\'t send messages to this user. blocked"}')).toBe('blocked')
  })

  it('ลองใหม่ได้ 3 ครั้ง ห่างขึ้นเรื่อย ๆ แล้วเลิก', () => {
    expect(retryDelayMs(1)).toBe(RETRY_DELAYS_MS[0])
    expect(retryDelayMs(3)).toBe(RETRY_DELAYS_MS[2])
    expect(retryDelayMs(4)).toBeNull()
    expect(retryDelayMs(0)).toBeNull()
    // ต้องห่างขึ้นจริง ไม่ใช่ค่าเดิมสามครั้ง
    expect(RETRY_DELAYS_MS[1]).toBeGreaterThan(RETRY_DELAYS_MS[0])
    expect(RETRY_DELAYS_MS[2]).toBeGreaterThan(RETRY_DELAYS_MS[1])
  })
})

describe('เวลาที่ส่งได้ (เวลาไทย)', () => {
  // 2026-09-06T01:00:00Z = 08:00 ไทย · T13:30:00Z = 20:30 ไทย
  const at = (iso: string) => new Date(iso)

  it('ส่งได้ 08:00–20:00 เท่านั้น', () => {
    expect(withinSendWindow(at('2026-09-06T01:00:00Z'))).toBe(true)   // 08:00
    expect(withinSendWindow(at('2026-09-06T12:59:00Z'))).toBe(true)   // 19:59
    expect(withinSendWindow(at('2026-09-06T13:00:00Z'))).toBe(false)  // 20:00
    expect(withinSendWindow(at('2026-09-06T00:59:00Z'))).toBe(false)  // 07:59
    expect(withinSendWindow(at('2026-09-05T19:00:00Z'))).toBe(false)  // 02:00
  })

  it('นอกเวลาให้เลื่อนไปรอบถัดไป ไม่ใช่ทิ้งข้อความ', () => {
    const late = nextSendWindow(at('2026-09-06T15:00:00Z')) // 22:00 ไทย
    expect(withinSendWindow(late)).toBe(true)
    expect(late.getTime()).toBeGreaterThan(at('2026-09-06T15:00:00Z').getTime())
    // อยู่ในเวลาแล้วไม่ต้องเลื่อน
    const fine = at('2026-09-06T05:00:00Z')
    expect(nextSendWindow(fine).getTime()).toBe(fine.getTime())
  })

  it('ขอบเวลาเป็นค่าเดียวกับที่ประกาศไว้', () => {
    expect(SEND_FROM_HOUR).toBe(8)
    expect(SEND_UNTIL_HOUR).toBe(20)
  })
})

describe('หนึ่งใบต่อคนต่อวัน', () => {
  const c = (recipientId: string, kind: Candidate['kind'], key: string): Candidate =>
    ({ recipientId, kind, dedupeKey: key })

  it('เข้าหลายกฎพร้อมกันได้ใบที่ด่วนที่สุดใบเดียว', () => {
    const out = pickOnePerRecipient([
      c('r1', 'renewal', 'a'), c('r1', 'reminder', 'b'), c('r1', 'invoice', 'c'),
      c('r2', 'summary', 'd'),
    ])
    expect(out).toHaveLength(2)
    expect(out.find((x) => x.recipientId === 'r1')?.kind).toBe('reminder')
    expect(out.find((x) => x.recipientId === 'r2')?.kind).toBe('summary')
  })

  it('ผู้รับคนละคนไม่ตัดกัน', () => {
    expect(pickOnePerRecipient([c('r1', 'invoice', 'a'), c('r2', 'invoice', 'b')])).toHaveLength(2)
  })
})
