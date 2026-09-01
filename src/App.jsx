import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, navigate } from './router.js'
import { useTheme, useIsDesk } from './theme.js'
import {
  useDemoState, totals, baht, uid, logged, inboxed, buildCsv, buildBackup, parseBackup,
  rateOf, recordsIn, sessionsOn, statusOf,
} from './state.js'
import { TODAY, TODAY_PERIOD, FIRST_PERIOD, SEND_DELAY_MS } from './data.js'
import { longMonth, shiftPeriod, shortDate } from './dates.js'

import Landing from './components/Landing.jsx'
import HomeTab from './components/HomeTab.jsx'
import MoneyTab from './components/MoneyTab.jsx'
import StudentsTab from './components/StudentsTab.jsx'
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
import InboxSheet from './components/InboxSheet.jsx'
import HistorySheet from './components/HistorySheet.jsx'
import {
  IconOverview, IconToday, IconStudents, IconBilling, IconSettings,
  IconSun, IconMoon, IconClose, IconUndo, IconBell,
} from './components/Icons.jsx'

const TABS = [
  { id: 'home', label: 'วันนี้', title: 'วันนี้', Icon: IconToday, periodic: false },
  { id: 'students', label: 'นักเรียน', title: 'นักเรียน', Icon: IconStudents, periodic: true },
  { id: 'money', label: 'เงิน', title: 'เงิน', Icon: IconBilling, periodic: true },
]
const TAB_IDS = TABS.map((t) => t.id)

