import type { AppState } from '../core/types'
import { buildPayload, isWebAppUrl, type SheetsConfig } from '../core/sheets'

/** ตั้งค่าการเชื่อมชีตเป็นของเครื่อง ไม่ใช่ของ ledger — เก็บแยกเหมือนธีม ไม่ต้องอัปเกรด schema */
const KEY = 'solo-sheets'

export function readSheetsConfig(): SheetsConfig | undefined {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return undefined
    const c = JSON.parse(raw) as Partial<SheetsConfig>
    if (typeof c.url !== 'string' || typeof c.token !== 'string') return undefined
    return { url: c.url, token: c.token, auto: c.auto !== false, lastSyncAt: c.lastSyncAt, lastSyncConfirmed: c.lastSyncConfirmed }
  } catch {
    return undefined
  }
}

export function writeSheetsConfig(c: SheetsConfig | undefined): void {
  try {
    if (!c) localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, JSON.stringify(c))
  } catch {
    /* โหมดส่วนตัวเขียนไม่ได้ — ส่งครั้งนี้ยังทำได้ แค่จำไม่ได้ */
  }
}

export type SyncOutcome =
  | { ok: true; confirmed: boolean }
  | { ok: false; reason: 'bad-url' | 'network' | 'rejected'; detail?: string }

/**
 * ยิงข้อมูลขึ้น Web App ของครู
 *
 * ส่งเป็น text/plain โดยตั้งใจ — Apps Script อ่าน header ไม่ได้อยู่แล้ว และ content-type นี้
 * ทำให้เบราว์เซอร์ไม่ต้องยิง preflight ซึ่ง Apps Script ตอบไม่ได้
 * ถ้าอ่านคำตอบข้ามโดเมนไม่ได้ ให้ส่งซ้ำแบบ no-cors แล้วบอกครูตามตรงว่า "ส่งแล้ว แต่ยืนยันผลไม่ได้"
 */
export async function pushToSheets(state: AppState, config: SheetsConfig, at: string): Promise<SyncOutcome> {
  if (!isWebAppUrl(config.url)) return { ok: false, reason: 'bad-url' }
  const body = JSON.stringify(buildPayload(state, config.token, at))
  try {
    const res = await fetch(config.url, { method: 'POST', body, headers: { 'Content-Type': 'text/plain;charset=utf-8' }, redirect: 'follow' })
    const text = await res.text()
    const parsed = JSON.parse(text) as { ok?: boolean; error?: string }
    if (parsed.ok) return { ok: true, confirmed: true }
    return { ok: false, reason: 'rejected', detail: parsed.error }
  } catch {
    // อ่านคำตอบไม่ได้ (CORS) — ส่งอีกครั้งแบบไม่รอคำตอบ
    try {
      await fetch(config.url, { method: 'POST', mode: 'no-cors', body, headers: { 'Content-Type': 'text/plain;charset=utf-8' } })
      return { ok: true, confirmed: false }
    } catch {
      return { ok: false, reason: 'network' }
    }
  }
}
