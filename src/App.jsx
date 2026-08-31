import { useCallback, useEffect, useState } from 'react'
import { useRoute, navigate } from './router.js'
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
import { IconToday, IconStudents, IconBilling } from './components/Icons.jsx'

const TABS = [
  { id: 'today', label: 'วันนี้', Icon: IconToday },
  { id: 'students', label: 'นักเรียน', Icon: IconStudents },
  { id: 'billing', label: 'บิลสิ้นเดือน', Icon: IconBilling },
]

export default function App() {
  const route = useRoute()
  return (
    <div className="stage">
      <div className="phone">{route === '/app' ? <AppShell /> : <Landing />}</div>
    </div>
  )
}

function AppShell() {
  const [state, setState, reset] = useDemoState()
  const [tab, setTab] = useState('today')
  const [sheet, setSheet] = useState(null) // { kind, student }
  const [toast, setToast] = useState(null)

  const say = useCallback((text) => setToast({ id: Date.now(), text }), [])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2400)
    return () => clearTimeout(t)
  }, [toast])

  const close = useCallback(() => setSheet(null), [])

  // ── การกระทำทั้งหมดที่เปลี่ยน state ──

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

  // ── ตัวเลขบน header และจุดแจ้งเตือนบนแท็บ ──

  const { total, outstanding } = totals(state)
  const pendingSessions = SESSIONS.filter((c) => state.sessions[c.id] === 'todo').length
  const unpaidCount = STUDENTS.filter((s) => state.status[s.id] !== 'paid').length
  const dots = { today: pendingSessions > 0, students: false, billing: unpaidCount > 0 }

  return (
    <>
      <header className="hd">
        <div className="hd__top">
          <div className="hd__who">
            <div className="hd__hi">สวัสดี {TUTOR.name}</div>
            <div className="hd__month">{TUTOR.month}</div>
          </div>
          <button className="hd__back" onClick={() => navigate('/')} aria-label="กลับหน้าแรก">
            ✕
          </button>
        </div>

        <div className="hd__money">
          <div>
            <div className="hd__label">ยังไม่เข้าบัญชี</div>
            <div className="hd__amt">
              {baht(outstanding)}
              <small>บาท</small>
            </div>
          </div>
          <div className="hd__side">
            ค่าเรียนเดือนนี้
            <b>{baht(total)}</b>
          </div>
        </div>
      </header>

      <main className="scroll">
        {tab === 'today' && <TodayTab state={state} onCheckIn={checkIn} onLeave={markLeave} />}
        {tab === 'students' && (
          <StudentsTab state={state} onOpen={(st) => setSheet({ kind: 'student', student: st })} />
        )}
        {tab === 'billing' && (
          <BillingTab
            state={state}
            onSlip={(st) => setSheet({ kind: 'slip', student: st })}
            onRemind={(st) => setSheet({ kind: 'remind', student: st })}
            onSendAll={() => setSheet({ kind: 'line' })}
          />
        )}

        <footer className="appfoot">
          <p>
            เดโมนี้ทำขึ้นเพื่อ validation เท่านั้น · ไม่มี backend ไม่มีการเก็บข้อมูลจริง
            ข้อมูลที่กดเล่นถูกเก็บไว้ในเครื่องคุณเองเท่านั้น
          </p>
          <button className="reset" onClick={doReset}>
            รีเซ็ตข้อมูลเดโม
          </button>
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

      {sheet?.kind === 'student' && (
        <StudentSheet
          student={sheet.student}
          state={state}
          onClose={close}
          onSendProgress={sendProgress}
        />
      )}
      {sheet?.kind === 'slip' && (
        <SlipSheet student={sheet.student} state={state} onClose={close} onConfirm={confirmSlip} />
      )}
      {sheet?.kind === 'remind' && (
        <RemindSheet student={sheet.student} state={state} onClose={close} onSend={sendRemind} />
      )}
      {sheet?.kind === 'line' && (
        <LineBillSheet state={state} onClose={close} onConfirm={sendAllBills} />
      )}

      {toast && (
        <div className="toast" role="status" key={toast.id}>
          {toast.text}
        </div>
      )}
    </>
  )
}
