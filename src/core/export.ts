import { copy } from '../copy'
import type { AppState } from './types'
import { balanceDue, clientById, isCompleted, paidAmount, subjectById } from './ledger'
import { modeLabelFor } from '../professions'
import { dateThai, periodOf, periodThai } from './format'
import { receiptOfInvoice } from './receipts'

const BOM = '﻿' // ให้ Excel ไทยอ่าน UTF-8 ไม่เป็นตัวยึกยือ
const safeCell = (value: unknown): string => {
  const text = String(value ?? '').replace(/[\u0000-\u001f]/g, '')
  const prefix = text.match(/^\s*/)?.[0] ?? ''
  const rest = text.slice(prefix.length)
  return /^[=+\-@]/.test(rest) ? `'${prefix}${rest}` : text
}
const esc = (v: unknown): string => `"${safeCell(v).replace(/"/g, '""')}"`
const row = (cells: unknown[]): string => cells.map(esc).join(',')

const STATUS_TH: Record<string, string> = copy.billing.status

/** รวมสองตารางไว้ในไฟล์เดียว — มือถือบล็อกดาวน์โหลดไฟล์ที่สองที่ยิงตามมา */
export function monthCsv(state: AppState, period: string): string {
  return [
    `# ${copy.billing.exportAttendance} ${periodThai(period)}`,
    attendanceCsv(state, period).replace(BOM, ''),
    '',
    `# ${copy.billing.exportBilling} ${periodThai(period)}`,
    billingCsv(state, period).replace(BOM, ''),
  ].join('\n')
}

export function attendanceCsv(state: AppState, period: string): string {
  const lines = [['วันที่', 'เวลา', 'ชื่อ', 'ผู้จ่าย', 'รายการ', 'สถานะ'].join(',')]
  const rows = state.units
    .filter((u) => periodOf(u.scheduledAt) === period)
    .sort((a, b) => (a.scheduledAt + a.time).localeCompare(b.scheduledAt + b.time))
  for (const u of rows) {
    const s = subjectById(state, u.subjectId)
    if (!s) continue
    const c = clientById(state, s.clientId)
    lines.push(row([
      dateThai(u.scheduledAt), u.time, s.name, c?.name ?? '', s.label ?? s.name,
      u.cancelled ? 'งด' : isCompleted(state, u.id) ? 'ทำแล้ว' : 'ยังไม่ทำ',
    ]))
  }
  return BOM + lines.join('\n')
}

export function billingCsv(state: AppState, period: string): string {
  const lines = [['เดือน', 'ชื่อ', 'วิธีเก็บเงิน', 'ยอด', 'จ่ายแล้วสะสม', 'ยอดคงเหลือ', 'สถานะ', 'วันที่ส่ง', 'วันที่ปิดยอด', 'เลขใบเสร็จ'].join(',')]
  const invs = state.invoices
    .filter((i) => i.period === period)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  for (const inv of invs) {
    const s = subjectById(state, inv.subjectId)
    const pays = state.payments.filter((p) => p.invoiceId === inv.id).sort((a, b) => a.paidAt.localeCompare(b.paidAt))
    const rc = receiptOfInvoice(state, inv.id)
    lines.push(row([
      periodThai(inv.period), s?.name ?? '', s ? modeLabelFor(state.professionId, s.billing.mode) : '',
      inv.total, paidAmount(state, inv.id), balanceDue(state, inv.id), STATUS_TH[inv.status] ?? inv.status,
      inv.sentAt ? dateThai(inv.sentAt) : '', rc && pays.length ? dateThai(pays.at(-1)!.paidAt) : '', rc?.number ?? '',
    ]))
  }
  return BOM + lines.join('\n')
}

export function download(text: string, filename: string, type: string): void {
  const blob = new Blob([text], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
