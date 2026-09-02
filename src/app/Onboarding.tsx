import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../core/store'
import { professionById } from '../professions'
import { copy } from '../copy'
import type { BillingMode } from '../core/types'

interface Row { name: string; clientName: string; lineId?: string; error?: string }

/** แต่ละบรรทัด: ชื่อ, ชื่อผู้จ่าย, LINE — คั่นด้วย , หรือ tab */
export function parseRoster(text: string): Row[] {
  return text.split('\n').map((line) => line.trim()).filter(Boolean).map((line) => {
    const parts = line.split(/[,\t]/).map((p) => p.trim())
    const [name, clientName, lineId] = parts
    if (!name) return { name: line, clientName: '', error: copy.onboarding.noName }
    if (!clientName) return { name, clientName: '', error: copy.onboarding.noPayerName }
    return { name, clientName, lineId: lineId || undefined }
  })
}

export default function Onboarding() {
  const { state, dispatch, resetDemo, track } = useStore()
  const prof = professionById(state.professionId)
  const v = prof.vocab
  const nav = useNavigate()
  const [step, setStep] = useState(1)
  const [name, setName] = useState(state.provider.name)
  const [pp, setPp] = useState(state.provider.promptpayId)
  const [text, setText] = useState('')
  const [mode, setMode] = useState<BillingMode['mode']>('per_unit')

  const rows = useMemo(() => parseRoster(text), [text])
  const good = rows.filter((r) => !r.error)

  const finish = () => {
    dispatch({ type: 'setProvider', name: name.trim() || state.provider.name, promptpayId: pp.trim() })
    const billing: BillingMode =
      mode === 'per_unit' ? { mode: 'per_unit', rate: 400 }
        : mode === 'flat_monthly' ? { mode: 'flat_monthly', amount: 3000 }
          : { mode: 'package', total: 10, price: 3500, purchasedAt: state.today }
    if (good.length) dispatch({ type: 'bulkAddSubjects', rows: good.map(({ name: n, clientName, lineId }) => ({ name: n, clientName, lineId })), billing })
    dispatch({ type: 'onboarded' })
    track('onboarding_finish', { count: good.length })
    nav('/app/today')
  }

  return (
    <div className="pane">
      <h1 className="h1">{step === 1 ? copy.onboarding.step1 : step === 2 ? copy.onboarding.step2 : copy.onboarding.step3}</h1>

      {step === 1 && (
        <>
          <label className="fld">
            <span className="fld__l">{copy.onboarding.providerName}</span>
            <input className="inp" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="fld">
            <span className="fld__l">{copy.onboarding.promptpay}</span>
            <input className="inp" value={pp} onChange={(e) => setPp(e.target.value)} />
          </label>
          <button className="btn btn--primary btn--block" onClick={() => setStep(2)}>{copy.onboarding.next}</button>
        </>
      )}

      {step === 2 && (
        <>
          <label className="fld">
            <span className="fld__l">{copy.onboarding.pasteLabel}</span>
            <textarea className="inp inp--area" rows={7} value={text} placeholder={copy.onboarding.pasteHint}
              onChange={(e) => setText(e.target.value)} />
            <span className="hint">{copy.onboarding.pasteHint}</span>
          </label>

          {rows.length > 0 && (
            <>
              <h2 className="h2">{copy.onboarding.preview}</h2>
              <table className="tbl">
                <thead><tr><th>{v.subject}</th><th>{v.client}</th><th>LINE</th></tr></thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className={r.error ? 'tr--bad' : ''}>
                      <td>{r.name}</td>
                      <td>{r.clientName || <span className="err">{copy.onboarding.parseError}: {r.error}</span>}</td>
                      <td className="dim">{r.lineId ?? ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          <div className="fld">
            <span className="fld__l">{copy.onboarding.defaultMode}</span>
            <div className="chips">
              {(['per_unit', 'flat_monthly', 'package'] as BillingMode['mode'][]).map((m) => (
                <button key={m} className={`chip${mode === m ? ' chip--on' : ''}`} onClick={() => setMode(m)}>
                  {copy.waitlist.modeLabels[m]}
                </button>
              ))}
            </div>
          </div>

          <button className="btn btn--primary btn--block" disabled={good.length === 0} onClick={finish}>
            {copy.onboarding.finish} ({good.length})
          </button>
          <button className="linkbtn" onClick={() => { resetDemo('default'); nav('/app/today') }}>
            {copy.onboarding.useSample}
          </button>
        </>
      )}
    </div>
  )
}
