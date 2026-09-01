import { useMemo, useState } from 'react'
import { TYPE_LABEL, LIFE_LABEL } from '../data.js'
import { billOf, initialOf, baht } from '../state.js'
import { TH_DAY_SHORT } from '../dates.js'
import { EmptyState } from './Field.jsx'

export default function StudentsTab({ state, period, onOpen, onAdd }) {
  const [q, setQ] = useState('')

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return state.students
    return state.students.filter((s) =>
      [s.nick, s.parent, s.subject, s.grade].join(' ').toLowerCase().includes(needle))
  }, [state.students, q])

  const active = state.students.filter((s) => s.life === 'active').length

  if (state.students.length === 0) {
    return (
      <div className="home">
        <EmptyState
          icon="👋"
          title="ยังไม่มีนักเรียน"
          desc="เพิ่มคนแรก ตั้งวันเรียน แล้วระบบจะนับครั้งและคิดเงินให้เอง"
          action={<button className="btn btn--cta" onClick={onAdd}>เพิ่มนักเรียน</button>}
        />
      </div>
    )
  }

  return (
    <div className="home">
      <section className="home__sec">
        <div className="home__row">
          <h2 className="home__lbl" style={{ margin: 0 }}>
            {active} คน{state.students.length !== active && ` · พัก/จบ ${state.students.length - active}`}
          </h2>
          <button className="btn btn--ink btn--sm" onClick={onAdd}>+ เพิ่มนักเรียน</button>
        </div>

        {state.students.length > 5 && (
          <input className="search" type="search" value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="ค้นหาชื่อ" aria-label="ค้นหานักเรียน" style={{ marginTop: 12 }} />
        )}

        {shown.length === 0 ? (
          <p className="home__quiet" style={{ marginTop: 16 }}>ไม่พบชื่อนี้</p>
        ) : (
          <ul className="rows2" style={{ marginTop: 12 }}>
            {shown.map((s) => {
              const { times, amount, status } = billOf(s, state, period)
              const days = (s.schedule || []).map((sl) => TH_DAY_SHORT[sl.day]).join(' ')
              return (
                <li className="row2" key={s.id}>
                  <button className="row2__person" onClick={() => onOpen(s)}>
                    <span className={`av av--${status}`}>{initialOf(s.nick)}</span>
                    <span className="row2__main">
                      <span className="row2__n">
                        {s.nick}
                        {s.life !== 'active' && <span className="stu__tag">{LIFE_LABEL[s.life]}</span>}
                      </span>
                      <span className="row2__why">
                        {s.grade} · {s.subject} · {TYPE_LABEL[s.type]}{days && ` · ${days}`}
                      </span>
                    </span>
                    <span className="row2__side">
                      <span className="row2__times">{times}/{s.plan}</span>
                      <span className="row2__why">{baht(amount)}</span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
