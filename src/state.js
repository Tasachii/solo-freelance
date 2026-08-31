import { useCallback, useEffect, useState } from 'react'
import { STUDENTS, SESSIONS, RATES } from './data.js'

export const STORAGE_KEY = 'tutordai-demo-v1'

export function freshState() {
  return {
    // จำนวนครั้งที่เรียนไปแล้วเดือนนี้ (เช็คชื่อแล้ว +1)
    attended: Object.fromEntries(STUDENTS.map((s) => [s.id, s.attended])),
    // paid | pending | overdue
    status: Object.fromEntries(STUDENTS.map((s) => [s.id, s.status])),
    // todo | attended | leave
    sessions: Object.fromEntries(SESSIONS.map((c) => [c.id, 'todo'])),
    billsSent: false,
    reminded: [],
    progressSent: [],
  }
}

function load() {
  const base = freshState()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return base
    const saved = JSON.parse(raw)
    // merge ทีละชั้น กัน state เก่าที่ schema ไม่ตรงทำแอปพัง
    return {
      ...base,
      ...saved,
      attended: { ...base.attended, ...(saved.attended || {}) },
      status: { ...base.status, ...(saved.status || {}) },
      sessions: { ...base.sessions, ...(saved.sessions || {}) },
      reminded: Array.isArray(saved.reminded) ? saved.reminded : [],
      progressSent: Array.isArray(saved.progressSent) ? saved.progressSent : [],
    }
  } catch {
    return base
  }
}

export function useDemoState() {
  const [state, setState] = useState(load)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      /* โหมดส่วนตัวของ Safari เขียนไม่ได้ — ปล่อยผ่าน แอปยังใช้ได้ปกติ */
    }
  }, [state])

  const reset = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* ignore */
    }
    setState(freshState())
  }, [])

  return [state, setState, reset]
}

// ── การคำนวณเงิน ทุกจุดในแอปใช้ตรงนี้ที่เดียว ──

export const rateOf = (student) => RATES[student.type]

export function billOf(student, state) {
  const times = state.attended[student.id] ?? 0
  const rate = rateOf(student)
  return { times, rate, amount: times * rate, status: state.status[student.id] }
}

export function totals(state) {
  let total = 0
  let paid = 0
  for (const s of STUDENTS) {
    const { amount, status } = billOf(s, state)
    total += amount
    if (status === 'paid') paid += amount
  }
  return { total, paid, outstanding: total - paid }
}

const nf = new Intl.NumberFormat('en-US')
export const baht = (n) => nf.format(Math.round(n))

/** ตัวอักษรแรกของชื่อเล่นสำหรับ avatar — ตัด "น้อง" และสระหน้าออกให้เหลือพยัญชนะ */
export function initialOf(nick) {
  const name = nick.replace(/^น้อง/, '')
  const stripped = name.replace(/^[เแโใไ]/, '')
  return (stripped || name).charAt(0)
}
