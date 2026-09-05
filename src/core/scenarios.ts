import type { AppState, Invoice, Message, Payment } from './types'
import { buildFromPlans, emptyBase, TODAY, type SubjectPlan } from '../mock/seed'
import { receiptNumber } from './receipts'
import { receiptText } from './messages'
import { markOverdue } from './billing'
import { todayISO } from './format'

export const SCENARIOS = ['default', 'package-heavy', 'monthly-heavy', 'empty'] as const
export type ScenarioId = (typeof SCENARIOS)[number]
export const SCENARIO_LABEL: Record<ScenarioId, string> = {
  default: 'ผสม (ใช้ pitch)', 'package-heavy': 'แพ็กเป็นหลัก', 'monthly-heavy': 'รายเดือนเป็นหลัก', empty: 'เริ่มจากศูนย์',
}

const PKG = (total: number, price: number, purchasedAt: string) =>
  ({ mode: 'package' as const, total, price, purchasedAt })

const DEFAULT_PLANS: SubjectPlan[] = [
  { id: 's1', name: 'น้องแพรว', clientId: 'c1', clientName: 'คุณแม่แพรว', billing: { mode: 'per_unit', rate: 400 },
    label: 'คณิต', days: [2, 5], time: '16:00', augDone: 8, sepDoneBeforeToday: 0, todayUnit: { time: '16:00', done: true } },
  { id: 's2', name: 'น้องภูมิ', clientId: 'c2', clientName: 'คุณพ่อภูมิ', billing: { mode: 'per_unit', rate: 500 },
    label: 'ฟิสิกส์', days: [1, 2], time: '17:00', augDone: 6, sepDoneBeforeToday: 1, todayUnit: { time: '17:00', done: false } },
  { id: 's3', name: 'น้องมิว', clientId: 'c3', clientName: 'คุณแม่มิว', billing: { mode: 'per_unit', rate: 400 },
    label: 'คณิต', days: [1, 4], time: '15:00', augDone: 4, sepDoneBeforeToday: 1 },
  { id: 's4', name: 'น้องต้น', clientId: 'c4', clientName: 'คุณแม่ต้น', billing: { mode: 'flat_monthly', amount: 3200 },
    label: 'อังกฤษ', days: [3, 6], time: '10:00', augDone: 8, sepDoneBeforeToday: 0 },
  { id: 's5', name: 'น้องฟ้า', clientId: 'c4', clientName: 'คุณแม่ต้น', billing: { mode: 'flat_monthly', amount: 2800 },
    label: 'อังกฤษ', days: [3, 6], time: '11:00', augDone: 7, sepDoneBeforeToday: 0 },
  { id: 's6', name: 'น้องเจ', clientId: 'c5', clientName: 'คุณพ่อเจ', billing: PKG(10, 3500, '2025-08-10'),
    label: 'เคมี', days: [4, 0], time: '14:00', augDone: 5, sepDoneBeforeToday: 0 },
  { id: 's7', name: 'น้องเนย', clientId: 'c6', clientName: 'คุณแม่เนย', billing: PKG(10, 3500, '2025-07-20'),
    label: 'คณิต', days: [1, 5], time: '18:00', augDone: 8, sepDoneBeforeToday: 0, todayUnit: { time: '18:00', done: false } },
  { id: 's8', name: 'น้องกัน', clientId: 'c7', clientName: 'คุณแม่กัน', billing: PKG(10, 3500, '2025-07-01'),
    label: 'ชีวะ', days: [5, 6], time: '19:00', augDone: 10, sepDoneBeforeToday: 0, todayUnit: { time: '19:00', done: false } },
]

interface SeedInvoice {
  subjectId: string; period: string; total: number; qty: number; unitPrice: number; desc: string
  status: Invoice['status']; sentAt?: string; dueAt?: string; paidAt?: string
}

