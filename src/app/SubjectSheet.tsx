import { useRef, useState } from 'react'
import { useStore } from '../core/store'
import { packageStatus } from '../core/ledger'
import { professionById } from '../professions'
import { copy } from '../copy'
import { BottomSheet } from './components'
import type { BillingMode, Subject } from '../core/types'
import { isMoney } from '../core/validation'
import { billingChangeIssue, type BillingChangeIssue } from '../core/billing'

type Mode = BillingMode['mode']

export function parseMoneyInput(value: string): number | null {
  const amount = Number(value.replace(/[,\s]/g, ''))
  return isMoney(amount) ? amount : null
}

export function buildBilling(
  mode: Mode,
  values: { rate: string; flat: string; packageTotal: string; packagePrice: string },
  current: BillingMode | undefined,
  today: string,
): BillingMode | null {
  const rate = parseMoneyInput(values.rate)
  const flat = parseMoneyInput(values.flat)
  const total = parseMoneyInput(values.packageTotal)
  const price = parseMoneyInput(values.packagePrice)
  if (mode === 'per_unit') return rate === null ? null : { mode, rate }
  if (mode === 'flat_monthly') return flat === null ? null : { mode, amount: flat }
  if (total === null || price === null) return null
  return {
    mode, total, price,
    purchasedAt: current?.mode === 'package' ? current.purchasedAt : today,
    ...(current?.mode === 'package' && current.carriedUnitIds
      ? { carriedUnitIds: [...current.carriedUnitIds] }
      : {}),
  }
}

export function billingChangeMessage(issue: BillingChangeIssue | null): string | null {
  if (issue === 'unbilled-mode-change') {
    return 'ยังเปลี่ยนวิธีคิดเงินไม่ได้ เพราะมีงานที่ทำแล้วแต่ยังไม่ออกบิล กรุณาปิดยอดเดือนที่ค้างก่อน'
  }
  if (issue === 'unbilled-flat-price-change') {
    return 'ยังเปลี่ยนยอดเหมาไม่ได้ เพราะมีงานที่ทำแล้วแต่ยังไม่ออกบิล กรุณาปิดยอดเดือนที่ค้างก่อน'
  }
  if (issue === 'package-history-mode-change') {
    return 'แพ็กนี้มีประวัติใช้งานแล้ว ให้หยุดรายการเดิมและเพิ่มรายการใหม่เพื่อเปลี่ยนวิธีคิดเงิน'
  }
  return null
}

export default function SubjectSheet({ subject, onClose }: { subject?: Subject; onClose: () => void }) {
  const { state, dispatch } = useStore()
  const prof = professionById(state.professionId)
  const v = prof.vocab
  const client = subject ? state.clients.find((c) => c.id === subject.clientId) : undefined
  const b = subject?.billing

  const seq = useRef(0)
  const [name, setName] = useState(subject?.name ?? '')
  const [clientName, setClientName] = useState(client?.name ?? '')
  const [lineId, setLineId] = useState(client?.lineId ?? '')
  const [mode, setMode] = useState<Mode>(b?.mode ?? 'per_unit')
  const [rate, setRate] = useState(String(b?.mode === 'per_unit' ? b.rate : 400))
  const [flat, setFlat] = useState(String(b?.mode === 'flat_monthly' ? b.amount : 3000))
  // แพ็กที่ลูกค้าใช้ไปแล้ว การแก้จำนวน/ราคาทำให้ยอดคงเหลือกระโดดทันที — ต้องเตือนก่อน
  const usedPack = subject && b?.mode === 'package' ? packageStatus(state, subject)?.used ?? 0 : 0
  const [pkTotal, setPkTotal] = useState(String(b?.mode === 'package' ? b.total : 10))
  const [pkPrice, setPkPrice] = useState(String(b?.mode === 'package' ? b.price : 3500))
  const [err, setErr] = useState<Record<string, string>>({})
  const nextBilling = buildBilling(mode, {
    rate, flat, packageTotal: pkTotal, packagePrice: pkPrice,
  }, b, state.today)
  const changeIssue = subject && nextBilling ? billingChangeIssue(state, subject, nextBilling) : null
  const changeIssueText = billingChangeMessage(changeIssue)

  const save = () => {
    const e: Record<string, string> = {}
    if (!name.trim()) e.name = copy.common.required
    if (!clientName.trim()) e.clientName = copy.common.required
    const billing = nextBilling
    if (mode === 'per_unit' && !billing) e.rate = copy.common.numberPositive
    if (mode === 'flat_monthly' && !billing) e.flat = copy.common.numberPositive
    if (mode === 'package' && !billing) e.pk = copy.common.numberPositive
    setErr(e)
    if (Object.keys(e).length || !billing || changeIssue) return

    // นับต่อท้ายด้วย เพราะเพิ่มสองคนติดกันในมิลลิวินาทีเดียว id จะชนกัน
    const stamp = `${Date.now().toString(36)}${(seq.current += 1).toString(36)}`
    const id = subject?.id ?? `s-${stamp}`
    const clientId = subject?.clientId ?? `c-${stamp}`
    if (!dispatch({
      type: 'upsertSubject',
      subject: {
        id, name: name.trim(), clientId, billing,
        label: subject?.label, active: subject?.active ?? true, createdAt: subject?.createdAt ?? state.today,
      },
      clientName: clientName.trim(),
      lineId: lineId.trim() || undefined,
    })) return
    onClose()
  }

  return (
    <BottomSheet
      title={subject ? `แก้ไข ${subject.name}` : `+ ${v.subject}`}
      onClose={onClose}
      footer={<button className="btn btn--primary btn--block" disabled={!!changeIssue} onClick={save}>{copy.common.save}</button>}
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
        {changeIssueText && <span className="hint hint--bad" role="alert">{changeIssueText}</span>}
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
                <button key={n} className={`chip${pkTotal === String(n) ? ' chip--on' : ''}`}
                  aria-pressed={pkTotal === String(n)} onClick={() => setPkTotal(String(n))}>{n}</button>
              ))}
            </div>
            <input className="inp" inputMode="numeric" value={pkTotal} onChange={(e) => setPkTotal(e.target.value)} />
          </div>
          <label className="fld">
            <span className="fld__l">{copy.subjects.fieldPackPrice}</span>
            <input className="inp" inputMode="numeric" value={pkPrice} onChange={(e) => setPkPrice(e.target.value)} />
            {err.pk && <span className="fld__err">{err.pk}</span>}
            {usedPack > 0 && (
              <span className="hint hint--bad">
                {copy.subjects.packEditWarn.replace('{used}', String(usedPack))}
              </span>
            )}
          </label>
        </>
      )}
    </BottomSheet>
  )
}
