import { useCallback, useEffect, useState } from 'react'
import {
  DEFAULT_SETTINGS, SEED_STUDENTS, SEED_SESSIONS, SEED_EXPENSES,
  seedRecords, TODAY,
} from './data.js'

export const STORAGE_KEY = 'tutordai-demo-v1'
const SCHEMA = 2

const clone = (v) => JSON.parse(JSON.stringify(v))

export function freshState() {
  const students = SEED_STUDENTS.map(({ status, ...rest }) => clone(rest))
  const status = Object.fromEntries(SEED_STUDENTS.map((s) => [s.id, s.status]))
  return {
    v: SCHEMA,
    settings: clone(DEFAULT_SETTINGS),
    students,
    status,
    sessions: clone(SEED_SESSIONS),
    sessionState: Object.fromEntries(SEED_SESSIONS.map((c) => [c.id, 'todo'])),
    records: seedRecords(),
    expenses: clone(SEED_EXPENSES),
    activity: [],
    reminded: {},
    billsSent: false,
  }
}

/** เริ่มจากศูนย์ — เก็บการตั้งค่าไว้ แต่ล้างข้อมูลนักเรียนทั้งหมด
    เพื่อให้ติวเตอร์ที่มาลองใส่ข้อมูลของตัวเองได้จริง */
export function emptyState(settings) {
  return {
    v: SCHEMA,
    settings: clone(settings || DEFAULT_SETTINGS),
    students: [],
    status: {},
    sessions: [],
    sessionState: {},
    records: {},
    expenses: [],
    activity: [],
    reminded: {},
    billsSent: false,
  }
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return freshState()
    const saved = JSON.parse(raw)
    // schema เปลี่ยน = ทิ้งของเก่า ปลอดภัยกว่าพยายาม merge ให้ครบทุกชั้น
    if (saved?.v !== SCHEMA) return freshState()
    return { ...freshState(), ...saved, settings: { ...clone(DEFAULT_SETTINGS), ...(saved.settings || {}) } }
  } catch {
    return freshState()
  }
}

export function useDemoState() {
  const [state, setState] = useState(load)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      /* โหมดส่วนตัวเขียนไม่ได้ — แอปยังใช้ได้ในรอบนี้ */
    }
  }, [state])

  const reset = useCallback(() => setState(freshState()), [])
  const clear = useCallback(() => setState((s) => emptyState(s.settings)), [])

  return { state, setState, reset, clear }
}

// ── การคำนวณเงิน ทุกจุดในแอปเรียกผ่านตรงนี้ที่เดียว ──

export const rateOf = (student, state) =>
  student.rate ?? state.settings.rates[student.type] ?? 0

export const recordsOf = (state, id) => state.records[id] || []

export const timesOf = (state, id) =>
  recordsOf(state, id).filter((r) => r.kind === 'attended').length

export function billOf(student, state) {
  const times = timesOf(state, student.id)
  const rate = rateOf(student, state)
  return { times, rate, amount: times * rate, status: state.status[student.id] || 'pending' }
}

export function totals(state) {
  let total = 0
  let paid = 0
  for (const s of state.students) {
    const { amount, status } = billOf(s, state)
    total += amount
    if (status === 'paid') paid += amount
  }
  return { total, paid, outstanding: total - paid }
}

export const expenseTotal = (state) =>
  state.expenses.reduce((n, e) => n + (Number(e.amount) || 0), 0)

/** เหลือจริง = เงินที่เข้าบัญชีแล้ว ลบรายจ่าย (ไม่นับเงินที่ยังไม่เข้า) */
export function netMonth(state) {
  const { paid } = totals(state)
  return paid - expenseTotal(state)
}

/** นักเรียนที่ควรดูเป็นพิเศษ — ค้างจ่าย หรือเรียนไม่ครบแผน */
export function needsAttention(state) {
  const out = []
  for (const s of state.students) {
    if (s.life !== 'active') continue
    const { times, status, amount } = billOf(s, state)
    if (status === 'overdue') out.push({ student: s, why: `ค้างจ่าย ${amount.toLocaleString('en-US')} บาท`, tone: 'bad' })
    else if (s.plan - times >= 2) out.push({ student: s, why: `เรียน ${times}/${s.plan} ครั้ง ต่ำกว่าแผน`, tone: 'warn' })
  }
  return out
}

const nf = new Intl.NumberFormat('en-US')
export const baht = (n) => nf.format(Math.round(Number(n) || 0))

/** ตัวอักษรแรกของชื่อเล่นสำหรับ avatar — ตัด "น้อง" และสระหน้าออก */
export function initialOf(nick) {
  const name = String(nick || '').replace(/^น้อง/, '')
  const stripped = name.replace(/^[เแโใไ]/, '')
  return (stripped || name).charAt(0) || '?'
}

export const uid = (prefix) =>
  `${prefix}-${Math.random().toString(36).slice(2, 8)}${(globalThis.performance?.now() ?? 0).toFixed(0)}`

export function logged(state, text) {
  return [{ id: uid('a'), at: TODAY, text }, ...state.activity].slice(0, 40)
}

// ── export CSV ให้ติวเตอร์เอาข้อมูลออกได้ ไม่ล็อกไว้กับเรา ──
export function buildCsv(state) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const lines = ['ประเภท,ชื่อ,รายละเอียด,จำนวนครั้ง,เรทต่อครั้ง,ยอด,สถานะ']
  for (const s of state.students) {
    const { times, rate, amount, status } = billOf(s, state)
    lines.push(
      ['นักเรียน', s.nick, `${s.grade} ${s.subject} (${s.parent})`, times, rate, amount, status]
        .map(esc)
        .join(','),
    )
  }
  for (const e of state.expenses) {
    lines.push(['รายจ่าย', e.category, `${e.date} ${e.note}`, '', '', -e.amount, ''].map(esc).join(','))
  }
  return '﻿' + lines.join('\n')
}