/** ใส่บิล/การจ่าย/ใบเสร็จของอดีต พร้อมข้อความใบเสร็จที่ "ส่งแล้ว" กัน draft เด้งซ้ำ */
function applySeedInvoices(state: AppState, seeds: SeedInvoice[]): AppState {
  let s = { ...state }
  const invoices: Invoice[] = []
  const payments: Payment[] = []
  const messages: Message[] = []
  let rc = 0
  const receipts: AppState['receipts'] = []

  for (const sd of seeds) {
    const subject = s.subjects.find((x) => x.id === sd.subjectId)!
    const inv: Invoice = {
      id: `inv-${sd.subjectId}-${sd.period}`, clientId: subject.clientId, subjectId: sd.subjectId,
      period: sd.period, kind: 'monthly',
      lines: [{ description: sd.desc, qty: sd.qty, unitPrice: sd.unitPrice, amount: sd.total }],
      total: sd.total, status: sd.status, createdAt: sd.sentAt ?? sd.period + '-28',
      ...(sd.sentAt ? { sentAt: sd.sentAt } : {}), ...(sd.dueAt ? { dueAt: sd.dueAt } : {}),
    }
    invoices.push(inv)

    if (sd.status === 'paid' && sd.paidAt) {
      const pay: Payment = { id: `pay-${sd.subjectId}-${sd.period}`, invoiceId: inv.id, amount: sd.total, paidAt: sd.paidAt, slipVerified: true }
      payments.push(pay)
      rc += 1
      const receipt = { id: `rc-${rc}`, paymentId: pay.id, number: receiptNumber(rc, sd.paidAt), issuedAt: sd.paidAt }
      receipts.push(receipt)
      messages.push({
        id: `m-seed-rcp-${pay.id}`, clientId: subject.clientId, subjectId: subject.id, kind: 'receipt',
        draft: '', status: 'sent', createdAt: sd.paidAt, sentAt: sd.paidAt, dedupeKey: `rcp:${pay.id}`,
        meta: { receiptId: receipt.id },
      })
    }
  }

  s = { ...s, invoices, payments, receipts, messages, counters: { ...s.counters, receipt: rc } }
  // เติมข้อความใบเสร็จหลัง state ครบ (ต้องใช้ invoice + receipt ในการ render)
  s = {
    ...s,
    messages: s.messages.map((m) => {
      if (m.kind !== 'receipt' || m.draft) return m
      const pay = s.payments.find((p) => `rcp:${p.id}` === m.dedupeKey)
      const inv = pay ? s.invoices.find((i) => i.id === pay.invoiceId) : undefined
      const rec = pay ? s.receipts.find((r) => r.paymentId === pay.id) : undefined
      if (!pay || !inv || !rec) return m
      return { ...m, draft: receiptText(s, inv, rec.id, pay.amount) }
    }),
  }
  return s
}

function scenarioDefault(): AppState {
  let s = buildFromPlans(DEFAULT_PLANS, 'default')
  s = applySeedInvoices(s, [
    { subjectId: 's1', period: '2025-08', total: 3200, qty: 8, unitPrice: 400, desc: 'คณิต ส.ค. 2568 — 8 × 400', status: 'paid', sentAt: '2025-08-31', paidAt: '2025-08-31' },
    { subjectId: 's2', period: '2025-08', total: 3000, qty: 6, unitPrice: 500, desc: 'ฟิสิกส์ ส.ค. 2568 — 6 × 500', status: 'sent', sentAt: '2025-08-25', dueAt: '2025-08-28' },
    { subjectId: 's3', period: '2025-08', total: 1600, qty: 4, unitPrice: 400, desc: 'คณิต ส.ค. 2568 — 4 × 400', status: 'sent', sentAt: '2025-09-01', dueAt: '2025-09-04' },
    { subjectId: 's4', period: '2025-08', total: 3200, qty: 8, unitPrice: 3200, desc: 'อังกฤษ ส.ค. 2568 (เหมา)', status: 'paid', sentAt: '2025-08-31', paidAt: '2025-08-31' },
    { subjectId: 's5', period: '2025-08', total: 2800, qty: 7, unitPrice: 2800, desc: 'อังกฤษ ส.ค. 2568 (เหมา)', status: 'sent', sentAt: '2025-08-18', dueAt: '2025-08-21' },
  ])
  s = {
    ...s,
    chats: [
      { id: 'ch1', clientId: 'c1', from: 'client', text: 'ขอบคุณครับครู เดี๋ยวโอนให้เย็นนี้นะครับ', at: '2025-08-30' },
      { id: 'ch2', clientId: 'c1', from: 'provider', text: 'ได้เลยครับ ขอบคุณมากครับ 🙏', at: '2025-08-30' },
      { id: 'ch3', clientId: 'c2', from: 'client', text: 'ขอโทษนะคะครู เดือนนี้ช้าหน่อย', at: '2025-08-31' },
    ],
  }
  return markOverdue(s)
}

