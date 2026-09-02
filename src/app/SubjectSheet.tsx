import { useState } from 'react'
import { useStore } from '../core/store'
import { professionById } from '../professions'
import { copy } from '../copy'
import { BottomSheet } from './components'
import type { BillingMode, Subject } from '../core/types'

type Mode = BillingMode['mode']

export default function SubjectSheet({ subject, onClose }: { subject?: Subject; onClose: () => void }) {
  const { state, dispatch } = useStore()
  const prof = professionById(state.professionId)
  const v = prof.vocab
  const client = subject ? state.clients.find((c) => c.id === subject.clientId) : undefined
  const b = subject?.billing

  const [name, setName] = useState(subject?.name ?? '')
  const [clientName, setClientName] = useState(client?.name ?? '')
  const [lineId, setLineId] = useState(client?.lineId ?? '')
  const [mode, setMode] = useState<Mode>(b?.mode ?? 'per_unit')
  const [rate, setRate] = useState(String(b?.mode === 'per_unit' ? b.rate : 400))
  const [flat, setFlat] = useState(String(b?.mode === 'flat_monthly' ? b.amount : 3000))
  const [pkTotal, setPkTotal] = useState(String(b?.mode === 'package' ? b.total : 10))
  const [pkPrice, setPkPrice] = useState(String(b?.mode === 'package' ? b.price : 3500))
  const [err, setErr] = useState<Record<string, string>>({})

  const pos = (x: string) => Number.isFinite(Number(x)) && Number(x) > 0

  const save = () => {
    const e: Record<string, string> = {}
    if (!name.trim()) e.name = copy.common.required
    if (!clientName.trim()) e.clientName = copy.common.required
    if (mode === 'per_unit' && !pos(rate)) e.rate = copy.common.numberPositive
    if (mode === 'flat_monthly' && !pos(flat)) e.flat = copy.common.numberPositive
    if (mode === 'package' && (!pos(pkTotal) || !pos(pkPrice))) e.pk = copy.common.numberPositive
    setErr(e)
    if (Object.keys(e).length) return

    const billing: BillingMode =
      mode === 'per_unit' ? { mode: 'per_unit', rate: Number(rate) }
        : mode === 'flat_monthly' ? { mode: 'flat_monthly', amount: Number(flat) }
          : {
            mode: 'package', total: Number(pkTotal), price: Number(pkPrice),
            purchasedAt: b?.mode === 'package' ? b.purchasedAt : state.today,
          }

    const id = subject?.id ?? `s-${Date.now().toString(36)}`
    const clientId = subject?.clientId ?? `c-${Date.now().toString(36)}`
    dispatch({
      type: 'upsertSubject',
      subject: {
        id, name: name.trim(), clientId, billing,
        label: subject?.label, active: subject?.active ?? true, createdAt: subject?.createdAt ?? state.today,
      },
      clientName: clientName.trim(),
      lineId: lineId.trim() || undefined,
    })
    onClose()
  }

  return (
    <BottomSheet
      title={subject ? `แก้ไข ${subject.name}` : `+ ${v.subject}`}
      onClose={onClose}
      footer={<button className="btn btn--primary btn--block" onClick={save}>{copy.common.save}</button>}
    >
      <label className="fld">
        <span className="fld__l">{copy.subjects.fieldName}</span>
        <input className="inp" value={name} onChange={(e) => setName(e.target.value)} />
        {err.name && <span className="fld__err">{err.name}</span>}
      </label>
      <label className="fld">
        <span className="fld__l">{copy.subjects.fieldClient}</span>
        <input className="inp" value={clientName} onChange={(e) => setClientName(e.target.value)} />
        {err.clientName && <span className="fld__err">{err.clientName}</span>}
      </label>
      <label className="fld">
        <span className="fld__l">{copy.subjects.fieldLine}</span>
        <input className="inp" value={lineId} onChange={(e) => setLineId(e.target.value)} />
      </label>

      <div className="fld">
        <span className="fld__l">{copy.subjects.fieldMode}</span>
        <div className="chips">
          {(['per_unit', 'flat_monthly', 'package'] as Mode[]).map((m) => (
            <button key={m} className={`chip${mode === m ? ' chip--on' : ''}`} aria-pressed={mode === m} onClick={() => setMode(m)}>
              {copy.waitlist.modeLabels[m]}
            </button>
          ))}
        </div>
      </div>

      {mode === 'per_unit' && (
        <label className="fld">
          <span className="fld__l">{copy.subjects.fieldRate}</span>
          <input className="inp" inputMode="numeric" value={rate} onChange={(e) => setRate(e.target.value)} />
          {err.rate && <span className="fld__err">{err.rate}</span>}
        </label>
      )}
      {mode === 'flat_monthly' && (
        <label className="fld">
          <span className="fld__l">{copy.subjects.fieldFlat}</span>
          <input className="inp" inputMode="numeric" value={flat} onChange={(e) => setFlat(e.target.value)} />
          {err.flat && <span className="fld__err">{err.flat}</span>}
        </label>
      )}
      {mode === 'package' && (
        <>
          <div className="fld">
            <span className="fld__l">{copy.subjects.fieldPackTotal}</span>
            <div className="chips">
              {(prof.packagePresets ?? [10, 20]).map((n) => (
                <button key={n} className={`chip${pkTotal === String(n) ? ' chip--on' : ''}`} onClick={() => setPkTotal(String(n))}>{n}</button>
              ))}
            </div>
            <input className="inp" inputMode="numeric" value={pkTotal} onChange={(e) => setPkTotal(e.target.value)} />
          </div>
          <label className="fld">
            <span className="fld__l">{copy.subjects.fieldPackPrice}</span>
            <input className="inp" inputMode="numeric" value={pkPrice} onChange={(e) => setPkPrice(e.target.value)} />
            {err.pk && <span className="fld__err">{err.pk}</span>}
          </label>
        </>
      )}
    </BottomSheet>
  )
}
