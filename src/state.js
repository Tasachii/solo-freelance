import { useCallback, useEffect, useRef, useState } from 'react'
import {
  DEFAULT_SETTINGS, SEED_STUDENTS, SEED_EXPENSES, SEED_SLIPS, SEED_INBOX, SEED_AUTOLOG,
  seedRecords, TODAY, TODAY_PERIOD, UNDO_LIMIT,
} from './data.js'
import { periodOf, shiftPeriod, weekday, shortDate, longMonth } from './dates.js'

// คงคีย์เดิมไว้ตอนเปลี่ยนชื่อแบรนด์ ไม่งั้นข้อมูลของคนที่เคยกดเล่นจะหายหมด
export const STORAGE_KEY = 'tutordai-demo-v1'
const SCHEMA = 3

const clone = (v) => JSON.parse(JSON.stringify(v))
export const uid = (p) => `${p}-${Math.random().toString(36).slice(2, 9)}`

export function freshState() {
  const students = SEED_STUDENTS.map(({ status, ...rest }) => clone(rest))
  const records = seedRecords()
  // เดือนก่อนๆ ถือว่าเก็บเงินครบแล้ว เดือนปัจจุบันใช้สถานะจากบรีฟ
  const status = {}
  const received = {}
  const amountIn = (id, period) =>
    (records[id] || []).filter((r) => periodOf(r.date) === period).reduce((n, r) => n + r.rate, 0)

  for (let i = 5; i >= 1; i--) {
    const p = shiftPeriod(TODAY_PERIOD, -i)
    status[p] = Object.fromEntries(SEED_STUDENTS.map((s) => [s.id, 'paid']))
    received[p] = Object.fromEntries(SEED_STUDENTS.map((s) => [s.id, amountIn(s.id, p)]))
  }
  status[TODAY_PERIOD] = Object.fromEntries(SEED_STUDENTS.map((s) => [s.id, s.status]))
  received[TODAY_PERIOD] = Object.fromEntries(
    SEED_STUDENTS.map((s) => [s.id, s.status === 'paid' ? amountIn(s.id, TODAY_PERIOD) : 0]),
  )

  return {
    v: SCHEMA,
    settings: clone(DEFAULT_SETTINGS),
    students,
    records,
    status,
    received,
    sessionState: {},
    extraSessions: [],
    expenses: clone(SEED_EXPENSES),
    slips: clone(SEED_SLIPS),
    inbox: clone(SEED_INBOX),
    autoLog: clone(SEED_AUTOLOG),
    outbox: [],
    makeups: {},
    activity: [],
    reminded: {},
    history: [],
  }
}

export function emptyState(settings) {
  return {
    ...freshState(),
    settings: clone(settings || DEFAULT_SETTINGS),
    students: [], records: {}, status: {}, received: {}, sessionState: {}, extraSessions: [],
    expenses: [], slips: {}, inbox: [], autoLog: [], outbox: [], makeups: {}, activity: [], reminded: {}, history: [],
  }
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return freshState()
    const saved = JSON.parse(raw)
    if (saved?.v !== SCHEMA) return freshState()
    return {
      ...freshState(), ...saved,
      settings: { ...clone(DEFAULT_SETTINGS), ...(saved.settings || {}) },
    }
  } catch {
    return freshState()
  }
}

/** เขียน localStorage แบบหน่วง กันการพิมพ์ในหน้าตั้งค่าทำให้เขียนทุกตัวอักษร */
function useDebouncedPersist(state) {
  const timer = useRef(null)
  useEffect(() => {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)) } catch { /* โหมดส่วนตัว */ }
    }, 250)
    return () => clearTimeout(timer.current)
  }, [state])
}

