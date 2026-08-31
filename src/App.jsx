import { useCallback, useEffect, useState } from 'react'
import { useRoute, navigate } from './router.js'
import { useTheme, useIsDesk } from './theme.js'
import { useDemoState, totals, baht } from './state.js'
import { SESSIONS, STUDENTS, TUTOR } from './data.js'

import Landing from './components/Landing.jsx'
import TodayTab from './components/TodayTab.jsx'
import StudentsTab from './components/StudentsTab.jsx'
import BillingTab from './components/BillingTab.jsx'
import StudentSheet from './components/StudentSheet.jsx'
import SlipSheet from './components/SlipSheet.jsx'
import RemindSheet from './components/RemindSheet.jsx'
import LineBillSheet from './components/LineBillSheet.jsx'
import { IconToday, IconStudents, IconBilling, IconSun, IconMoon, IconClose } from './components/Icons.jsx'

const TABS = [
  { id: 'today', label: 'วันนี้', title: 'คาบสอนวันนี้', Icon: IconToday },
  { id: 'students', label: 'นักเรียน', title: 'นักเรียน', Icon: IconStudents },
  { id: 'billing', label: 'บิลสิ้นเดือน', title: 'บิลสิ้นเดือน', Icon: IconBilling },
]

export default function App() {
  const route = useRoute()
  const { isDark, toggle } = useTheme()
  const isDesk = useIsDesk()

  if (route !== '/app') return <Landing isDark={isDark} onToggleTheme={toggle} />
  return <AppShell isDark={isDark} onToggleTheme={toggle} isDesk={isDesk} />
}

