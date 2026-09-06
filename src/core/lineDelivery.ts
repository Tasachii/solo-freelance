/**
 * ตรรกะกลางของการส่งผ่าน LINE OA — ไม่รู้จัก React ไม่แตะ DOM ไม่เรียกเน็ต
 *
 * ทำไมเป็นไฟล์ฟังก์ชันล้วน: การส่งจริงต้องยิงจากเซิร์ฟเวอร์ (channel access token
 * ห้ามอยู่ frontend — แผนข้อ 8) แต่การ "ตัดสินใจ" ว่าจะส่งทางไหน · รหัสจับคู่ยังใช้ได้ไหม ·
 * โควตาเหลือเท่าไหร่ เป็นตรรกะเดียวกันทั้งฝั่งแอปและฝั่ง Edge Function จึงเขียนที่เดียว
 * เทสได้โดยไม่ต้องมีบัญชี LINE และไม่ต้องรอหลังบ้าน
 *
 * อ่านคู่กับ docs/line-oa-plan.md
 */

// ── ช่องทางส่ง ──────────────────────────────────────

/** สถานะของ OA ที่ครูเชื่อมไว้ — undefined = ยังไม่เคยเชื่อม */
export interface LineChannelState {
  status: 'active' | 'invalid' | 'disabled'
  quotaUsed: number
  quotaLimit: number
}

/** ผู้รับที่แอดเพื่อนแล้ว — undefined = ยังไม่มีใครแอดในนามลูกค้าคนนี้ */
export interface LineRecipientState {
  linked: boolean
  unfollowed: boolean
}

export type Channel = 'oa' | 'share'

/**
 * เหตุผลที่ไม่ได้ส่งผ่าน OA — ใช้บอกครูในแอป ไม่ใช่โยน error
 * ทุกค่าที่ไม่ใช่ 'ok' แปลว่ากลับไปใช้ share link แบบเดิม (แผนข้อ 10)
 */
export type ChannelReason =
  | 'ok' | 'no-channel' | 'channel-invalid' | 'channel-disabled'
  | 'not-linked' | 'unfollowed' | 'quota-exhausted' | 'quota-auto-paused'

export interface ChannelChoice { channel: Channel; reason: ChannelReason }

/** ขีดสามชั้นตามแผนข้อ 7 — โควตาเป็นของครู ไม่ใช่ของเรา ห้ามให้เกินโดยครูไม่รู้ตัว */
export const QUOTA_WARN_AT = 200
export const QUOTA_AUTO_STOP_AT = 280

/**
 * เลือกช่องทางส่ง — ครูไม่ต้องรู้ว่าใช้ทางไหน
 * `auto` = ข้อความที่ระบบตั้งเวลาส่งเอง (โดนหยุดเร็วกว่าที่ครูกดเอง 1 ชั้น)
 */
export function chooseChannel(
  channel: LineChannelState | undefined,
  recipient: LineRecipientState | undefined,
  opts: { auto?: boolean } = {},
): ChannelChoice {
  const share = (reason: ChannelReason): ChannelChoice => ({ channel: 'share', reason })
  if (!channel) return share('no-channel')
  if (channel.status === 'invalid') return share('channel-invalid')
  if (channel.status === 'disabled') return share('channel-disabled')
  if (!recipient || !recipient.linked) return share('not-linked')
  if (recipient.unfollowed) return share('unfollowed')
  if (channel.quotaUsed >= channel.quotaLimit) return share('quota-exhausted')
  if (opts.auto && channel.quotaUsed >= QUOTA_AUTO_STOP_AT) return share('quota-auto-paused')
  return { channel: 'oa', reason: 'ok' }
}

export type QuotaLevel = 'ok' | 'warn' | 'auto-stopped' | 'exhausted'

export function quotaLevel(channel: LineChannelState): QuotaLevel {
  if (channel.quotaUsed >= channel.quotaLimit) return 'exhausted'
  if (channel.quotaUsed >= QUOTA_AUTO_STOP_AT) return 'auto-stopped'
  if (channel.quotaUsed >= QUOTA_WARN_AT) return 'warn'
  return 'ok'
}

// ── รหัสจับคู่ผู้ปกครอง ─────────────────────────────

export const LINK_CODE_TTL_MS = 24 * 60 * 60 * 1000
export const LINK_CODE_MAX_ATTEMPTS = 5

export interface LinkCode {
  code: string
  clientId: string
  expiresAt: number
  usedAt?: number
}

/**
 * รหัส 6 หลักจากตัวสุ่มของระบบเท่านั้น — Math.random เดาได้
 * และรหัสที่เดาได้ = จับผู้ปกครองผิดคนเข้ากับลูกค้าคนอื่น
 */
export function newLinkCode(now: number, clientId: string, rng: Crypto = crypto): LinkCode {
  const buf = new Uint32Array(1)
  rng.getRandomValues(buf)
  return {
    code: String(buf[0] % 1_000_000).padStart(6, '0'),
    clientId,
    expiresAt: now + LINK_CODE_TTL_MS,
  }
}

export type LinkResult =
  | { ok: true; clientId: string }
  | { ok: false; reason: 'not-found' | 'expired' | 'used' | 'too-many-attempts' }

/**
 * ตรวจรหัสที่ผู้ปกครองพิมพ์มา
 * ข้อความตอบกลับต้องเหมือนกันทุกกรณีที่ไม่สำเร็จ — ห้ามบอกว่ารหัสไหนมีอยู่จริง (แผนข้อ 5)
 */
export function redeemLinkCode(
  codes: LinkCode[],
  input: string,
  now: number,
  attemptsLastHour: number,
): LinkResult {
  if (attemptsLastHour >= LINK_CODE_MAX_ATTEMPTS) return { ok: false, reason: 'too-many-attempts' }
  const typed = input.replace(/\D/g, '')
  const hit = codes.find((c) => c.code === typed)
  if (!hit) return { ok: false, reason: 'not-found' }
  if (hit.usedAt !== undefined) return { ok: false, reason: 'used' }
  if (now >= hit.expiresAt) return { ok: false, reason: 'expired' }
  return { ok: true, clientId: hit.clientId }
}

// ── ลายเซ็น webhook ─────────────────────────────────

const b64 = (buf: ArrayBuffer): string => {
  const bytes = new Uint8Array(buf)
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s)
}

/** เทียบสองสตริงโดยเวลาไม่ขึ้นกับตำแหน่งที่ต่าง — กันการเดาลายเซ็นทีละไบต์ */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

/**
 * ตรวจ x-line-signature: HMAC-SHA256 ของ raw body ด้วย channel secret เข้ารหัส base64
 * ต้องเรียก **ก่อน** parse body เสมอ ไม่ผ่าน = 401 และไม่ประมวลผลอะไรเลย (แผนข้อ 8)
 */
export async function verifyLineSignature(rawBody: string, secret: string, signature: string): Promise<boolean> {
  if (!signature || !secret) return false
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody))
  return safeEqual(b64(mac), signature)
}