export function useDemoState() {
  const [state, setState] = useState(load)
  useDebouncedPersist(state)

  /** ทุกการเปลี่ยนแปลงผ่านตรงนี้ เพื่อให้ย้อนได้หลายขั้นและมีประวัติ */
  const commit = useCallback((mutate, label) => {
    setState((prev) => {
      const next = mutate(prev)
      if (next === prev) return prev
      const snap = { ...prev }
      delete snap.history
      const entry = { id: uid('h'), label, at: new Date().toISOString(), snap }
      return { ...next, history: [entry, ...(prev.history || [])].slice(0, UNDO_LIMIT) }
    })
  }, [])

  /** ย้อนกลับ n+1 ขั้น (n=0 คือขั้นล่าสุด) */
  const undo = useCallback((n = 0) => {
    let label = null
    setState((prev) => {
      const hist = prev.history || []
      if (!hist[n]) return prev
      label = hist[n].label
      return { ...clone(hist[n].snap), history: hist.slice(n + 1) }
    })
    return label
  }, [])

  const reset = useCallback(() => setState(freshState()), [])
  const clear = useCallback(() => setState((s) => emptyState(s.settings)), [])
  const replace = useCallback((next) => setState(next), [])

  return { state, setState, commit, undo, reset, clear, replace }
}

// ═══ ตัวเลือกข้อมูล ═══════════════════════════════════════════════

export const rateOf = (student, state) =>
  student.rate ?? state.settings.rates[student.type] ?? 0

export const recordsOf = (state, id) => state.records[id] || []

export const recordsIn = (state, id, period) =>
  recordsOf(state, id).filter((r) => periodOf(r.date) === period && r.kind === 'attended')

/** ยอดคิดจากราคาที่ติดมากับแต่ละครั้ง ไม่ใช่ราคาปัจจุบัน — ขึ้นราคาแล้วบิลเก่าจึงไม่ขยับ */
/** เพิ่มครั้งเรียน — สถานะจ่ายคำนวณจากยอดที่รับจริงเทียบยอดบิล
    จึงกลายเป็น "จ่ายบางส่วน" เองโดยไม่ต้องไปแก้ธงใดๆ */
export function addRecord(s, studentId, record) {
  return { ...s, records: { ...s.records, [studentId]: [...(s.records[studentId] || []), record] } }
}

/** บันทึกว่ารับเงินมาเท่าไหร่ */
export function setReceived(s, period, studentId, amount) {
  return {
    ...s,
    received: { ...s.received, [period]: { ...(s.received?.[period] || {}), [studentId]: amount } },
    status: { ...s.status, [period]: { ...(s.status?.[period] || {}), [studentId]: amount > 0 ? 'paid' : 'pending' } },
  }
}

export const receivedOf = (state, period, id) => state.received?.[period]?.[id] ?? 0

export const packLeft = (student) =>
  student.pack ? Math.max(0, student.pack.size - student.pack.used) : null

export function billOf(student, state, period) {
  const list = recordsIn(state, student.id, period)
  // แพ็กจ่ายล่วงหน้า: เก็บเงินไปแล้วตอนซื้อแพ็ก จึงไม่มีบิลรายเดือน
  if (student.pack) {
    return { times: list.length, amount: 0, uniformRate: null, mixedRates: false,
      status: 'prepaid', packLeft: packLeft(student) }
  }
  const amount = list.reduce((n, r) => n + (r.rate ?? rateOf(student, state)), 0)
  const rates = [...new Set(list.map((r) => r.rate))]
  return {
    times: list.length,
    amount,
    uniformRate: rates.length === 1 ? rates[0] : null,
    mixedRates: rates.length > 1,
    status: statusOf(state, period, student),
  }
}

export function statusOf(state, period, student) {
  if (student.pack) return 'prepaid'
  const list = recordsIn(state, student.id, period)
  const amount = list.reduce((n, r) => n + (r.rate ?? rateOf(student, state)), 0)
  const got = receivedOf(state, period, student.id)

  if (amount === 0 && got === 0) return 'none'
  if (got >= amount && amount > 0) return 'paid'
  if (got > 0) return 'partial'          // จ่ายมาบางส่วน — ยังค้างส่วนต่าง
  return state.status?.[period]?.[student.id] || 'pending'
}

export function totals(state, period) {
  let total = 0, paid = 0
  for (const s of state.students) {
    const { amount } = billOf(s, state, period)
    total += amount
    paid += Math.min(receivedOf(state, period, s.id), amount)
  }
  return { total, paid, outstanding: total - paid }
}

export const expensesIn = (state, period) =>
  state.expenses.filter((e) => periodOf(e.date) === period)