export default function App() {
  const { route, tab } = useLocation()
  const theme = useTheme()
  const isDesk = useIsDesk()

  if (route === '/app') return <AppShell theme={theme} isDesk={isDesk} urlTab={tab} />
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

function AppShell({ theme, isDesk, urlTab }) {
  const { state, setState, commit, undo, reset, clear, replace } = useDemoState()
  const [period, setPeriod] = useState(TODAY_PERIOD)
  const [sheet, setSheet] = useState(null)
  const [toast, setToast] = useState(null)
  const seq = useRef(0)
  const fileRef = useRef(null)

  const tab = TAB_IDS.includes(urlTab) ? urlTab : 'home'
  const setTab = useCallback((id) => navigate(`/app/${id}`), [])
  useEffect(() => { if (!TAB_IDS.includes(urlTab)) navigate('/app/home') }, [urlTab])

  const close = useCallback(() => setSheet(null), [])
  const say = useCallback((text, extra = {}) => {
    seq.current += 1
    setToast({ id: seq.current, text, ...extra })
  }, [])

  useEffect(() => {
    if (!toast) return
    const ms = toast.cancel ? SEND_DELAY_MS : toast.undo ? 6000 : 2600
    const t = setTimeout(() => setToast(null), ms)
    return () => clearTimeout(t)
  }, [toast])

  useEffect(() => {
    document.documentElement.setAttribute('data-fs', state.settings.display.fontScale)
  }, [state.settings.display.fontScale])

  /** ทำสิ่งที่ย้อนได้ + เด้ง toast พร้อมปุ่มเลิกทำ */
  const act = useCallback((mutate, label, toastText) => {
    commit(mutate, label)
    say(toastText ?? label, { undo: true })
  }, [commit, say])

  const doUndo = useCallback((n = 0) => {
    const label = undo(n)
    close()
    say(label ? `ย้อนกลับ: ${label}` : 'ย้อนกลับแล้ว')
  }, [undo, close, say])

  // ── กล่องส่งออก: หน่วง 6 วิ ให้ยกเลิกทัน แล้วค่อยส่งจริง ──
  useEffect(() => {
    if (!state.outbox.length) return
    const timer = setInterval(() => {
      const now = Date.now()
      const due = state.outbox.filter((o) => o.sendAt <= now)
      if (!due.length) return
      setState((s) => {
        let next = { ...s, outbox: s.outbox.filter((o) => o.sendAt > now) }
        for (const o of due) {
          next = { ...next, activity: logged(next, o.log) }
          if (o.notify) next = { ...next, inbox: inboxed(next, o.notify) }
        }
        return next
      })
    }, 500)
    return () => clearInterval(timer)
  }, [state.outbox, setState])

  const queueSend = useCallback((item, toastText, label) => {
    const id = uid('o')
    commit((s) => ({ ...s, outbox: [...s.outbox, { id, sendAt: Date.now() + SEND_DELAY_MS, ...item }] }), label)
    close()
    say(toastText, { cancel: id })
  }, [commit, close, say])

  const cancelSend = useCallback((id) => {
    setState((s) => ({ ...s, outbox: s.outbox.filter((o) => o.id !== id) }))
    say('ยกเลิกการส่งแล้ว ยังไม่มีใครได้รับ')
  }, [setState, say])

  // ── เช็คชื่อ ──
  const checkIn = (c) => {
    const st = state.students.find((s) => s.id === c.studentId)
    act((s) => ({
      ...s,
      sessionState: { ...s.sessionState, [c.id]: 'attended' },
      records: {
        ...s.records,
        [c.studentId]: [...(s.records[c.studentId] || []), {
          id: uid('r'), date: c.date, kind: 'attended', rate: rateOf(st, s), sessionId: c.id,
        }],
      },
    }), `เช็คชื่อ ${st?.nick ?? ''}`, 'เช็คชื่อแล้ว · นับเข้าบิลให้แล้ว')
  }

  const markLeave = (c) => {
    const st = state.students.find((s) => s.id === c.studentId)
    act((s) => ({ ...s, sessionState: { ...s.sessionState, [c.id]: 'leave' } }),
      `บันทึกลา ${st?.nick ?? ''}`, 'บันทึกว่าลา · ไม่นับเงิน')
  }

  const setSessionStatus = (c, next) => {
    close()
    const st = state.students.find((s) => s.id === c.studentId)
    act((s) => {
      const list = (s.records[c.studentId] || []).filter((r) => r.sessionId !== c.id)
      if (next === 'attended') {
        list.push({ id: uid('r'), date: c.date, kind: 'attended', rate: rateOf(st, s), sessionId: c.id })
      }
      return { ...s, sessionState: { ...s.sessionState, [c.id]: next }, records: { ...s.records, [c.studentId]: list } }
    }, `แก้สถานะ ${st?.nick ?? ''}`,
      next === 'attended' ? 'เปลี่ยนเป็นมาเรียนแล้ว' : next === 'leave' ? 'เปลี่ยนเป็นลาแล้ว' : 'ย้อนเป็นยังไม่ได้เช็ค')
  }

  const addTodaySession = ({ studentId, time }) => {
    close()
    const st = state.students.find((s) => s.id === studentId)
    act((s) => ({ ...s, extraSessions: [...s.extraSessions, { id: uid('x'), date: TODAY, studentId, time }] }),
      `เพิ่มคาบพิเศษ ${st?.nick ?? ''}`, 'เพิ่มเข้าตารางวันนี้แล้ว')
  }

  const addPastSession = ({ studentId, date }) => {
    close()
    const st = state.students.find((s) => s.id === studentId)
    act((s) => ({
      ...s,
      records: { ...s.records, [studentId]: [...(s.records[studentId] || []), {
        id: uid('r'), date, kind: 'attended', rate: rateOf(st, s), sessionId: null,
      }] },
    }), `บันทึกย้อนหลัง ${st?.nick ?? ''}`, 'บันทึกคาบย้อนหลังแล้ว')
  }

  const removeRecord = (student, record) =>
    act((s) => ({
      ...s,
      records: { ...s.records, [student.id]: (s.records[student.id] || []).filter((r) => r.id !== record.id) },
      sessionState: record.sessionId ? { ...s.sessionState, [record.sessionId]: 'todo' } : s.sessionState,
    }), `ลบครั้งเรียน ${student.nick} ${shortDate(record.date)}`, `ลบวันที่ ${shortDate(record.date)} แล้ว`)

  // ── นักเรียน ──
  const saveStudent = (data) => {
    close()
    const isNew = !state.students.some((s) => s.id === data.id)
    if (isNew) {
      const id = uid('s')
      act((s) => ({ ...s, students: [...s.students, { ...data, id }], records: { ...s.records, [id]: [] } }),
        `เพิ่ม ${data.nick}`, `เพิ่ม${data.nick}แล้ว`)
    } else {
      act((s) => ({ ...s, students: s.students.map((x) => (x.id === data.id ? { ...x, ...data } : x)) }),
        `แก้ไข ${data.nick}`, `บันทึกข้อมูล${data.nick}แล้ว`)
    }
  }

  const deleteStudent = (student) => {
    close()
    act((s) => {
      const { [student.id]: _r, ...records } = s.records
      return {
        ...s,
        students: s.students.filter((x) => x.id !== student.id),
        records,
        extraSessions: s.extraSessions.filter((e) => e.studentId !== student.id),
      }
    }, `ลบ ${student.nick}`, `ลบ${student.nick}แล้ว`)
  }

  // ── บิล ──
  const setStatus = (student, next, label, toastText) =>
    act((s) => ({ ...s, status: { ...s.status, [period]: { ...(s.status[period] || {}), [student.id]: next } } }),
      label, toastText)

  const confirmSlip = (student) => {
    close()
    setStatus(student, 'paid', `รับยอด ${student.nick}`, `รับยอดของ${student.nick}แล้ว`)
  }
  const undoPaid = (student) => setStatus(student, 'pending', `ยกเลิกรับยอด ${student.nick}`, `ยกเลิกการรับยอดของ${student.nick}`)

  const remindDiff = (student, diff) => {
    queueSend({
      kind: 'remind',
      log: `ทวงส่วนต่าง ${baht(diff)} บาท ของ${student.nick} ถึง${student.parent}`,
      notify: { kind: 'sent', studentId: student.id, text: `ส่งข้อความทวงส่วนต่างถึง${student.parent}แล้ว` },
    }, `จะส่งใน 6 วินาที · ทวงส่วนต่าง ${baht(diff)} บาท`, `ทวงส่วนต่าง ${student.nick}`)
  }

  const sendRemind = (student) => {
    commit((s) => ({ ...s, reminded: { ...s.reminded, [student.id]: (s.reminded[student.id] || 0) + 1 } }), `ทวง ${student.nick}`)
    queueSend({
      kind: 'remind',
      log: `ทวงค่าเรียนของ${student.nick} ถึง${student.parent}`,
      notify: { kind: 'sent', studentId: student.id, text: `ส่งข้อความทวงถึง${student.parent}แล้ว` },
    }, 'จะส่งใน 6 วินาที', `ทวง ${student.nick}`)
  }

  const sendProgress = (student) =>
    queueSend({
      kind: 'progress',
      log: `ส่งสรุปพัฒนาการของ${student.nick} ถึง${student.parent}`,
      notify: { kind: 'sent', studentId: student.id, text: `ส่งสรุปพัฒนาการถึง${student.parent}แล้ว` },
    }, 'จะส่งใน 6 วินาที', `ส่งสรุป ${student.nick}`)

  const sendAllBills = () =>
    queueSend({
      kind: 'bill',
      log: `ส่งบิลเดือน${longMonth(period)} เข้า LINE ผู้ปกครอง ${state.students.length} คน`,
      notify: { kind: 'sent', text: `ส่งบิลเข้า LINE ครบ ${state.students.length} คนแล้ว` },
    }, `จะส่งใน 6 วินาที · ${state.students.length} คน`, 'ส่งบิลทุกคน')

  // ── รายจ่าย ──
  const saveExpense = (data) => {
    close()
    const isNew = !state.expenses.some((e) => e.id === data.id)
    act((s) => ({
      ...s,
      expenses: isNew ? [{ ...data, id: uid('e') }, ...s.expenses] : s.expenses.map((e) => (e.id === data.id ? data : e)),
    }), isNew ? `บันทึกรายจ่าย ${baht(data.amount)}` : 'แก้ไขรายจ่าย',
      isNew ? `บันทึกรายจ่าย ${baht(data.amount)} บาทแล้ว` : 'แก้ไขรายจ่ายแล้ว')
  }
  const deleteExpense = (expense) => {
    close()
    act((s) => ({ ...s, expenses: s.expenses.filter((e) => e.id !== expense.id) }), 'ลบรายจ่าย', 'ลบรายจ่ายแล้ว')
  }

  // ── ข้อมูล ──
  const download = (text, name, type) => {
    const blob = new Blob([text], { type })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = name
    document.body.appendChild(a); a.click(); a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  const exportCsv = () => {
    try { download(buildCsv(state, period), `tutordai-${period}.csv`, 'text/csv;charset=utf-8'); say('ดาวน์โหลด CSV แล้ว') }
    catch { say('ดาวน์โหลดไม่สำเร็จ ลองอีกครั้งครับ') }
  }
  const exportBackup = () => {
    try { download(buildBackup(state), `tutordai-backup-${period}.json`, 'application/json'); say('สำรองข้อมูลแล้ว') }
    catch { say('สำรองข้อมูลไม่สำเร็จ') }
  }
  const importBackup = async (file) => {
    try {
      const next = parseBackup(await file.text())
      replace(next)
      say('กู้คืนข้อมูลเรียบร้อย')
    } catch (e) {
      say(e.message || 'กู้คืนไม่สำเร็จ')
    }
  }

  const doReset = () => { close(); reset(); setPeriod(TODAY_PERIOD); say('รีเซ็ตข้อมูลแล้ว') }
  const doClear = () => { close(); clear(); setTab('students'); say('ล้างข้อมูลแล้ว') }
  const setSettings = (settings) => setState((s) => ({ ...s, settings }))
  const markAllRead = () => setState((s) => ({ ...s, inbox: s.inbox.map((i) => ({ ...i, read: true })) }))

  // ── ตัวเลขบนหัว ──
  const { total, paid, outstanding } = totals(state, period)
  const sessions = useMemo(() => sessionsOn(state, TODAY), [state])
  const sessionsLeft = sessions.filter((c) => !state.sessionState[c.id] || state.sessionState[c.id] === 'todo').length
  const unpaidCount = state.students.filter((s) => statusOf(state, period, s) === 'overdue' || statusOf(state, period, s) === 'pending').length
  const unread = state.inbox.filter((i) => !i.read).length
  const dots = { overview: false, today: sessionsLeft > 0, students: false, billing: unpaidCount > 0, settings: false }
  const active = TABS.find((t) => t.id === tab)

  const open = (kind, extra) => setSheet({ kind, ...extra })

  const monthNav = active?.periodic ? (
    <div className="monthnav">
      <button className="monthnav__b" onClick={() => setPeriod((p) => shiftPeriod(p, -1))}
        disabled={period <= FIRST_PERIOD} aria-label="เดือนก่อนหน้า">‹</button>
      <span className="monthnav__l">{longMonth(period)}</span>
      <button className="monthnav__b" onClick={() => setPeriod((p) => shiftPeriod(p, 1))}
        disabled={period >= TODAY_PERIOD} aria-label="เดือนถัดไป">›</button>
    </div>
  ) : null

  const openTask = (t) => {
    if (t.kind === 'slip') return open('slip', { student: t.student })
    if (t.kind === 'stuck') return open('student', { student: t.student })
  }

  const pane = (
    <>
      {tab === 'home' && (
        <HomeTab state={state} period={period}
          onCheckIn={checkIn} onLeave={markLeave}
          onEditSession={(c) => open('attendance', { session: c })}
          onAddSession={() => open('addSession')}
          onTask={openTask} onSeeAll={() => open('activity')} />
      )}
      {tab === 'students' && (
        <StudentsTab state={state} period={period} desk={isDesk}
          onOpen={(s) => open('student', { student: s })}
          onAdd={() => open('studentEdit', { student: null })} />
      )}
      {tab === 'money' && (
        <MoneyTab state={state} period={period}
          onSlip={(s) => open('slip', { student: s })}
          onRemind={(s) => open('remind', { student: s })}
          onUndoPaid={undoPaid} onSendAll={() => open('line')}
          onAddExpense={() => open('expense', { expense: null })}
          onEditExpense={(e) => open('expense', { expense: e })} />
      )}
    </>
  )

  const overlays = (
    <>
      {sheet?.kind === 'student' && (
        <StudentSheet student={state.students.find((s) => s.id === sheet.student.id) || sheet.student}
          state={state} period={period} onClose={close} onSendProgress={sendProgress}
          onEdit={(s) => open('studentEdit', { student: s })} onRemoveRecord={removeRecord} />
      )}
      {sheet?.kind === 'studentEdit' && (
        <StudentEditSheet student={sheet.student} state={state} onClose={close} onSave={saveStudent} onDelete={deleteStudent} />
      )}
      {sheet?.kind === 'attendance' && (
        <AttendanceSheet session={sheet.session} state={state} onClose={close} onSet={setSessionStatus} />
      )}
      {sheet?.kind === 'addSession' && (
        <AddSessionSheet state={state} onClose={close} onAddToday={addTodaySession} onAddPast={addPastSession} />
      )}
      {sheet?.kind === 'expense' && (
        <ExpenseSheet expense={sheet.expense} onClose={close} onSave={saveExpense} onDelete={deleteExpense} />
      )}
      {sheet?.kind === 'slip' && (
        <SlipSheet student={sheet.student} state={state} period={period} onClose={close}
          onConfirm={confirmSlip} onRemindDiff={remindDiff} />
      )}
      {sheet?.kind === 'remind' && (
        <RemindSheet student={sheet.student} state={state} period={period} onClose={close} onSend={sendRemind} />
      )}
      {sheet?.kind === 'line' && <LineBillSheet state={state} period={period} onClose={close} onConfirm={sendAllBills} />}
      {sheet?.kind === 'settings' && (
        <Sheet title="ตั้งค่า" onClose={close}>
          <SettingsTab state={state} onChange={setSettings}
            theme={theme.choice} onTheme={theme.setChoice}
            onExport={exportCsv} onBackup={exportBackup} onImport={() => fileRef.current?.click()}
            onClearData={() => open('confirmClear')} onReset={() => open('confirmReset')}
            onHelp={() => open('help')} onActivity={() => open('activity')}
            onHistory={() => open('history')} onInbox={() => open('inbox')} unread={unread} />
        </Sheet>
      )}
      {sheet?.kind === 'help' && <HelpSheet onClose={close} />}
      {sheet?.kind === 'activity' && <ActivitySheet state={state} onClose={close} />}
      {sheet?.kind === 'inbox' && (
        <InboxSheet state={state} onClose={close} onMarkAllRead={markAllRead}
          onOpenStudent={(s) => open('student', { student: s })} />
      )}
      {sheet?.kind === 'history' && <HistorySheet state={state} onClose={close} onUndoTo={doUndo} />}

      {sheet?.kind === 'confirmClear' && (
        <Sheet title="เริ่มจากศูนย์?" sub="ลบข้อมูลตัวอย่างทั้งหมด" onClose={close}
          footer={<><button className="btn btn--cta btn--block" onClick={doClear}>ลบข้อมูลตัวอย่าง</button>
            <button className="reset" onClick={close}>ยกเลิก</button></>}>
          <p className="msg">
            นักเรียน ตารางเรียน ประวัติเรียน และรายจ่ายทั้งหมดจะถูกลบ เพื่อให้คุณใส่ข้อมูลจริงของตัวเอง
            {'\n\n'}การตั้งค่า (ชื่อ บัญชี เรท) จะถูกเก็บไว้ · สำรองข้อมูลก่อนได้ที่ปุ่มด้านบน
          </p>
        </Sheet>
      )}
      {sheet?.kind === 'confirmReset' && (
        <Sheet title="รีเซ็ตข้อมูลเดโม?" sub="กลับไปเป็นข้อมูลตัวอย่างตั้งต้น" onClose={close}
          footer={<><button className="btn btn--danger btn--block" onClick={doReset}>รีเซ็ตทั้งหมด</button>
            <button className="reset" onClick={close}>ยกเลิก</button></>}>
          <p className="msg">ทุกอย่างจะกลับไปเป็นข้อมูลตัวอย่างตั้งต้น รวมถึงการตั้งค่าที่คุณแก้ไว้</p>
        </Sheet>
      )}

      <input ref={fileRef} type="file" accept="application/json,.json" hidden
        onChange={(e) => { const f = e.target.files?.[0]; if (f) importBackup(f); e.target.value = '' }} />

      {toast && (
        <div className="toast" role="status" key={toast.id}>
          <span className="toast__txt">{toast.text}</span>
          {toast.cancel && (
            <button className="toast__btn" onClick={() => { cancelSend(toast.cancel); setToast(null) }}>
              ยกเลิกการส่ง
            </button>
          )}
          {toast.undo && !toast.cancel && (
            <button className="toast__btn" onClick={() => { doUndo(0); setToast(null) }}>
              <IconUndo />เลิกทำ
            </button>
          )}
        </div>
      )}
    </>
  )

  if (isDesk) {
    return (
      <div className="desk">
        <aside className="desk__side">
          <div className="desk__brand">
            <b>ติวได้<em>ตังค์</em></b>
            <span>{state.settings.profile.name}</span>
          </div>
          <nav className="desk__nav">
            {TABS.map(({ id, label, Icon }) => (
              <button key={id} className={`desk__navbtn${tab === id ? ' desk__navbtn--on' : ''}`}
                onClick={() => setTab(id)} aria-current={tab === id ? 'page' : undefined}>
                <Icon />{label}
                {dots[id] && tab !== id && <span className="desk__navdot" />}
              </button>
            ))}
          </nav>
          <div className="desk__sidefoot">
            <button className="themebtn" onClick={() => open('inbox')}>
              <IconBell />การแจ้งเตือน
              {unread > 0 && <span className="themebtn__n">{unread}</span>}
            </button>
            <button className="themebtn" onClick={() => open('history')}><IconUndo />ประวัติการแก้ไข</button>
            <button className="themebtn" onClick={theme.toggle}>
              {theme.isDark ? <IconSun /> : <IconMoon />}{theme.isDark ? 'โหมดสว่าง' : 'โหมดมืด'}
            </button>
            <button className="themebtn" onClick={() => open('settings')}><IconSettings />ตั้งค่า</button>
            <button className="themebtn" onClick={() => navigate('/')}><IconClose />ออกจากเดโม</button>
            <p className="disclaimer" style={{ marginTop: 8 }}>เดโม · ข้อมูลสมมติทั้งหมด</p>
          </div>
        </aside>

        <main className="desk__main">
          <div className="desk__bar">
            <div>
              <h1 className="desk__h1">{active.title}</h1>
              <div className="desk__sub">สวัสดี {state.settings.profile.name} · วันนี้ {shortDate(TODAY)}</div>
            </div>
            {monthNav}
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
          <div className="hd__brand">ติวได้<em>ตังค์</em></div>
          <div className="hd__acts">
            <button className="hd__btn" onClick={() => open('inbox')} aria-label={`การแจ้งเตือน ${unread} รายการใหม่`}>
              <IconBell />
              {unread > 0 && <span className="tab__dot" />}
            </button>
            <button className="hd__btn" onClick={theme.toggle} aria-label={theme.isDark ? 'ใช้โหมดสว่าง' : 'ใช้โหมดมืด'}>
              {theme.isDark ? <IconSun /> : <IconMoon />}
            </button>
            <button className="hd__btn" onClick={() => open('settings')} aria-label="ตั้งค่า"><IconSettings /></button>
            <button className="hd__btn" onClick={() => navigate('/')} aria-label="ออกจากเดโม"><IconClose /></button>
          </div>
        </div>
      </header>

      <main className="scroll">
        {monthNav && <div className="pane" style={{ paddingBottom: 0 }}>{monthNav}</div>}
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
