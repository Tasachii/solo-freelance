import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../core/store'
import { professionById } from '../professions'
import { copy } from '../copy'
import { cancelledText, mkMessage, movedText } from '../core/messages'
import { addDays } from '../core/format'
import { isCompleted, packageStatus, subjectById, unitsOn } from '../core/ledger'
import { dateThaiFull, dateThai } from '../core/format'
import { BottomSheet, ConfirmSheet, EmptyState, Skeleton, StatCard } from './components'
import { useToast } from './components/Toast'

export default function Today() {
  const { state, dispatch, track, hydrated } = useStore()
  const prof = professionById(state.professionId)
  const v = prof.vocab
  const toast = useToast()
  const nav = useNavigate()
  const [adding, setAdding] = useState(false)
  const [newUnit, setNewUnit] = useState({ subjectId: '', time: '17:00', label: '' })

  const units = useMemo(() => unitsOn(state, state.today), [state])
  // คาบที่งดไปแล้ววันนี้ — โชว์แยกไว้ให้กู้คืนได้ ไม่ใช่หายไปเฉย ๆ
  const cancelled = useMemo(
    () => state.units.filter((u) => u.scheduledAt === state.today && u.cancelled), [state])

  // คาบที่กำลังเลื่อน
  const [moving, setMoving] = useState<string | null>(null)
  const movingUnit = state.units.find((u) => u.id === moving)
  const [mDate, setMDate] = useState('')
  const [mTime, setMTime] = useState('')
  const [confirmCancel, setConfirmCancel] = useState(false)

  const done = units.filter((u) => isCompleted(state, u.id)).length

  const nextDay = useMemo(() => {
    const future = state.units.filter((u) => u.scheduledAt > state.today).sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
    return future[0]?.scheduledAt
  }, [state])

  if (!hydrated) return <div className="pane"><Skeleton rows={4} /></div>

  const openMove = (unitId: string, time: string) => {
    setMoving(unitId); setMDate(addDays(state.today, 1)); setMTime(time)
  }

  /** เลื่อน/งดคาบ แล้วร่างข้อความแจ้ง — ครูกดส่งเองที่แท็บแอดมิน */
  const draftNotice = (unitId: string, kind: 'moved' | 'cancelled', to?: { date: string; time: string }) => {
    const u = state.units.find((x) => x.id === unitId)
    const subject = u && subjectById(state, u.subjectId)
    if (!u || !subject) return
    const text = kind === 'moved' && to
      ? movedText(state, subject, { date: u.scheduledAt }, to)
      : cancelledText(state, subject, u.scheduledAt)
    const key = `${kind}:${unitId}:${to ? `${to.date}${to.time}` : u.scheduledAt}`
    dispatch({ type: 'addMessage', message: mkMessage(state, kind, subject.clientId, subject.id, text, key, { unitId }) })
  }

  const onComplete = (unitId: string, subjectId: string) => {
    if (!dispatch({ type: 'complete', unitId })) return
    track('complete_unit', { subjectId })
    const subject = subjectById(state, subjectId)
    if (!subject) return
    // คำนวณสถานะแพ็กหลังบวกครั้งนี้แล้ว เพื่อบอกผลทันทีไม่ต้องรอสิ้นเดือน
    const pk = packageStatus({ ...state, completions: [...state.completions, { unitId, completedAt: state.today }] }, subject)
    const undo = { label: copy.common.undo, run: () => dispatch({ type: 'uncomplete', unitId }) }

    if (!pk) { toast.push({ text: copy.toast.completed, tone: 'ok', action: undo }); return }
    if (pk.overBy >= 1) {
      toast.push({
        text: `${copy.toast.packExhausted} (${subject.name})`, tone: 'danger',
        action: { label: copy.toast.packExhaustedCta, run: () => nav('/app/admin?tab=drafts') },
      })
    } else if (pk.remaining >= 1 && pk.remaining <= 2) {
      toast.push({ text: `${copy.toast.packLow} (${subject.name} ${pk.remaining}/${pk.total})`, tone: 'warn', action: undo })
    } else {
      toast.push({ text: copy.toast.completed, tone: 'ok', action: undo })
    }
  }

  return (
    <div className="pane">
      {state.provider.name && <p className="greet">{copy.today.greet} {state.provider.name}</p>}
      <h1 className="h1 h1--tight">{dateThaiFull(state.today)}</h1>

      <div className="stats">
        <StatCard label={copy.today.statUnits} value={`${units.length} ${v.units}`} tone="brand" />
        <StatCard label={copy.today.statDone} value={String(done)} tone="ok" />
        <StatCard label={copy.today.statLeft} value={String(units.length - done)} tone={units.length - done ? 'warn' : undefined} />
      </div>

      {units.length === 0 ? (
        <EmptyState
          icon="☕" art title={`${copy.today.emptyTitle}`}
          desc={nextDay ? `${copy.today.emptyNext}: ${dateThai(nextDay)}` : undefined}
          action={<button className="btn btn--secondary" onClick={() => setAdding(true)}>+ {copy.today.addUnit}</button>}
        />
      ) : (
        <ul className="rows">
          {units.map((u) => {
            const s = subjectById(state, u.subjectId)
            if (!s) return null
            const pk = packageStatus(state, s)
            const isDone = isCompleted(state, u.id)
            return (
              <li className={`urow${isDone ? ' urow--done' : ''}`} key={u.id}>
                <span className="urow__time num">{u.time}</span>
                <span className="urow__main">
                  <span className="urow__name">{s.name}</span>
                  <span className="urow__meta">
                    {u.label ?? s.label}
                    {pk && <i className={`pk pk--${pk.state}`}>{pk.overBy ? `เกิน ${pk.overBy}` : `เหลือ ${pk.remaining}/${pk.total}`}</i>}
                  </span>
                </span>
                {isDone ? (
                  <button className="btn btn--ghost btn--sm" onClick={() => dispatch({ type: 'uncomplete', unitId: u.id })}>
                    {copy.today.fixLabel}
                  </button>
                ) : (
                  <>
                    <button className="btn btn--ghost btn--sm urow__move" aria-label={`${copy.today.move} ${s.name}`}
                      onClick={() => openMove(u.id, u.time)}>{copy.today.move}</button>
                    <button className="btn btn--primary btn--tap" onClick={() => onComplete(u.id, u.subjectId)}>
                      {v.completion}
                    </button>
                  </>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {movingUnit && (
        <BottomSheet title={copy.today.moveTitle}
          sub={subjectById(state, movingUnit.subjectId)?.name}
          onClose={() => setMoving(null)}
          footer={
            <div className="btnrow">
              <button className="btn btn--primary" disabled={!mDate || !mTime || mDate < state.today} onClick={() => {
                draftNotice(movingUnit.id, 'moved', { date: mDate, time: mTime })
                if (!dispatch({ type: 'rescheduleUnit', unitId: movingUnit.id, date: mDate, time: mTime })) return
                track('unit_rescheduled')
                setMoving(null); toast.push({ text: copy.today.moveDone, tone: 'ok' })
              }}>{copy.today.move}</button>
              <button className="btn btn--danger" onClick={() => setConfirmCancel(true)}>{copy.today.cancelUnit}</button>
            </div>
          }>
          <label className="fld">
            <span className="fld__l">{copy.today.moveDate}</span>
            {/* Android ล้างช่องวันที่ได้ ถ้าปล่อยผ่าน scheduledAt จะเป็น '' แล้วคาบหายถาวร */}
            <input className="inp" type="date" min={state.today} value={mDate}
              onChange={(e) => setMDate(e.target.value)} />
          </label>
          <label className="fld">
            <span className="fld__l">{copy.today.moveTime}</span>
            <input className="inp" type="time" value={mTime} onChange={(e) => setMTime(e.target.value)} />
          </label>
        </BottomSheet>
      )}

      {cancelled.length > 0 && (
        <ul className="rows rows--muted">
          {cancelled.map((u) => {
            const s = subjectById(state, u.subjectId)
            if (!s) return null
            return (
              <li className="urow urow--off" key={u.id}>
                <span className="urow__time num">{u.time}</span>
                <span className="urow__main">
                  <span className="urow__name">{s.name}</span>
                  <span className="urow__meta">{copy.today.cancelledTag}</span>
                </span>
                <button className="btn btn--secondary btn--sm" onClick={() => {
                  if (!dispatch({ type: 'restoreUnit', unitId: u.id })) return
                  track('unit_restored')
                  toast.push({ text: copy.today.restoreDone, tone: 'ok' })
                }}>{copy.today.restoreUnit}</button>
              </li>
            )
          })}
        </ul>
      )}

      {confirmCancel && movingUnit && (
        <ConfirmSheet
          title={copy.today.cancelConfirm}
          hint={copy.today.cancelHint}
          confirmLabel={copy.today.cancelUnit} danger
          onClose={() => setConfirmCancel(false)}
          onConfirm={() => {
            draftNotice(movingUnit.id, 'cancelled')
            if (!dispatch({ type: 'cancelUnit', unitId: movingUnit.id })) return false
            track('unit_cancelled')
            setMoving(null); toast.push({ text: copy.today.cancelDone, tone: 'warn' })
            return true
          }} />
      )}

      {units.length > 0 && (
        <button className="linkbtn" onClick={() => setAdding(true)}>+ {copy.today.addUnit}</button>
      )}

      {adding && (
        <BottomSheet
          title={`+ ${copy.today.addUnit}`} onClose={() => setAdding(false)}
          footer={
            <button className="btn btn--primary btn--block"
              disabled={!newUnit.subjectId}
              onClick={() => {
                if (!dispatch({ type: 'addUnit', subjectId: newUnit.subjectId, time: newUnit.time, label: newUnit.label || undefined })) return
                setAdding(false); toast.push({ text: copy.toast.saved, tone: 'ok' })
              }}>
              {copy.common.save}
            </button>
          }
        >
          <label className="fld">
            <span className="fld__l">{v.subject}</span>
            <select className="inp" value={newUnit.subjectId} onChange={(e) => setNewUnit({ ...newUnit, subjectId: e.target.value })}>
              <option value="">—</option>
              {state.subjects.filter((s) => s.active).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
          <label className="fld">
            <span className="fld__l">{copy.today.fieldTime}</span>
            <input className="inp" type="time" value={newUnit.time} onChange={(e) => setNewUnit({ ...newUnit, time: e.target.value })} />
          </label>
          <label className="fld">
            <span className="fld__l">{copy.today.fieldItem}</span>
            <input className="inp" value={newUnit.label} onChange={(e) => setNewUnit({ ...newUnit, label: e.target.value })} />
          </label>
        </BottomSheet>
      )}
    </div>
  )
}