export const expenseTotal = (state, period) =>
  expensesIn(state, period).reduce((n, e) => n + (Number(e.amount) || 0), 0)

export function netMonth(state, period) {
  return totals(state, period).paid - expenseTotal(state, period)
}

/** รายรับจริงของ 6 เดือนล่าสุด คำนวณจากข้อมูลจริงทั้งหมด ไม่ใช่ตัวเลข mock */
export function incomeSeries(state, period, months = 6) {
  const out = []
  for (let i = months - 1; i >= 0; i--) {
    const p = shiftPeriod(period, -i)
    out.push({ period: p, amount: totals(state, p).total })
  }
  return out
}

/** คาบสอนของวันที่กำหนด สร้างจากตารางประจำสัปดาห์ + คาบเสริมที่เพิ่มเอง */
export function sessionsOn(state, date) {
  const day = weekday(date)
  const fromSchedule = state.students
    .filter((s) => s.life === 'active')
    .flatMap((s) =>
      (s.schedule || [])
        .filter((sl) => sl.day === day)
        .map((sl) => ({
          id: `${date}|${s.id}|${sl.time}`,
          date, time: sl.time, studentId: s.id,
          subject: s.subject, grade: s.grade, type: s.type,
        })),
    )
  const extra = (state.extraSessions || [])
    .filter((e) => e.date === date)
    .map((e) => {
      const s = state.students.find((x) => x.id === e.studentId)
      return s && { id: e.id, date, time: e.time, studentId: s.id, subject: s.subject, grade: s.grade, type: s.type, extra: true }
    })
    .filter(Boolean)
  return [...fromSchedule, ...extra].sort((a, b) => a.time.localeCompare(b.time))
}

/** ตารางทั้งสัปดาห์ — ระบบจำแทนว่าวันไหนสอนใคร ไม่ต้องจำเอง */
export function weekSchedule(state) {
  const days = Array.from({ length: 7 }, () => [])
  for (const st of state.students) {
    if (st.life !== 'active') continue
    for (const sl of st.schedule || []) {
      if (days[sl.day]) days[sl.day].push({ time: sl.time, student: st })
    }
  }
  return days.map((list) => list.sort((a, b) => a.time.localeCompare(b.time)))
}

/** คาบชดเชยของเดือนนั้น แยกตามนักเรียน */
export function makeupsIn(state, period) {
  const out = {}
  for (const m of Object.values(state.makeups || {})) {
    if (periodOf(m.date) !== period) continue
    ;(out[m.studentId] ||= []).push(m.date)
  }
  return out
}

/** นักเรียนที่ควรดูเป็นพิเศษ — ไม่นับคนที่เพิ่งเพิ่มเข้ามาและยังไม่เริ่มเรียน */
export function needsAttention(state, period) {
  const out = []
  for (const s of state.students) {
    if (s.life !== 'active') continue
    const { times, status, amount } = billOf(s, state, period)
    if (s.pack && packLeft(s) <= 3) {
      out.push({ student: s, why: `ใกล้หมดแพ็ก เหลือ ${packLeft(s)}/${s.pack.size} ครั้ง`, tone: 'warn' })
    } else if (status === 'overdue') {
      out.push({ student: s, why: `ค้างจ่าย ${baht(amount)} บาท`, tone: 'bad' })
    } else if (times > 0 && s.plan - times >= 2) {
      out.push({ student: s, why: `เรียน ${times}/${s.plan} ครั้ง ต่ำกว่าแผน`, tone: 'warn' })
    }
  }
  return out
}

/** นาทีที่ระบบทำแทนไปแล้ว — ทำให้ automation จับต้องได้เป็นตัวเลข */
export function minutesSaved(state) {
  return (state.autoLog || []).reduce((n, a) => n + (a.minutes || 0), 0)
}

export function humanMinutes(mins) {
  if (mins < 60) return `${mins} นาที`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m ? `${h} ชั่วโมง ${m} นาที` : `${h} ชั่วโมง`
}