function scenarioPackageHeavy(): AppState {
  const plans: SubjectPlan[] = [
    { id: 'p1', name: 'น้องอิง', clientId: 'k1', clientName: 'คุณแม่อิง', billing: PKG(10, 3500, '2025-08-15'), label: 'คณิต', days: [1, 4], time: '16:00', augDone: 2, sepDoneBeforeToday: 0 },
    { id: 'p2', name: 'น้องโบว์', clientId: 'k2', clientName: 'คุณแม่โบว์', billing: PKG(20, 6500, '2025-08-01'), label: 'อังกฤษ', days: [2, 5], time: '17:00', augDone: 5, sepDoneBeforeToday: 0, todayUnit: { time: '17:00', done: false } },
    { id: 'p3', name: 'น้องปอ', clientId: 'k3', clientName: 'คุณพ่อปอ', billing: PKG(10, 3500, '2025-07-10'), label: 'ฟิสิกส์', days: [3, 6], time: '15:00', augDone: 9, sepDoneBeforeToday: 0 },
    { id: 'p4', name: 'น้องข้าว', clientId: 'k4', clientName: 'คุณแม่ข้าว', billing: PKG(10, 3500, '2025-07-05'), label: 'เคมี', days: [1, 5], time: '18:00', augDone: 8, sepDoneBeforeToday: 0, todayUnit: { time: '18:00', done: false } },
    { id: 'p5', name: 'น้องมาย', clientId: 'k5', clientName: 'คุณแม่มาย', billing: PKG(10, 3500, '2025-07-01'), label: 'ชีวะ', days: [5, 6], time: '19:00', augDone: 10, sepDoneBeforeToday: 0, todayUnit: { time: '19:00', done: false } },
    { id: 'p6', name: 'น้องเต้', clientId: 'k6', clientName: 'คุณพ่อเต้', billing: PKG(10, 3500, '2025-07-02'), label: 'คณิต', days: [4, 0], time: '14:00', augDone: 9, sepDoneBeforeToday: 0 },
    { id: 'p7', name: 'น้องนัท', clientId: 'k7', clientName: 'คุณแม่นัท', billing: { mode: 'per_unit', rate: 450 }, label: 'คณิต', days: [1, 3], time: '13:00', augDone: 5, sepDoneBeforeToday: 1 },
    { id: 'p8', name: 'น้องอาย', clientId: 'k8', clientName: 'คุณแม่อาย', billing: { mode: 'per_unit', rate: 400 }, label: 'อังกฤษ', days: [2, 4], time: '12:00', augDone: 4, sepDoneBeforeToday: 0, todayUnit: { time: '12:00', done: true } },
  ]
  let s = buildFromPlans(plans, 'package-heavy')
  s = applySeedInvoices(s, [
    { subjectId: 'p7', period: '2025-08', total: 2250, qty: 5, unitPrice: 450, desc: 'คณิต ส.ค. 2568 — 5 × 450', status: 'sent', sentAt: '2025-08-26', dueAt: '2025-08-29' },
    { subjectId: 'p8', period: '2025-08', total: 1600, qty: 4, unitPrice: 400, desc: 'อังกฤษ ส.ค. 2568 — 4 × 400', status: 'paid', sentAt: '2025-08-31', paidAt: '2025-08-31' },
  ])
  return markOverdue(s)
}

