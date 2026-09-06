import type { AppState } from './types'
import { balanceDue, clientById, isCompleted, packageStatus, paidAmount, subjectById } from './ledger'
import { modeLabelFor } from '../professions'
import { dateThai, periodOf, periodThai } from './format'
import { receiptOfInvoice } from './receipts'
import { copy } from '../copy'

/**
 * สำรองข้อมูลขึ้น Google Sheets ของครูเอง — ตรรกะล้วน ไม่เรียกเน็ต ไม่แตะ DOM
 *
 * ทำไมเขียนอย่างเดียวไม่อ่านกลับมาคำนวณ: Sheets ไม่มี transaction และไม่มี unique constraint
 * ถ้าให้มันเป็นแหล่งความจริง บิลซ้ำสองใบจะเกิดได้จริง — แหล่งความจริงจึงยังเป็นเครื่องของครู
 * ชีตทำหน้าที่สองอย่าง: ตารางที่ครูเปิดดูเองได้ และสำเนา JSON ไว้กู้คืนแบบครบทุกตัวอักษร
 */

export const SHEETS_FORMAT = 'solo-sheets-1'
/** ช่องหนึ่งของ Google Sheets รับได้ 50,000 ตัวอักษร — เผื่อไว้ให้ไม่ชนเพดาน */
export const CHUNK_CHARS = 40_000

export interface SheetsConfig {
  /** URL ของ Web App ที่ครู deploy เอง (.../macros/s/<id>/exec) */
  url: string
  /** รหัสที่ครูตั้งไว้ในสคริปต์ — กันคนอื่นที่บังเอิญรู้ URL เขียนทับชีต */
  token: string
  /** ส่งอัตโนมัติเมื่อข้อมูลเปลี่ยน */
  auto: boolean
  lastSyncAt?: string
  /** ยืนยันจากสคริปต์ได้ไหม — เบราว์เซอร์อ่านคำตอบข้ามโดเมนไม่ได้เสมอไป */
  lastSyncConfirmed?: boolean
}

/**
 * รับเฉพาะ URL ของ Google Apps Script Web App จริง ๆ
 * ถ้าปล่อยให้ใส่อะไรก็ได้ ข้อมูลลูกค้าทั้งก้อนจะถูกยิงไปโดเมนของคนอื่นโดยครูไม่รู้ตัว
 */
export function isWebAppUrl(url: string): boolean {
  let u: URL
  try {
    u = new URL(url.trim())
  } catch {
    return false
  }
  if (u.protocol !== 'https:') return false
  if (u.hostname !== 'script.google.com') return false
  return /^\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(u.pathname)
}

export type Table = { name: string; rows: (string | number)[][] }

export interface SheetsPayload {
  format: typeof SHEETS_FORMAT
  token: string
  providerName: string
  mode: AppState['mode']
  at: string
  tables: Table[]
  /** state ทั้งก้อนแบ่งเป็นท่อน ๆ ให้ลงช่องของ Sheets ได้ */
  backup: string[]
}

/** แบ่งข้อความยาวเป็นท่อนละไม่เกิน CHUNK_CHARS — ข้อความว่างได้หนึ่งท่อนว่าง */
export function chunk(text: string, size = CHUNK_CHARS): string[] {
  if (text.length <= size) return [text]
  const out: string[] = []
  for (let i = 0; i < text.length; i += size) out.push(text.slice(i, i + size))
  return out
}

const STATUS_TH: Record<string, string> = copy.billing.status

function subjectsTable(state: AppState): Table {
  const rows: (string | number)[][] = [['ชื่อ', 'ผู้จ่าย', 'LINE', 'วิธีเก็บเงิน', 'ราคา', 'แพ็กคงเหลือ', 'สถานะ']]
  for (const s of state.subjects) {
    const c = clientById(state, s.clientId)
    const pk = packageStatus(state, s)
    const price = s.billing.mode === 'per_unit' ? s.billing.rate
      : s.billing.mode === 'flat_monthly' ? s.billing.amount : s.billing.price
    rows.push([
      s.name, c?.name ?? '', c?.lineId ?? '',
      modeLabelFor(state.professionId, s.billing.mode), price,
      pk ? `${pk.remaining}/${pk.total}` : '',
      s.active ? 'ใช้งาน' : 'หยุดแล้ว',
    ])
  }
  return { name: 'รายชื่อ', rows }
}