/** สิ่งที่ยังต้องให้คนตัดสิน — ระบบจัดการเองไม่ได้จริงๆ เท่านั้น */
export function openTasks(state, period) {
  const tasks = []
  const sessions = sessionsOn(state, TODAY)
  const left = sessions.filter((c) => !state.sessionState[c.id] || state.sessionState[c.id] === 'todo')
  if (left.length) {
    tasks.push({ id: 'checkin', kind: 'checkin', count: left.length,
      title: `เช็คชื่อ ${left.length} คาบวันนี้`, why: 'ระบบนับครั้งให้ แต่ต้องรู้ก่อนว่าใครมา' })
  }
  for (const s of state.students) {
    const slip = state.slips?.[s.id]
    if (slip && slip.match === false && statusOf(state, period, s) !== 'paid') {
      const { amount } = billOf(s, state, period)
      tasks.push({ id: `slip-${s.id}`, kind: 'slip', student: s,
        title: `${s.nick}: สลิปยอดไม่ตรง`, why: `โอนมา ${baht(slip.paid)} จาก ${baht(amount)} บาท` })
    }
  }
  const stuck = state.students.filter(
    (s) => statusOf(state, period, s) === 'overdue' &&
      (state.reminded[s.id] || 0) >= state.settings.dunning.maxTimes,
  )
  for (const s of stuck) {
    tasks.push({ id: `stuck-${s.id}`, kind: 'stuck', student: s,
      title: `${s.nick}: ทวงครบแล้วยังเงียบ`, why: 'ถึงจุดที่ควรคุยกับผู้ปกครองเอง' })
  }
  return tasks
}

const nf = new Intl.NumberFormat('en-US')
export const baht = (n) => nf.format(Math.round(Number(n) || 0))

export function initialOf(nick) {
  const name = String(nick || '').replace(/^น้อง/, '')
  const stripped = name.replace(/^[เแโใไ]/, '')
  return (stripped || name).charAt(0) || '?'
}

export function logged(state, text) {
  return [{ id: uid('a'), at: shortDate(TODAY), text }, ...state.activity].slice(0, 60)
}

export function inboxed(state, entry) {
  return [{ id: uid('i'), at: shortDate(TODAY), read: false, ...entry }, ...state.inbox].slice(0, 60)
}

// ═══ นำข้อมูลออก / กู้คืน ═════════════════════════════════════════

export function buildCsv(state, period) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const lines = [`เดือน,${longMonth(period)}`, '', 'ประเภท,ชื่อ,รายละเอียด,จำนวนครั้ง,ยอด,สถานะ']
  for (const s of state.students) {
    const { times, amount, status } = billOf(s, state, period)
    lines.push(['นักเรียน', s.nick, `${s.grade} ${s.subject} (${s.parent})`, times, amount, status].map(esc).join(','))
  }
  for (const e of expensesIn(state, period)) {
    lines.push(['รายจ่าย', e.category, `${shortDate(e.date)} ${e.note}`, '', -e.amount, ''].map(esc).join(','))
  }
  return '﻿' + lines.join('\n')
}

export function buildBackup(state) {
  const { history, ...rest } = state
  return JSON.stringify({ app: 'solo-tutor', v: SCHEMA, exportedAt: new Date().toISOString(), state: rest }, null, 2)
}

/** อ่านไฟล์สำรองกลับเข้ามา — ตรวจให้แน่ใจก่อนว่าเป็นไฟล์ของแอปนี้จริง */
export function parseBackup(text) {
  let data
  try { data = JSON.parse(text) } catch { throw new Error('ไฟล์นี้ไม่ใช่ JSON ที่อ่านได้') }
  // รับไฟล์ที่ export ไว้ก่อนเปลี่ยนชื่อแบรนด์ด้วย จะได้ไม่ทิ้งคนที่เคยสำรองไว้
  if (data?.app !== 'solo-tutor' && data?.app !== 'tutordai-demo') {
    throw new Error('ไฟล์นี้ไม่ใช่ไฟล์สำรองของ Solo Tutor')
  }
  if (data?.v !== SCHEMA) throw new Error(`ไฟล์สำรองเป็นเวอร์ชัน ${data?.v ?? '?'} แต่แอปใช้เวอร์ชัน ${SCHEMA}`)
  if (!Array.isArray(data?.state?.students)) throw new Error('ไฟล์สำรองไม่มีข้อมูลนักเรียน')
  return { ...freshState(), ...data.state, history: [] }
}
