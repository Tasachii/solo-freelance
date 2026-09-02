import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../core/store'
import { professionById } from '../professions'
import { copy } from '../copy'
import { isCompleted, packageStatus, subjectById, unitsOn } from '../core/ledger'
import { dateThaiFull, dateThai } from '../core/format'
import { BottomSheet, EmptyState, Skeleton, StatCard } from './components'
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
  const done = units.filter((u) => isCompleted(state, u.id)).length

  const nextDay = useMemo(() => {
    const future = state.units.filter((u) => u.scheduledAt > state.today).sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
    return future[0]?.scheduledAt
  }, [state])

  if (!hydrated) return <div className="pane"><Skeleton rows={4} /></div>

  const onComplete = (unitId: string, subjectId: string) => {
    dispatch({ type: 'complete', unitId })
    track('complete_unit', { subjectId })
    const subject = subjectById(state, subjectId)!
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
      <h1 className="h1">{dateThaiFull(state.today)}</h1>

      <div className="stats">
        <StatCard label={copy.today.statUnits} value={`${units.length} ${v.units}`} />
        <StatCard label={copy.today.statDone} value={String(done)} tone="ok" />
        <StatCard label={copy.today.statLeft} value={String(units.length - done)} tone={units.length - done ? 'warn' : undefined} />
      </div>

      {units.length === 0 ? (
        <EmptyState
          icon="☕" title={`${copy.today.emptyTitle}`}
          desc={nextDay ? `${copy.today.emptyNext}: ${dateThai(nextDay)}` : undefined}
          action={<button className="btn btn--secondary" onClick={() => setAdding(true)}>+ {copy.today.addUnit}</button>}
        />
      ) : (
        <ul className="rows">
          {units.map((u) => {
            const s = subjectById(state, u.subjectId)!
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
                  <button className="btn btn--primary btn--tap" onClick={() => onComplete(u.id, u.subjectId)}>
                    {v.completion}
                  </button>
                )}
              </li>
            )
          })}
        </ul>
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
                dispatch({ type: 'addUnit', subjectId: newUnit.subjectId, time: newUnit.time, label: newUnit.label || undefined })
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
            <span className="fld__l">เวลา</span>
            <input className="inp" type="time" value={newUnit.time} onChange={(e) => setNewUnit({ ...newUnit, time: e.target.value })} />
          </label>
          <label className="fld">
            <span className="fld__l">รายการ</span>
            <input className="inp" value={newUnit.label} onChange={(e) => setNewUnit({ ...newUnit, label: e.target.value })} />
          </label>
        </BottomSheet>
      )}
    </div>
  )
}
