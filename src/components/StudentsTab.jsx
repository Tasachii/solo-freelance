import { useMemo, useState } from 'react'
import { TYPE_LABEL, STATUS_LABEL, LIFE_LABEL } from '../data.js'
import { billOf, initialOf } from '../state.js'
import { EmptyState } from './Field.jsx'

const FILTERS = [
  { id: 'all', label: 'ทั้งหมด' },
  { id: 'overdue', label: 'ค้างจ่าย' },
  { id: 'pending', label: 'รอสลิป' },
  { id: 'paid', label: 'จ่ายแล้ว' },
]

export default function StudentsTab({ state, period, onOpen, onAdd, desk }) {
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('all')

  const taught = state.students.reduce((n, s) => n + billOf(s, state, period).times, 0)

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return state.students.filter((s) => {
      if (filter !== 'all' && billOf(s, state, period).status !== filter) return false
      if (!needle) return true
      return [s.nick, s.parent, s.subject, s.grade].join(' ').toLowerCase().includes(needle)
    })
  }, [state, period, q, filter])

  const counts = useMemo(() => {
    const c = { all: state.students.length, overdue: 0, pending: 0, paid: 0 }
    for (const s of state.students) {
      const st = billOf(s, state, period).status
      c[st] = (c[st] || 0) + 1
    }
    return c
  }, [state, period])

  const cards = shown.map((s, i) => {
    const { times, status } = billOf(s, state, period)
    const pct = s.plan > 0 ? Math.min(100, Math.round((times / s.plan) * 100)) : 0
    return (
      <button className={`card stu rise d${Math.min(i + 1, 6)}`} key={s.id} onClick={() => onOpen(s)}>
        <span className={`av av--${status}`}>{initialOf(s.nick)}</span>
        <span className="stu__main">
          <span className="stu__row1">
            <span className="stu__name">
              {s.nick}
              {s.life !== 'active' && <span className="stu__tag">{LIFE_LABEL[s.life]}</span>}
            </span>
            <span className={`pill pill--${status}`}>{STATUS_LABEL[status]}</span>
          </span>
          <span className="stu__meta">
            {s.grade} · {s.subject} · {TYPE_LABEL[s.type]} · {s.parent}
          </span>
          <span className="stu__prog">
            <span className={`bar${times >= s.plan ? ' bar--full' : ''}`}>
              <i style={{ width: `${pct}%` }} />
            </span>
            <span className="stu__cnt">{times}/{s.plan} ครั้ง</span>
          </span>
        </span>
      </button>
    )
  })

  const controls = (
    <div className="filters">
      <input
        className="search"
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="ค้นหาชื่อนักเรียน ผู้ปกครอง หรือวิชา"
        aria-label="ค้นหานักเรียน"
      />
      <div className="chips" role="group" aria-label="กรองตามสถานะ">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            className={`chip${filter === f.id ? ' chip--on' : ''}`}
            aria-pressed={filter === f.id}
            onClick={() => setFilter(f.id)}
          >
            {f.label} {counts[f.id] ? <b>{counts[f.id]}</b> : null}
          </button>
        ))}
      </div>
    </div>
  )

  let body
  if (state.students.length === 0) {
    body = (
      <div className="card">
        <EmptyState
          icon="👋"
          title="ยังไม่มีนักเรียน"
          desc="เพิ่มนักเรียนคนแรก แล้วระบบจะนับครั้งเรียนและคิดเงินสิ้นเดือนให้อัตโนมัติ"
          action={<button className="btn btn--cta" onClick={onAdd}>+ เพิ่มนักเรียน</button>}
        />
      </div>
    )
  } else if (shown.length === 0) {
    body = (
      <div className="card">
        <EmptyState
          icon="🔍"
          title="ไม่พบนักเรียนที่ค้นหา"
          desc="ลองเปลี่ยนคำค้น หรือล้างตัวกรองดูครับ"
          action={
            <button className="btn btn--ghost" onClick={() => { setQ(''); setFilter('all') }}>
              ล้างการค้นหา
            </button>
          }
        />
      </div>
    )
  } else {
    body = desk ? <div className="desk__grid3">{cards}</div> : <>{cards}</>
  }

  if (desk) {
    return (
      <>
        <div className="desk__topline">
          <p className="desk__meta">
            {state.students.length} คน · เดือนนี้สอนแล้ว {taught} ครั้ง
          </p>
          <button className="btn btn--ink btn--sm" onClick={onAdd}>+ เพิ่มนักเรียน</button>
        </div>
        {state.students.length > 0 && controls}
        {body}
      </>
    )
  }

  return (
    <div className="pane">
      <div className="card sum rise">
        <div>
          <div className="sum__k">นักเรียนที่ดูแลอยู่</div>
          <div className="sum__v">{state.students.length} คน</div>
        </div>
        <button className="btn btn--ink btn--sm" onClick={onAdd}>+ เพิ่ม</button>
      </div>
      {state.students.length > 0 && controls}
      {body}
    </div>
  )
}
