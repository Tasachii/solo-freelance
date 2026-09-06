import { describe, expect, it } from 'vitest'
import {
  LINK_CODE_MAX_ATTEMPTS, LINK_CODE_TTL_MS, QUOTA_AUTO_STOP_AT, QUOTA_WARN_AT,
  chooseChannel, newLinkCode, quotaLevel, redeemLinkCode, safeEqual, verifyLineSignature,
  type LineChannelState, type LineRecipientState,
} from '../../src/core/lineDelivery'

const active = (over: Partial<LineChannelState> = {}): LineChannelState =>
  ({ status: 'active', quotaUsed: 0, quotaLimit: 300, ...over })
const linked = (over: Partial<LineRecipientState> = {}): LineRecipientState =>
  ({ linked: true, unfollowed: false, ...over })

describe('เลือกช่องทางส่ง — ทุกกรณีที่ไม่พร้อมต้องกลับไป share link', () => {
  it('พร้อมครบถึงจะส่งผ่าน OA', () => {
    expect(chooseChannel(active(), linked())).toEqual({ channel: 'oa', reason: 'ok' })
  })

  it('ยังไม่เชื่อม OA · token เสีย · ปิดไว้ → share link', () => {
    expect(chooseChannel(undefined, linked())).toEqual({ channel: 'share', reason: 'no-channel' })
    expect(chooseChannel(active({ status: 'invalid' }), linked()).channel).toBe('share')
    expect(chooseChannel(active({ status: 'disabled' }), linked()).channel).toBe('share')
  })

  it('ผู้ปกครองยังไม่จับคู่ หรือบล็อกไปแล้ว → share link', () => {
    expect(chooseChannel(active(), undefined)).toEqual({ channel: 'share', reason: 'not-linked' })
    expect(chooseChannel(active(), linked({ linked: false })).reason).toBe('not-linked')
    expect(chooseChannel(active(), linked({ unfollowed: true })).reason).toBe('unfollowed')
  })

  it('โควตาหมดแล้วห้ามส่งผ่าน OA — ครูจะโดน LINE เก็บเงินเอง', () => {
    expect(chooseChannel(active({ quotaUsed: 299 }), linked()).channel).toBe('oa')
    expect(chooseChannel(active({ quotaUsed: 300 }), linked()))
      .toEqual({ channel: 'share', reason: 'quota-exhausted' })
    // เพดานอ่านจาก quotaLimit ของครูคนนั้น ไม่ใช่ค่าคงที่ 300
    expect(chooseChannel(active({ quotaUsed: 60, quotaLimit: 50 }), linked()).reason).toBe('quota-exhausted')
  })

  it('ข้อความที่ตั้งเวลาส่งเองหยุดก่อนที่ครูกดเอง 1 ชั้น', () => {
    const near = active({ quotaUsed: QUOTA_AUTO_STOP_AT })
    expect(chooseChannel(near, linked(), { auto: true }))
      .toEqual({ channel: 'share', reason: 'quota-auto-paused' })
    expect(chooseChannel(near, linked()).channel).toBe('oa') // ครูกดเองยังส่งได้
    expect(chooseChannel(active({ quotaUsed: QUOTA_AUTO_STOP_AT - 1 }), linked(), { auto: true }).channel).toBe('oa')
  })

  it('ระดับโควตาไล่ตามขีดสามชั้น', () => {
    expect(quotaLevel(active({ quotaUsed: QUOTA_WARN_AT - 1 }))).toBe('ok')
    expect(quotaLevel(active({ quotaUsed: QUOTA_WARN_AT }))).toBe('warn')
    expect(quotaLevel(active({ quotaUsed: QUOTA_AUTO_STOP_AT }))).toBe('auto-stopped')
    expect(quotaLevel(active({ quotaUsed: 300 }))).toBe('exhausted')
  })
})