function scenarioMonthlyHeavy(): AppState {
  const plans: SubjectPlan[] = [
    { id: 'm1', name: 'น้องเอิร์ธ', clientId: 'n1', clientName: 'คุณแม่เอิร์ธ', billing: { mode: 'per_unit', rate: 400 }, label: 'คณิต', days: [1, 2], time: '16:00', augDone: 8, sepDoneBeforeToday: 1, todayUnit: { time: '16:00', done: true } },
    { id: 'm2', name: 'น้องบีม', clientId: 'n2', clientName: 'คุณพ่อบีม', billing: { mode: 'per_unit', rate: 500 }, label: 'ฟิสิกส์', days: [2, 4], time: '17:00', augDone: 6, sepDoneBeforeToday: 0, todayUnit: { time: '17:00', done: false } },
    { id: 'm3', name: 'น้องแทน', clientId: 'n3', clientName: 'คุณแม่แทน', billing: { mode: 'per_unit', rate: 450 }, label: 'เคมี', days: [3, 5], time: '15:00', augDone: 7, sepDoneBeforeToday: 0 },
    { id: 'm4', name: 'น้องพลอย', clientId: 'n4', clientName: 'คุณแม่พลอย', billing: { mode: 'per_unit', rate: 400 }, label: 'อังกฤษ', days: [1, 4], time: '14:00', augDone: 5, sepDoneBeforeToday: 1 },
    { id: 'm5', name: 'น้องจูน', clientId: 'n5', clientName: 'คุณพ่อจูน', billing: { mode: 'per_unit', rate: 400 }, label: 'คณิต', days: [2, 6], time: '13:00', augDone: 6, sepDoneBeforeToday: 0 },
    { id: 'm6', name: 'น้องปาล์ม', clientId: 'n6', clientName: 'คุณแม่ปาล์ม', billing: { mode: 'per_unit', rate: 500 }, label: 'ชีวะ', days: [3, 6], time: '18:00', augDone: 4, sepDoneBeforeToday: 0 },
    { id: 'm7', name: 'น้องเฟิร์น', clientId: 'n7', clientName: 'คุณแม่เฟิร์น', billing: { mode: 'flat_monthly', amount: 3000 }, label: 'อังกฤษ', days: [1, 5], time: '10:00', augDone: 8, sepDoneBeforeToday: 1 },
    { id: 'm8', name: 'น้องกิ๊ฟ', clientId: 'n8', clientName: 'คุณแม่กิ๊ฟ', billing: { mode: 'flat_monthly', amount: 2600 }, label: 'คณิต', days: [4, 6], time: '11:00', augDone: 7, sepDoneBeforeToday: 0 },
  ]
  let s = buildFromPlans(plans, 'monthly-heavy')
  s = applySeedInvoices(s, [
    { subjectId: 'm1', period: '2025-08', total: 3200, qty: 8, unitPrice: 400, desc: 'คณิต ส.ค. 2568 — 8 × 400', status: 'paid', sentAt: '2025-08-31', paidAt: '2025-08-31' },
    { subjectId: 'm2', period: '2025-08', total: 3000, qty: 6, unitPrice: 500, desc: 'ฟิสิกส์ ส.ค. 2568 — 6 × 500', status: 'sent', sentAt: '2025-08-29', dueAt: '2025-09-01' },
    { subjectId: 'm3', period: '2025-08', total: 3150, qty: 7, unitPrice: 450, desc: 'เคมี ส.ค. 2568 — 7 × 450', status: 'sent', sentAt: '2025-08-25', dueAt: '2025-08-28' },
    { subjectId: 'm4', period: '2025-08', total: 2000, qty: 5, unitPrice: 400, desc: 'อังกฤษ ส.ค. 2568 — 5 × 400', status: 'sent', sentAt: '2025-08-18', dueAt: '2025-08-21' },
    { subjectId: 'm7', period: '2025-08', total: 3000, qty: 8, unitPrice: 3000, desc: 'อังกฤษ ส.ค. 2568 (เหมา)', status: 'paid', sentAt: '2025-08-31', paidAt: '2025-08-31' },
  ])
  return markOverdue(s)
}

function scenarioEmpty(): AppState {
  return { ...emptyBase(), scenarioId: 'empty', onboarded: false, today: TODAY }
}

const BUILDERS: Record<ScenarioId, () => AppState> = {
  default: scenarioDefault,
  'package-heavy': scenarioPackageHeavy,
  'monthly-heavy': scenarioMonthlyHeavy,
  empty: scenarioEmpty,
}

export const isScenario = (v: string | null): v is ScenarioId =>
  !!v && (SCENARIOS as readonly string[]).includes(v)

/**
 * เริ่มใช้จริง — ไม่มีข้อมูลสมมติแม้แต่แถวเดียว และวันเดินตามเครื่อง
 * ชื่อผู้ให้บริการต้องว่าง ไม่ใช่ชื่อสมมติของเดโม
 * ไม่งั้นครูอาจส่งบิลออกไปในนาม "ครูเบนซ์" โดยไม่ทันสังเกต
 */
export function buildReal(keep?: { name: string; promptpayId: string }): AppState {
  const base = emptyBase()
  const fromDemo = keep?.name === base.provider.name
  return {
    ...base,
    mode: 'real',
    scenarioId: 'real',
    onboarded: false,
    today: todayISO(),
    provider: keep && !fromDemo ? keep : { name: '', promptpayId: '' },
  }
}

export function buildScenario(id: string): AppState {
  const key: ScenarioId = isScenario(id) ? id : 'default'
  return BUILDERS[key]()
}
