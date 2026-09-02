import { TODAY } from '../data.js'
import { useState } from 'react'
import { baht, sessionsOn, minutesSaved, humanMinutes, openTasks, totals, weekSchedule, packState } from '../state.js'
import { TH_DAY, weekday, parse } from '../dates.js'

const TH_MONTH = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม']

export default function HomeTab({ state, period, onCheckIn, onLeave, onEditSession, onAddSession, onTask, onSeeAll, onOpenStudent }) {
  const [view, setView] = useState('day')
  const sessions = sessionsOn(state, TODAY)
  const tasks = openTasks(state, period)
  const { outstanding } = totals(state, period)
  const mins = minutesSaved(state)
  const auto = (state.autoLog || []).slice(0, 3)
  const { d, m } = parse(TODAY)
  const find = (id) => state.students.find((s) => s.id === id)
  const otherTasks = tasks.filter((t) => t.kind !== 'checkin')
  const todayIdx = weekday(TODAY)

  return (
    <div className="home home--split">
      <header className="home__hd">
        <p className="home__hi">สวัสดี {state.settings.profile.name}</p>
        <p className="home__date">วัน{TH_DAY[weekday(TODAY)]}ที่ {d} {TH_MONTH[m - 1]}</p>
      </header>

      <div className="home__main">
      <section className="home__money">
        <b>{baht(outstanding)}</b>
        <span>ยังไม่เข้าบัญชี</span>
      </section>

      <section className="home__sec">
        <div className="home__row">
          <h2 className="home__lbl" style={{ margin: 0 }}>
            {view === 'day'
              ? (sessions.length ? `วันนี้มี ${sessions.length} คาบ` : 'วันนี้ไม่มีคาบ')
              : 'ตารางประจำสัปดาห์'}
          </h2>
          <div className="viewtog" role="group" aria-label="มุมมอง">
            <button className={view === 'day' ? 'is-on' : ''} onClick={() => setView('day')}>วันนี้</button>
            <button className={view === 'week' ? 'is-on' : ''} onClick={() => setView('week')}>สัปดาห์</button>
          </div>
        </div>
        {view === 'week' ? (
          <ul className="week">
            {weekSchedule(state).map((list, day) => (
              <li className={`week__d${day === todayIdx ? ' week__d--now' : ''}`} key={day}>
                <span className="week__day">{TH_DAY[day]}</span>
                {list.length === 0 ? (
                  <span className="week__free">ว่าง</span>
                ) : (
                  <span className="week__list">
                    {list.map((x, i) => (
                      <button className="week__item" key={i} onClick={() => onOpenStudent(x.student)}>
                        <b>{x.time}</b> {x.student.nick}
                      </button>
                    ))}
                  </span>
                )}
              </li>
            ))}
          </ul>
        ) : sessions.length === 0 ? (
          <p className="home__quiet">พักได้เลยครับ</p>
        ) : (
          <ul className="rows2">
            {sessions.map((c) => {
              const st = find(c.studentId)
              if (!st) return null
              const status = state.sessionState[c.id] || 'todo'
              return (
                <li className="row2" key={c.id}>
                  <span className="row2__t">{c.time}</span>
                  <span className="row2__n">
                    {st.nick}
                    {(() => {
                      const pk = packState(st)
                      if (!pk) return null
                      const cls = pk.state === 'over' ? 'packchip--over' : pk.state === 'ok' ? '' : 'packchip--low'
                      return (
                        <span className={`packchip ${cls}`}>
                          {pk.over > 0 ? `เกิน ${pk.over}` : `เหลือ ${pk.left}/${pk.total}`}
                        </span>
                      )
                    })()}
                  </span>
                  {status === 'todo' ? (
                    <span className="row2__a">
                      <button className="btn btn--ink btn--sm" onClick={() => onCheckIn(c)}>เช็คชื่อ</button>
                      <button className="row2__skip" onClick={() => onLeave(c)}>ลา</button>
                    </span>
                  ) : (
                    <button className="row2__done" onClick={() => onEditSession(c)}>
                      {{ attended: 'มาเรียน', leave: 'ลา', leaveCharged: 'ลา · คิดเงิน', makeup: 'นัดชดเชย' }[status] || 'ลา'}
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
        {view === 'day' && <button className="home__more" onClick={onAddSession}>+ เพิ่มคาบ</button>}
      </section>
      </div>

      <div className="home__side">

      {otherTasks.length > 0 && (
        <section className="home__sec">
          <h2 className="home__lbl">เหลือให้คุณ</h2>
          <ul className="rows2">
            {otherTasks.map((t) => (
              <li className="row2 row2--task" key={t.id}>
                <span className="row2__main">
                  <span className="row2__n">{t.title}</span>
                  <span className="row2__why">{t.why}</span>
                </span>
                <button className="btn btn--cta btn--sm" onClick={() => onTask(t)}>ดู</button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="home__sec home__auto">
        <h2 className="home__lbl">ระบบทำให้แล้ว</h2>
        <ul className="autol">
          {auto.map((a) => (
            <li key={a.id}>
              <span className="autol__tick" aria-hidden="true">✓</span>
              <span className="autol__t">{a.text}</span>
            </li>
          ))}
        </ul>
        <p className="home__saved">
          ประหยัดเวลาคุณไป <b>{humanMinutes(mins)}</b> เดือนนี้
        </p>
        <button className="home__more" onClick={onSeeAll}>ดูทั้งหมด</button>
      </section>
      </div>
    </div>
  )
}