function scheduleTable(state: AppState): Table {
  const rows: (string | number)[][] = [['วันที่', 'เวลา', 'ชื่อ', 'รายการ', 'สถานะ']]
  const units = [...state.units].sort((a, b) => (a.scheduledAt + a.time).localeCompare(b.scheduledAt + b.time))
  for (const u of units) {
    const s = subjectById(state, u.subjectId)
    if (!s) continue
    rows.push([
      dateThai(u.scheduledAt), u.time, s.name, u.label ?? s.label ?? s.name,
      u.cancelled ? 'งด' : isCompleted(state, u.id) ? 'ทำแล้ว' : 'ยังไม่ทำ',
    ])
  }
  return { name: 'ตาราง', rows }
}

function billsTable(state: AppState): Table {
  const rows: (string | number)[][] = [['เดือน', 'ชื่อ', 'ยอด', 'จ่ายแล้ว', 'คงเหลือ', 'สถานะ', 'วันที่ส่ง', 'เลขใบเสร็จ']]
  const invs = [...state.invoices].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  for (const inv of invs) {
    const s = subjectById(state, inv.subjectId)
    const rc = receiptOfInvoice(state, inv.id)
    rows.push([
      periodThai(inv.period), s?.name ?? '', inv.total,
      paidAmount(state, inv.id), balanceDue(state, inv.id),
      STATUS_TH[inv.status] ?? inv.status,
      inv.sentAt ? dateThai(inv.sentAt) : '', rc?.number ?? '',
    ])
  }
  return { name: 'บิล', rows }
}

function monthsTable(state: AppState): Table {
  const rows: (string | number)[][] = [['เดือน', 'ยอดควรได้', 'เข้าแล้ว', 'คงเหลือ']]
  const periods = [...new Set(state.invoices.map((i) => i.period))].sort()
  for (const p of periods) {
    const invs = state.invoices.filter((i) => i.period === p)
    rows.push([
      periodThai(p),
      invs.reduce((n, i) => n + i.total, 0),
      invs.reduce((n, i) => n + paidAmount(state, i.id), 0),
      invs.reduce((n, i) => n + balanceDue(state, i.id), 0),
    ])
  }
  // เดือนที่ยังไม่ปิดยอดไม่มีบิล จึงไม่มีแถว — ครูเห็นเฉพาะเดือนที่ออกบิลแล้ว
  if (periods.length === 0) rows.push([periodThai(periodOf(state.today)), 0, 0, 0])
  return { name: 'สรุปรายเดือน', rows }
}

export function buildPayload(state: AppState, token: string, at: string): SheetsPayload {
  return {
    format: SHEETS_FORMAT,
    token,
    providerName: state.provider.name,
    mode: state.mode,
    at,
    tables: [subjectsTable(state), scheduleTable(state), billsTable(state), monthsTable(state)],
    backup: chunk(JSON.stringify(state)),
  }
}

/** ประกอบสำเนา JSON กลับจากท่อนที่อ่านมาจากชีต */
export const joinChunks = (parts: string[]): string => parts.join('')

export type SyncGate = { due: true } | { due: false; reason: 'not-configured' | 'auto-off' | 'demo' | 'too-soon' }

/** ส่งถี่เกินไปจะกิน quota ของ Apps Script โดยเปล่าประโยชน์ */
export const MIN_SYNC_GAP_MS = 30_000

/**
 * ควรส่งขึ้นชีตตอนนี้ไหม — โหมดเดโมไม่ส่ง เพราะข้อมูลสมมติไม่ควรไปปนกับของจริงในชีตครู
 */
export function shouldSync(
  config: SheetsConfig | undefined, mode: AppState['mode'], now: number,
): SyncGate {
  if (!config || !isWebAppUrl(config.url) || !config.token) return { due: false, reason: 'not-configured' }
  if (mode === 'demo') return { due: false, reason: 'demo' }
  if (!config.auto) return { due: false, reason: 'auto-off' }
  const last = config.lastSyncAt ? Date.parse(config.lastSyncAt) : NaN
  if (!Number.isNaN(last) && now - last < MIN_SYNC_GAP_MS) return { due: false, reason: 'too-soon' }
  return { due: true }
}
