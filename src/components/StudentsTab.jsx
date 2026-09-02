import { useMemo, useState } from 'react'
import { TYPE_LABEL, LIFE_LABEL, MODE_LABEL } from '../data.js'
import { billOf, billingOf, initialOf, baht, packState } from '../state.js'
import { TH_DAY_SHORT } from '../dates.js'
import { EmptyState } from './Field.jsx'

const FILTERS = [
  { id: 'all', label: 'ทั้งหมด' },
  { id: 'monthly', label: 'รายเดือน' },
  { id: 'package', label: 'แพ็ก' },
  { id: 'lowpack', label: 'ใกล้หมดแพ็ก' },
]

export default function StudentsTab({ state, period, onOpen, onAdd }) {
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('all')

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return state.students.filter((s) => {
      const mode = billingOf(s, state).mode
      const pk = packState(s)
      if (filter === 'monthly' && mode === 'package') return false
      if (filter === 'package' && mode !== 'package') return false
      if (filter === 'lowpack' && !(pk && pk.state !== 'ok')) return false
      if (!needle) return true
      return [s.nick, s.parent, s.subject, s.grade].join(' ').toLowerCase().includes(needle)
    })
  }, [state, q, filter])

  const active = state.students.filter((s) => s.life === 'active').length

  if (state.students.length === 0) {
    return (
      <div className="home">
        <EmptyState
          icon="👋"
          title="ยังไม่มีนักเรียน"
          desc="เพิ่มคนแรก เลือกโหมดการจ่าย (รายครั้ง เหมา หรือแพ็ก) แล้วระบบจะนับและคิดเงินให้เอง"
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

        <div className="chips" role="group" aria-label="กรองตามโหมดการจ่าย" style={{ marginTop: 12 }}>
          {FILTERS.map((f) => (
            <button key={f.id} className={`chip${filter === f.id ? ' chip--on' : ''}`}
              aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>
              {f.label}
            </button>
          ))}
        </div>

        {state.students.length > 5 && (
          <input className="search" type="search" value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="ค้นหาชื่อ" aria-label="ค้นหานักเรียน" style={{ marginTop: 10 }} />
        )}

        {shown.length === 0 ? (
          <p className="home__quiet" style={{ marginTop: 16 }}>ไม่มีนักเรียนในกลุ่มนี้</p>
        ) : (
          <ul className="rows2" style={{ marginTop: 12 }}>
            {shown.map((s) => {
              const bill = billOf(s, state, period)
              const b = billingOf(s, state)
              const pk = packState(s)
              const days = (s.schedule || []).map((sl) => TH_DAY_SHORT[sl.day]).join(' ')
              return (
                <li className="row2" key={s.id}>
                  <button className="row2__person" onClick={() => onOpen(s)}>
                    <span className={`av av--${bill.status === 'package' ? (pk.state === 'over' ? 'overdue' : pk.state === 'ok' ? 'paid' : 'pending') : bill.status}`}>
                      {initialOf(s.nick)}
                    </span>
                    <span className="row2__main">
                      <span className="row2__n">
                        {s.nick}
                        {s.life !== 'active' && <span className="stu__tag">{LIFE_LABEL[s.life]}</span>}
                      </span>
                      <span className="row2__why">
                        {s.grade} · {s.subject} · {MODE_LABEL[b.mode]}{days && ` · ${days}`}
                      </span>
                      {pk && (
                        <span className={`packbar packbar--${pk.state}`} aria-hidden="true">
                          <i style={{ width: `${Math.min(100, (pk.used / pk.total) * 100)}%` }} />
                        </span>
                      )}
                    </span>
                    <span className="row2__side">
                      {pk ? (
                        <>
                          <span className={`row2__times${pk.state !== 'ok' ? ' is-low' : ''}`}>
                            {pk.over > 0 ? `เกิน ${pk.over}` : `เหลือ ${pk.left}/${pk.total}`}
                          </span>
                          <span className="row2__why">แพ็ก {baht(pk.price)}</span>
                        </>
                      ) : b.mode === 'monthly_flat' ? (
                        <>
                          <span className="row2__times">{bill.times} ครั้ง</span>
                          <span className="row2__why">เหมา {baht(b.amount)}</span>
                        </>
                      ) : (
                        <>
                          <span className="row2__times">{bill.times}/{s.plan}</span>
                          <span className="row2__why">{baht(bill.amount)}</span>
                        </>
                      )}
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
