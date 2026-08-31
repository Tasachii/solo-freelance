import { useCallback, useEffect, useRef, useState } from 'react'
import { useRoute, navigate } from './router.js'
import { useTheme, useIsDesk } from './theme.js'
import { useDemoState, totals, baht, uid, logged, buildCsv, rateOf, recordsOf } from './state.js'
import { MONTH, TODAY } from './data.js'

import Landing from './components/Landing.jsx'
import OverviewTab from './components/OverviewTab.jsx'
import TodayTab from './components/TodayTab.jsx'
import StudentsTab from './components/StudentsTab.jsx'
import BillingTab from './components/BillingTab.jsx'
import SettingsTab from './components/SettingsTab.jsx'
import Sheet from './components/Sheet.jsx'
import StudentSheet from './components/StudentSheet.jsx'
import StudentEditSheet from './components/StudentEditSheet.jsx'
import AttendanceSheet from './components/AttendanceSheet.jsx'
import AddSessionSheet from './components/AddSessionSheet.jsx'
import ExpenseSheet from './components/ExpenseSheet.jsx'
import SlipSheet from './components/SlipSheet.jsx'
import RemindSheet from './components/RemindSheet.jsx'
import LineBillSheet from './components/LineBillSheet.jsx'
import HelpSheet from './components/HelpSheet.jsx'
import ActivitySheet from './components/ActivitySheet.jsx'
import {
  IconOverview, IconToday, IconStudents, IconBilling, IconSettings,
  IconSun, IconMoon, IconClose, IconUndo,
} from './components/Icons.jsx'

const TABS = [
  { id: 'overview', label: 'ภาพรวม', title: 'ภาพรวม', Icon: IconOverview },
  { id: 'today', label: 'วันนี้', title: 'คาบสอนวันนี้', Icon: IconToday },
  { id: 'students', label: 'นักเรียน', title: 'นักเรียน', Icon: IconStudents },
  { id: 'billing', label: 'บิล', title: 'บิลสิ้นเดือน', Icon: IconBilling },
  { id: 'settings', label: 'ตั้งค่า', title: 'ตั้งค่า', Icon: IconSettings },
]

export default function App() {
  const route = useRoute()
  const theme = useTheme()
  const isDesk = useIsDesk()

  if (route === '/app') return <AppShell theme={theme} isDesk={isDesk} />
  if (route === '/') return <Landing isDark={theme.isDark} onToggleTheme={theme.toggle} />
  return <NotFound />
}

function NotFound() {
  return (
    <div className="land">
      <div className="land__inner" style={{ textAlign: 'center' }}>
        <h1 className="land__logo">ไม่พบหน้านี้</h1>
        <p className="land__lead" style={{ maxWidth: 'none' }}>ลิงก์อาจพิมพ์ผิดหรือถูกย้ายไปแล้ว</p>
        <div className="land__cta">
          <button className="btn btn--cta btn--block" onClick={() => navigate('/')}>กลับหน้าแรก</button>
        </div>
      </div>
    </div>
  )
}

