import type { AppState, Client, ServiceUnit, Subject } from '../core/types'
import { PROMPTPAY_DISPLAY, PROVIDER_NAME } from '../platform/config'
import { addDays, iso, parseISO, weekday } from '../core/format'

export const TODAY = '2025-09-02' // อังคาร — เดโมล็อกวันไว้
const START = '2025-08-01'
const END = '2025-09-30'

export const emptyBase = (): AppState => ({
  schemaVersion: 5, revision: 0, mode: 'demo', professionId: 'tutor', scenarioId: 'empty',
  provider: { name: PROVIDER_NAME, promptpayId: PROMPTPAY_DISPLAY },
  today: TODAY,
  clients: [], subjects: [], units: [], completions: [],
  invoices: [], payments: [], receipts: [], messages: [], chats: [],
  waitlist: [], events: [], counters: { receipt: 0, invoice: 0 }, onboarded: true,
})

/** ทุกวันที่ระหว่าง START..END ที่ตรงกับวันในสัปดาห์ */
function datesOn(days: number[]): string[] {
  const out: string[] = []
  let d = START
  while (d <= END) {
    if (days.includes(weekday(d))) out.push(d)
    d = addDays(d, 1)
  }
  return out
}

export interface SubjectPlan {
  id: string; name: string; clientId: string; clientName: string
  billing: Subject['billing']; label: string
  days: number[]; time: string
  /** จำนวน completion ที่ต้องเกิดในเดือน (ล็อกให้ตัวเลขตรง spec) */
  augDone: number; sepDoneBeforeToday: number
  /** มีคาบวันนี้ไหม และเช็คไปแล้วหรือยัง */
  todayUnit?: { time: string; done: boolean }
}

export function buildFromPlans(plans: SubjectPlan[], scenarioId: string): AppState {
  const s = emptyBase()
  s.scenarioId = scenarioId
  const clients = new Map<string, Client>()
  const subjects: Subject[] = []
  const units: ServiceUnit[] = []
  const completions: AppState['completions'] = []

  for (const p of plans) {
    if (!clients.has(p.clientId)) clients.set(p.clientId, { id: p.clientId, name: p.clientName, lineId: `@${p.clientId}` })
    subjects.push({
      id: p.id, name: p.name, clientId: p.clientId, billing: p.billing,
      label: p.label, active: true, createdAt: START,
    })

    const dates = datesOn(p.days)
    const mine: ServiceUnit[] = dates.map((d, i) => ({
      id: `u-${p.id}-${i}`, subjectId: p.id, scheduledAt: d, time: p.time, durationMin: 60, label: p.label,
    }))
    // คาบวันนี้ที่ spec บังคับว่าต้องมี แม้ pattern ไม่ตรงวัน
    if (p.todayUnit && !mine.some((u) => u.scheduledAt === TODAY)) {
      mine.push({ id: `u-${p.id}-today`, subjectId: p.id, scheduledAt: TODAY, time: p.todayUnit.time, durationMin: 60, label: p.label })
    }
    units.push(...mine)

    const aug = mine.filter((u) => u.scheduledAt.startsWith('2025-08')).sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
    for (const u of aug.slice(0, p.augDone)) completions.push({ unitId: u.id, completedAt: u.scheduledAt })

    const sepBefore = mine.filter((u) => u.scheduledAt.startsWith('2025-09') && u.scheduledAt < TODAY)
      .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
    for (const u of sepBefore.slice(0, p.sepDoneBeforeToday)) completions.push({ unitId: u.id, completedAt: u.scheduledAt })

    if (p.todayUnit?.done) {
      const t = mine.find((u) => u.scheduledAt === TODAY)
      if (t) completions.push({ unitId: t.id, completedAt: TODAY })
    }
  }

  s.clients = [...clients.values()]
  s.subjects = subjects
  s.units = units.sort((a, b) => (a.scheduledAt + a.time).localeCompare(b.scheduledAt + b.time))
  s.completions = completions
  return s
}

export const isoOf = iso
export const parse = parseISO