describe('รหัสจับคู่ผู้ปกครอง', () => {
  const now = 1_700_000_000_000

  it('เป็นเลข 6 หลักเสมอ และมาจากตัวสุ่มของระบบ ไม่ใช่ Math.random', () => {
    let called = false
    const rng = { getRandomValues: (a: Uint32Array) => { called = true; a[0] = 42; return a } } as unknown as Crypto
    const c = newLinkCode(now, 'c1', rng)
    expect(called).toBe(true)
    expect(c.code).toBe('000042')
    expect(c.code).toMatch(/^\d{6}$/)
    expect(c.expiresAt).toBe(now + LINK_CODE_TTL_MS)
    // ค่าสุ่มที่ใหญ่กว่า 6 หลักต้องยังได้ 6 หลัก
    const big = { getRandomValues: (a: Uint32Array) => { a[0] = 4_294_967_295; return a } } as unknown as Crypto
    expect(newLinkCode(now, 'c1', big).code).toMatch(/^\d{6}$/)
  })

  it('รหัสถูก → บอกว่าเป็นผู้ปกครองของใคร · เว้นวรรคหรือขีดกลางไม่เป็นไร', () => {
    const codes = [{ code: '123456', clientId: 'c9', expiresAt: now + 1000 }]
    expect(redeemLinkCode(codes, '123456', now, 0)).toEqual({ ok: true, clientId: 'c9' })
    expect(redeemLinkCode(codes, '123-456', now, 0)).toEqual({ ok: true, clientId: 'c9' })
    expect(redeemLinkCode(codes, ' 123 456 ', now, 0)).toEqual({ ok: true, clientId: 'c9' })
  })

  it('หมดอายุ · ใช้ไปแล้ว · ไม่มีจริง → ไม่ผ่าน', () => {
    const codes = [
      { code: '111111', clientId: 'c1', expiresAt: now },              // ครบพอดี = หมดอายุ
      { code: '222222', clientId: 'c2', expiresAt: now + 1000, usedAt: now - 5 },
    ]
    expect(redeemLinkCode(codes, '111111', now, 0)).toEqual({ ok: false, reason: 'expired' })
    expect(redeemLinkCode(codes, '222222', now, 0)).toEqual({ ok: false, reason: 'used' })
    expect(redeemLinkCode(codes, '999999', now, 0)).toEqual({ ok: false, reason: 'not-found' })
  })

  it('ลองผิดครบโควตาแล้วต้องถูกบล็อก แม้รหัสถัดไปจะถูก', () => {
    const codes = [{ code: '123456', clientId: 'c9', expiresAt: now + 1000 }]
    expect(redeemLinkCode(codes, '123456', now, LINK_CODE_MAX_ATTEMPTS - 1).ok).toBe(true)
    expect(redeemLinkCode(codes, '123456', now, LINK_CODE_MAX_ATTEMPTS))
      .toEqual({ ok: false, reason: 'too-many-attempts' })
  })
})

describe('ลายเซ็น webhook', () => {
  // ค่าที่ LINE จะส่งมาจริงสำหรับ body/secret คู่นี้ — คำนวณครั้งเดียวแล้วตรึงไว้
  const body = '{"destination":"U123","events":[]}'
  const secret = 'test-channel-secret'

  it('ลายเซ็นถูกผ่าน ลายเซ็นผิด/ว่าง/secret ผิดไม่ผ่าน', async () => {
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
    const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body))
    const good = btoa(String.fromCharCode(...new Uint8Array(mac)))

    expect(await verifyLineSignature(body, secret, good)).toBe(true)
    expect(await verifyLineSignature(body, secret, '')).toBe(false)
    expect(await verifyLineSignature(body, 'wrong-secret', good)).toBe(false)
    expect(await verifyLineSignature(body + ' ', secret, good)).toBe(false) // body ถูกแก้แม้ตัวเดียว
    expect(await verifyLineSignature(body, '', good)).toBe(false)
  })

  it('เทียบสตริงแบบเวลาไม่ขึ้นกับตำแหน่งที่ต่าง', () => {
    expect(safeEqual('abc', 'abc')).toBe(true)
    expect(safeEqual('abc', 'abd')).toBe(false)
    expect(safeEqual('abc', 'ab')).toBe(false)
  })
})