function AppShell({ isDark, onToggleTheme, isDesk }) {
  const [state, setState, reset] = useDemoState()
  const [tab, setTab] = useState('today')
  const [sheet, setSheet] = useState(null)
  const [toast, setToast] = useState(null)

  const say = useCallback((text) => setToast({ id: Date.now(), text }), [])
  const close = useCallback(() => setSheet(null), [])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2400)
    return () => clearTimeout(t)
  }, [toast])

  // ── การกระทำที่เปลี่ยน state ──
  const checkIn = (session) => {
    setState((s) => ({
      ...s,
      sessions: { ...s.sessions, [session.id]: 'attended' },
      attended: { ...s.attended, [session.studentId]: (s.attended[session.studentId] ?? 0) + 1 },
    }))
    say('เช็คชื่อแล้ว — ระบบนับครั้งเรียนให้อัตโนมัติ')
  }
  const markLeave = (session) => {
    setState((s) => ({ ...s, sessions: { ...s.sessions, [session.id]: 'leave' } }))
    say('บันทึกว่าลาแล้ว — ไม่นับเงิน เก็บเป็นคาบชดเชยให้')
  }
  const confirmSlip = (student) => {
    setState((s) => ({ ...s, status: { ...s.status, [student.id]: 'paid' } }))
    close()
    say(`รับยอดของ${student.nick}แล้ว`)
  }
  const sendRemind = (student) => {
    setState((s) => ({ ...s, reminded: [...new Set([...s.reminded, student.id])] }))
    close()
    say('ส่งแล้ว · ระบบจะทวงซ้ำเองใน 3 วันถ้ายังเงียบ')
  }
  const sendProgress = (student) => {
    setState((s) => ({ ...s, progressSent: [...new Set([...s.progressSent, student.id])] }))
    close()
    say(`ส่งสรุปให้${student.parent}แล้ว`)
  }
  const sendAllBills = () => {
    setState((s) => ({ ...s, billsSent: true }))
    close()
    say(`ส่งบิลเข้า LINE ผู้ปกครองครบ ${STUDENTS.length} คนแล้ว`)
  }
  const doReset = () => {
    reset()
    setTab('today')
    setSheet(null)
    say('รีเซ็ตข้อมูลเดโมเรียบร้อย')
  }

  const { total, paid, outstanding } = totals(state)
  const sessionsLeft = SESSIONS.filter((c) => state.sessions[c.id] === 'todo').length
  const unpaidCount = STUDENTS.filter((s) => state.status[s.id] !== 'paid').length
  const dots = { today: sessionsLeft > 0, students: false, billing: unpaidCount > 0 }

  const pane = (
    <>
      {tab === 'today' && <TodayTab state={state} onCheckIn={checkIn} onLeave={markLeave} desk={isDesk} />}
      {tab === 'students' && (
        <StudentsTab state={state} onOpen={(st) => setSheet({ kind: 'student', student: st })} desk={isDesk} />
      )}
      {tab === 'billing' && (
        <BillingTab
          state={state}
          onSlip={(st) => setSheet({ kind: 'slip', student: st })}
          onRemind={(st) => setSheet({ kind: 'remind', student: st })}
          onSendAll={() => setSheet({ kind: 'line' })}
          desk={isDesk}
        />
      )}
    </>
  )

  const overlays = (
    <>
      {sheet?.kind === 'student' && (
        <StudentSheet student={sheet.student} state={state} onClose={close} onSendProgress={sendProgress} />
      )}
      {sheet?.kind === 'slip' && (
        <SlipSheet student={sheet.student} state={state} onClose={close} onConfirm={confirmSlip} />
      )}
      {sheet?.kind === 'remind' && (
        <RemindSheet student={sheet.student} state={state} onClose={close} onSend={sendRemind} />
      )}
      {sheet?.kind === 'line' && <LineBillSheet state={state} onClose={close} onConfirm={sendAllBills} />}
      {toast && (
        <div className="toast" role="status" key={toast.id}>
          {toast.text}
        </div>
      )}
    </>
  )

  const themeBtn = (
    <button className="themebtn" onClick={onToggleTheme}>
      {isDark ? <IconSun /> : <IconMoon />}
      {isDark ? 'โหมดสว่าง' : 'โหมดมืด'}
    </button>
  )

  // ── โต๊ะทำงาน (จอกว้าง) ──
  if (isDesk) {
    const active = TABS.find((t) => t.id === tab)
    return (
      <div className="desk">
        <aside className="desk__side">
          <div className="desk__brand">
            <b>ติวได้<em>ตังค์</em></b>
            <span>{TUTOR.name} · {TUTOR.month}</span>
          </div>

          <nav className="desk__nav">
            {TABS.map(({ id, label, Icon }) => (
              <button
                key={id}
                className={`desk__navbtn${tab === id ? ' desk__navbtn--on' : ''}`}
                onClick={() => setTab(id)}
                aria-current={tab === id ? 'page' : undefined}
              >
                <Icon />
                {label}
                {dots[id] && tab !== id && <span className="desk__navdot" />}
              </button>
            ))}
          </nav>

          <div className="desk__sidefoot">
            {themeBtn}
            <button className="themebtn" onClick={() => navigate('/')}>
              <IconClose />
              ออกจากเดโม
            </button>
            <button className="reset" onClick={doReset}>รีเซ็ตข้อมูลเดโม</button>
            <p className="disclaimer" style={{ marginTop: 10 }}>เดโม · ข้อมูลสมมติทั้งหมด</p>
          </div>
        </aside>

        <main className="desk__main">
          <div className="desk__bar">
            <div>
              <h1 className="desk__h1">{active.title}</h1>
              <div className="desk__sub">สวัสดี {TUTOR.name} · เดือน{TUTOR.month}</div>
            </div>
          </div>

          <div className="stats">
            <div className="card stat rise">
              <div className="stat__k">ค่าเรียนเดือนนี้</div>
              <div className="stat__v">{baht(total)}<small>บาท</small></div>
            </div>
            <div className="card stat stat--in rise d1">
              <div className="stat__k">เข้าแล้ว</div>
              <div className="stat__v">{baht(paid)}<small>บาท</small></div>
            </div>
            <div className="card stat stat--out rise d2">
              <div className="stat__k">ยังไม่เข้าบัญชี · {unpaidCount} คน</div>
              <div className="stat__v">{baht(outstanding)}<small>บาท</small></div>
            </div>
          </div>

          {pane}
        </main>

        {overlays}
      </div>
    )
  }

  // ── มือถือ ──
  return (
    <div className="app">
      <header className="hd">
        <div className="hd__top">
          <div>
            <div className="hd__hi">สวัสดี {TUTOR.name}</div>
            <div className="hd__month">{TUTOR.month}</div>
          </div>
          <div className="hd__acts">
            <button className="hd__btn" onClick={onToggleTheme} aria-label={isDark ? 'ใช้โหมดสว่าง' : 'ใช้โหมดมืด'}>
              {isDark ? <IconSun /> : <IconMoon />}
            </button>
            <button className="hd__btn" onClick={() => navigate('/')} aria-label="ออกจากเดโม">
              <IconClose />
            </button>
          </div>
        </div>

        <div className="hd__money">
          <div>
            <div className="hd__label">ยังไม่เข้าบัญชี</div>
            <div className="hd__amt">{baht(outstanding)}<small>บาท</small></div>
          </div>
          <div className="hd__side">
            ค่าเรียนเดือนนี้
            <b>{baht(total)}</b>
          </div>
        </div>
      </header>

      <main className="scroll">
        {pane}
        <footer className="appfoot">
          <p className="disclaimer" style={{ margin: 0 }}>เดโม · ข้อมูลสมมติทั้งหมด</p>
          <button className="reset" onClick={doReset}>รีเซ็ตข้อมูลเดโม</button>
        </footer>
      </main>

      <nav className="tabs">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            className={`tab${tab === id ? ' tab--on' : ''}`}
            onClick={() => setTab(id)}
            aria-current={tab === id ? 'page' : undefined}
          >
            <span className="tab__icon">
              <Icon />
              {dots[id] && tab !== id && <span className="tab__dot" />}
            </span>
            <span>{label}</span>
          </button>
        ))}
      </nav>

      {overlays}
    </div>
  )
}