function AppShell({ theme, isDesk }) {
  const { state, setState, reset, clear } = useDemoState()
  const [tab, setTab] = useState('today')
  const [sheet, setSheet] = useState(null)
  const [toast, setToast] = useState(null)
  const undoRef = useRef(null)
  const seq = useRef(0)

  const close = useCallback(() => setSheet(null), [])

  // ── ทุก action ที่เปลี่ยนข้อมูลวิ่งผ่านตรงนี้ เพื่อให้ undo ได้ทุกอัน ──
  const run = useCallback((mutate, text, undoable = true) => {
    setState((prev) => {
      if (undoable) undoRef.current = prev
      return mutate(prev)
    })
    seq.current += 1
    setToast({ id: seq.current, text, undo: undoable })
  }, [setState])

  const undo = useCallback(() => {
    const prev = undoRef.current
    if (!prev) return
    undoRef.current = null
    setState(prev)
    seq.current += 1
    setToast({ id: seq.current, text: 'ย้อนกลับแล้ว', undo: false })
  }, [setState])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), toast.undo ? 6000 : 2600)
    return () => clearTimeout(t)
  }, [toast])

  useEffect(() => {
    document.documentElement.setAttribute('data-fs', state.settings.display.fontScale)
  }, [state.settings.display.fontScale])

  // ── การเช็คชื่อ ──
  const checkIn = (session) =>
    run(
      (s) => ({
        ...s,
        sessionState: { ...s.sessionState, [session.id]: 'attended' },
        records: {
          ...s.records,
          [session.studentId]: [
            ...(s.records[session.studentId] || []),
            { id: uid('r'), date: TODAY, kind: 'attended', sessionId: session.id },
          ],
        },
      }),
      'เช็คชื่อแล้ว · นับเข้าบิลให้แล้ว',
    )

  const markLeave = (session) =>
    run(
      (s) => ({ ...s, sessionState: { ...s.sessionState, [session.id]: 'leave' } }),
      'บันทึกว่าลา · ไม่นับเงิน',
    )

  /** เปลี่ยนสถานะคาบที่กดไปแล้ว — ต้องซิงก์กับรายการครั้งเรียนด้วย */
  const setSessionStatus = (session, next) => {
    close()
    run((s) => {
      const list = (s.records[session.studentId] || []).filter((r) => r.sessionId !== session.id)
      if (next === 'attended') {
        list.push({ id: uid('r'), date: TODAY, kind: 'attended', sessionId: session.id })
      }
      return {
        ...s,
        sessionState: { ...s.sessionState, [session.id]: next },
        records: { ...s.records, [session.studentId]: list },
      }
    }, next === 'attended' ? 'เปลี่ยนเป็นมาเรียนแล้ว' : next === 'leave' ? 'เปลี่ยนเป็นลาแล้ว' : 'ย้อนกลับเป็นยังไม่ได้เช็ค')
  }

  const addPastSession = ({ studentId, date }) => {
    close()
    run((s) => ({
      ...s,
      records: {
        ...s.records,
        [studentId]: [...(s.records[studentId] || []), { id: uid('r'), date, kind: 'attended', sessionId: null }],
      },
    }), 'บันทึกคาบย้อนหลังแล้ว')
  }

  const removeRecord = (student, record) =>
    run((s) => ({
      ...s,
      records: { ...s.records, [student.id]: recordsOf(s, student.id).filter((r) => r.id !== record.id) },
      sessionState: record.sessionId
        ? { ...s.sessionState, [record.sessionId]: 'todo' }
        : s.sessionState,
    }), `ลบวันที่ ${record.date} แล้ว`)

  // ── นักเรียน ──
  const saveStudent = (data) => {
    close()
    const isNew = !state.students.some((s) => s.id === data.id)
    if (isNew) {
      const id = uid('s')
      run((s) => ({
        ...s,
        students: [...s.students, { ...data, id }],
        status: { ...s.status, [id]: 'pending' },
        records: { ...s.records, [id]: [] },
      }), `เพิ่ม${data.nick}แล้ว`)
    } else {
      run((s) => ({
        ...s,
        students: s.students.map((x) => (x.id === data.id ? { ...x, ...data } : x)),
      }), `บันทึกข้อมูล${data.nick}แล้ว`)
    }
  }

  const deleteStudent = (student) => {
    close()
    run((s) => {
      const { [student.id]: _r, ...records } = s.records
      const { [student.id]: _st, ...status } = s.status
      return {
        ...s,
        students: s.students.filter((x) => x.id !== student.id),
        records,
        status,
        sessions: s.sessions.filter((c) => c.studentId !== student.id),
      }
    }, `ลบ${student.nick}แล้ว`)
  }

  // ── บิล ──
  const confirmSlip = (student) => {
    close()
    run((s) => ({ ...s, status: { ...s.status, [student.id]: 'paid' } }), `รับยอดของ${student.nick}แล้ว`)
  }

  const undoPaid = (student) =>
    run((s) => ({ ...s, status: { ...s.status, [student.id]: 'pending' } }), `ยกเลิกการรับยอดของ${student.nick}`)

  const sendRemind = (student) => {
    close()
    run((s) => ({
      ...s,
      reminded: { ...s.reminded, [student.id]: (s.reminded[student.id] || 0) + 1 },
      activity: logged(s, `ทวงค่าเรียนของ${student.nick} ถึง${student.parent}`),
    }), `ส่งแล้ว · ทวงซ้ำอีกใน ${state.settings.dunning.everyDays} วัน`, false)
  }

  const sendProgress = (student) => {
    close()
    run((s) => ({
      ...s,
      activity: logged(s, `ส่งสรุปพัฒนาการของ${student.nick} ถึง${student.parent}`),
    }), `ส่งสรุปให้${student.parent}แล้ว`, false)
  }

  const sendAllBills = () => {
    close()
    run((s) => ({
      ...s,
      billsSent: true,
      activity: logged(s, `ส่งบิลเดือน${MONTH} เข้า LINE ผู้ปกครอง ${s.students.length} คน`),
    }), `ส่งบิลครบ ${state.students.length} คนแล้ว`, false)
  }

  // ── รายจ่าย ──
  const saveExpense = (data) => {
    close()
    const isNew = !state.expenses.some((e) => e.id === data.id)
    run((s) => ({
      ...s,
      expenses: isNew ? [{ ...data, id: uid('e') }, ...s.expenses] : s.expenses.map((e) => (e.id === data.id ? data : e)),
    }), isNew ? `บันทึกรายจ่าย ${baht(data.amount)} บาทแล้ว` : 'แก้ไขรายจ่ายแล้ว')
  }

  const deleteExpense = (expense) => {
    close()
    run((s) => ({ ...s, expenses: s.expenses.filter((e) => e.id !== expense.id) }), 'ลบรายจ่ายแล้ว')
  }

  // ── ข้อมูล ──
  const exportCsv = () => {
    try {
      const blob = new Blob([buildCsv(state)], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `tutordai-${MONTH.replace(/\s/g, '')}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      seq.current += 1
      setToast({ id: seq.current, text: 'ดาวน์โหลดไฟล์ CSV แล้ว', undo: false })
    } catch {
      seq.current += 1
      setToast({ id: seq.current, text: 'ดาวน์โหลดไม่สำเร็จ ลองอีกครั้งครับ', undo: false })
    }
  }

  const doReset = () => {
    close()
    undoRef.current = state
    reset()
    setTab('today')
    seq.current += 1
    setToast({ id: seq.current, text: 'รีเซ็ตข้อมูลแล้ว', undo: true })
  }

  const doClear = () => {
    close()
    undoRef.current = state
    clear()
    setTab('students')
    seq.current += 1
    setToast({ id: seq.current, text: 'ล้างข้อมูลแล้ว', undo: true })
  }

  const setSettings = (settings) => setState((s) => ({ ...s, settings }))

  // ── ตัวเลขที่ใช้บนหัวและจุดแจ้งเตือน ──
  const { total, paid, outstanding } = totals(state)
  const sessionsLeft = state.sessions.filter((c) => state.sessionState[c.id] === 'todo').length
  const unpaidCount = state.students.filter((s) => state.status[s.id] !== 'paid').length
  const dots = { overview: false, today: sessionsLeft > 0, students: false, billing: unpaidCount > 0, settings: false }

  const open = (kind, extra) => setSheet({ kind, ...extra })

  const pane = (
    <>
      {tab === 'overview' && (
        <OverviewTab state={state} desk={isDesk}
          onAddExpense={() => open('expense', { expense: null })}
          onEditExpense={(e) => open('expense', { expense: e })}
          onOpenStudent={(s) => open('student', { student: s })} />
      )}
      {tab === 'today' && (
        <TodayTab state={state} desk={isDesk}
          onCheckIn={checkIn} onLeave={markLeave}
          onEditSession={(c) => open('attendance', { session: c })}
          onAddSession={() => open('addSession')} />
      )}
      {tab === 'students' && (
        <StudentsTab state={state} desk={isDesk}
          onOpen={(s) => open('student', { student: s })}
          onAdd={() => open('studentEdit', { student: null })} />
      )}
      {tab === 'billing' && (
        <BillingTab state={state} desk={isDesk}
          onSlip={(s) => open('slip', { student: s })}
          onRemind={(s) => open('remind', { student: s })}
          onUndoPaid={undoPaid}
          onSendAll={() => open('line')} />
      )}
      {tab === 'settings' && (
        <SettingsTab state={state} onChange={setSettings}
          theme={theme.choice} onTheme={theme.setChoice}
          onExport={exportCsv}
          onClearData={() => open('confirmClear')}
          onReset={() => open('confirmReset')}
          onHelp={() => open('help')}
          onActivity={() => open('activity')} />
      )}
    </>
  )

  const overlays = (
    <>
      {sheet?.kind === 'student' && (
        <StudentSheet student={state.students.find((s) => s.id === sheet.student.id) || sheet.student}
          state={state} onClose={close} onSendProgress={sendProgress}
          onEdit={(s) => open('studentEdit', { student: s })}
          onRemoveRecord={removeRecord} />
      )}
      {sheet?.kind === 'studentEdit' && (
        <StudentEditSheet student={sheet.student} state={state} onClose={close}
          onSave={saveStudent} onDelete={deleteStudent} />
      )}
      {sheet?.kind === 'attendance' && (
        <AttendanceSheet session={sheet.session} state={state} onClose={close} onSet={setSessionStatus} />
      )}
      {sheet?.kind === 'addSession' && (
        <AddSessionSheet state={state} onClose={close} onAdd={addPastSession} />
      )}
      {sheet?.kind === 'expense' && (
        <ExpenseSheet expense={sheet.expense} onClose={close} onSave={saveExpense} onDelete={deleteExpense} />
      )}
      {sheet?.kind === 'slip' && (
        <SlipSheet student={sheet.student} state={state} onClose={close} onConfirm={confirmSlip} />
      )}
      {sheet?.kind === 'remind' && (
        <RemindSheet student={sheet.student} state={state} onClose={close} onSend={sendRemind} />
      )}
      {sheet?.kind === 'line' && <LineBillSheet state={state} onClose={close} onConfirm={sendAllBills} />}
      {sheet?.kind === 'help' && <HelpSheet onClose={close} />}
      {sheet?.kind === 'activity' && <ActivitySheet state={state} onClose={close} />}

      {sheet?.kind === 'confirmClear' && (
        <Sheet title="เริ่มจากศูนย์?" sub="ลบข้อมูลตัวอย่างทั้งหมด" onClose={close}
          footer={
            <>
              <button className="btn btn--cta btn--block" onClick={doClear}>ลบข้อมูลตัวอย่าง</button>
              <button className="reset" onClick={close}>ยกเลิก</button>
            </>
          }>
          <p className="msg">
            นักเรียน คาบสอน ประวัติเรียน และรายจ่ายทั้งหมดจะถูกลบ เพื่อให้คุณใส่ข้อมูลจริงของตัวเองได้
            {'\n\n'}การตั้งค่า (ชื่อ บัญชี เรท) จะถูกเก็บไว้ · กด "เลิกทำ" ในแถบด้านล่างเพื่อย้อนกลับได้ทันที
          </p>
        </Sheet>
      )}
      {sheet?.kind === 'confirmReset' && (
        <Sheet title="รีเซ็ตข้อมูลเดโม?" sub="กลับไปเป็นข้อมูลตัวอย่างตั้งต้น" onClose={close}
          footer={
            <>
              <button className="btn btn--danger btn--block" onClick={doReset}>รีเซ็ตทั้งหมด</button>
              <button className="reset" onClick={close}>ยกเลิก</button>
            </>
          }>
          <p className="msg">
            ทุกอย่างจะกลับไปเป็นข้อมูลตัวอย่างตั้งต้น รวมถึงการตั้งค่าที่คุณแก้ไว้
            {'\n\n'}กด "เลิกทำ" ในแถบด้านล่างเพื่อย้อนกลับได้ทันที
          </p>
        </Sheet>
      )}

      {toast && (
        <div className="toast" role="status" key={toast.id}>
          <span className="toast__txt">{toast.text}</span>
          {toast.undo && (
            <button className="toast__btn" onClick={undo}>
              <IconUndo />
              เลิกทำ
            </button>
          )}
        </div>
      )}
    </>
  )

  const active = TABS.find((t) => t.id === tab)

  if (isDesk) {
    return (
      <div className="desk">
        <aside className="desk__side">
          <div className="desk__brand">
            <b>ติวได้<em>ตังค์</em></b>
            <span>{state.settings.profile.name} · {MONTH}</span>
          </div>
          <nav className="desk__nav">
            {TABS.map(({ id, label, Icon }) => (
              <button key={id} className={`desk__navbtn${tab === id ? ' desk__navbtn--on' : ''}`}
                onClick={() => setTab(id)} aria-current={tab === id ? 'page' : undefined}>
                <Icon />
                {label}
                {dots[id] && tab !== id && <span className="desk__navdot" />}
              </button>
            ))}
          </nav>
          <div className="desk__sidefoot">
            <button className="themebtn" onClick={theme.toggle}>
              {theme.isDark ? <IconSun /> : <IconMoon />}
              {theme.isDark ? 'โหมดสว่าง' : 'โหมดมืด'}
            </button>
            <button className="themebtn" onClick={() => navigate('/')}>
              <IconClose />
              ออกจากเดโม
            </button>
            <p className="disclaimer" style={{ marginTop: 8 }}>เดโม · ข้อมูลสมมติทั้งหมด</p>
          </div>
        </aside>

        <main className="desk__main">
          <div className="desk__bar">
            <div>
              <h1 className="desk__h1">{active.title}</h1>
              <div className="desk__sub">สวัสดี {state.settings.profile.name} · เดือน{MONTH}</div>
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

  return (
    <div className="app">
      <header className="hd">
        <div className="hd__top">
          <div>
            <div className="hd__hi">สวัสดี {state.settings.profile.name}</div>
            <div className="hd__month">{MONTH}</div>
          </div>
          <div className="hd__acts">
            <button className="hd__btn" onClick={theme.toggle}
              aria-label={theme.isDark ? 'ใช้โหมดสว่าง' : 'ใช้โหมดมืด'}>
              {theme.isDark ? <IconSun /> : <IconMoon />}
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
        {tab === 'settings' ? <div className="pane">{pane}</div> : pane}
        <footer className="appfoot">
          <p className="disclaimer" style={{ margin: 0 }}>เดโม · ข้อมูลสมมติทั้งหมด</p>
        </footer>
      </main>

      <nav className="tabs tabs--5">
        {TABS.map(({ id, label, Icon }) => (
          <button key={id} className={`tab${tab === id ? ' tab--on' : ''}`}
            onClick={() => setTab(id)} aria-current={tab === id ? 'page' : undefined}>
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
