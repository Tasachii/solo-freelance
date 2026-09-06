import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../core/store'
import { professionById } from '../professions'
import { copy } from '../copy'
import { dateThai, money } from '../core/format'
import { DemoBadge, EmptyState } from './components'

export default function Receipt() {
  const { id = '' } = useParams()
  const { state, track } = useStore()
  const nav = useNavigate()
  const prof = professionById(state.professionId)
  const rc = state.receipts.find((r) => r.id === id)

  useEffect(() => { if (rc) track('receipt_view', { id }) }, [rc, id, track])

  const pay = rc ? state.payments.find((p) => p.id === rc.paymentId) : undefined
  const inv = pay ? state.invoices.find((i) => i.id === pay.invoiceId) : undefined

  if (!rc || !pay || !inv) {
    return (
      <div className="page">
        {state.mode !== 'real' && <DemoBadge />}
        <EmptyState icon="🧾" title={copy.receipt.notFound}
          action={<button className="btn btn--primary" onClick={() => nav('/app/billing')}>{copy.common.back}</button>} />
      </div>
    )
  }

  const real = state.mode === 'real'
  const snapshot = rc.snapshot

  return (
    <div className="page page--paper">
      <div className="paperbar no-print">
        <button className="btn btn--ghost btn--sm" onClick={() => nav('/app/billing')}>‹ {copy.common.back}</button>
        {!real && <DemoBadge />}
      </div>

      <article className="paper">
        <header className="paper__hd">
          <div>
            <h1 className="paper__h1">{copy.receipt.title}</h1>
            <p className="dim">{copy.receipt.titleEn}</p>
          </div>
          <div className="paper__no">
            <span className="dim">{copy.receipt.no}</span>
            <b className="num">{rc.number}</b>
          </div>
        </header>

        <dl className="paper__meta">
          <div><dt>{copy.receipt.payee}</dt><dd>{snapshot.provider} · {snapshot.destination}</dd></div>
          <div><dt>{copy.receipt.payer}</dt><dd>{snapshot.payer}{snapshot.subject ? ` (${snapshot.subject})` : ''}</dd></div>
          <div><dt>{copy.receipt.issuedAt}</dt><dd>{dateThai(rc.issuedAt)}</dd></div>
        </dl>

        <table className="paper__tbl">
          <thead><tr><th>{copy.receipt.item}</th><th className="r">{copy.receipt.amount}</th></tr></thead>
          <tbody>
            {snapshot.lines.map((l, i) => (
              <tr key={i}><td>{l.description}</td><td className="r num">{money(l.amount)}</td></tr>
            ))}
          </tbody>
          <tfoot><tr><td>{copy.receipt.total}</td><td className="r num">{money(snapshot.total)} {copy.common.baht}</td></tr></tfoot>
        </table>

        <p className="paper__ok">
          {snapshot.slipVerified ? copy.receipt.verified : `${copy.receipt.manual}${snapshot.provider}`}
        </p>
        <p className="paper__fine">
          ออกโดย {copy.brand.name} ในนาม{snapshot.provider} · {copy.receipt.footer}
        </p>
        {snapshot.legacyBackfill && <p className="paper__fine">ใบเสร็จเดิม: ชื่อและข้อมูลผู้รับเงินบันทึกจากข้อมูลที่มีขณะอัปเกรด อาจต่างจากวันที่รับเงิน</p>}
        {!real && <p className="paper__fine">{copy.demoBadge} · {prof.name}</p>}
      </article>

      <div className="btnrow no-print" style={{ justifyContent: 'center' }}>
        <button className="btn btn--primary" onClick={() => window.print()}>{copy.receipt.download}</button>
        <button className="btn btn--secondary" onClick={() => nav('/app/receipts')}>{copy.billing.allReceipts}</button>
      </div>
    </div>
  )
}
