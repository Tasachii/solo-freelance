import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../core/store'
import { professionById } from '../professions'
import { copy } from '../copy'
import { clientById, subjectById } from '../core/ledger'
import { dateThai, money } from '../core/format'
import { DemoBadge, EmptyState } from './components'

export default function Receipt() {
  const { id = '' } = useParams()
  const { state, track } = useStore()
  const nav = useNavigate()
  const prof = professionById(state.professionId)
  const rc = state.receipts.find((r) => r.id === id)

  useEffect(() => { if (rc) track('receipt_view', { id }) }, [rc, id, track])

  if (!rc) {
    return (
      <div className="page">
        <EmptyState icon="🧾" title={copy.receipt.notFound}
          action={<button className="btn btn--primary" onClick={() => nav('/app/billing')}>{copy.common.back}</button>} />
      </div>
    )
  }

  const pay = state.payments.find((p) => p.id === rc.paymentId)!
  const inv = state.invoices.find((i) => i.id === pay.invoiceId)!
  const subject = subjectById(state, inv.subjectId)
  const client = clientById(state, inv.clientId)

  return (
    <div className="page page--paper">
      <div className="paperbar no-print">
        <button className="btn btn--ghost btn--sm" onClick={() => nav('/app/billing')}>‹ {copy.common.back}</button>
        <DemoBadge />
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
          <div><dt>{copy.receipt.payee}</dt><dd>{state.provider.name} · {state.provider.promptpayId}</dd></div>
          <div><dt>{copy.receipt.payer}</dt><dd>{client?.name ?? '—'}{subject ? ` (${subject.name})` : ''}</dd></div>
          <div><dt>{copy.receipt.issuedAt}</dt><dd>{dateThai(rc.issuedAt)}</dd></div>
        </dl>

        <table className="paper__tbl">
          <thead><tr><th>{copy.receipt.item}</th><th className="r">{copy.receipt.amount}</th></tr></thead>
          <tbody>
            {inv.lines.map((l, i) => (
              <tr key={i}><td>{l.description}</td><td className="r num">{money(l.amount)}</td></tr>
            ))}
          </tbody>
          <tfoot><tr><td>{copy.receipt.total}</td><td className="r num">{money(pay.amount)} {copy.common.baht}</td></tr></tfoot>
        </table>

        <p className="paper__ok">
          {pay.slipVerified ? copy.receipt.verified : `${copy.receipt.manual}${state.provider.name}`}
        </p>
        <p className="paper__fine">
          ออกโดย {copy.brand.name} ในนาม{state.provider.name} · {copy.receipt.footer}
        </p>
        <p className="paper__fine">{copy.demoBadge} · {prof.name}</p>
      </article>

      <div className="btnrow no-print" style={{ justifyContent: 'center' }}>
        <button className="btn btn--primary" onClick={() => window.print()}>{copy.receipt.download}</button>
        <button className="btn btn--secondary" onClick={() => nav('/app/receipts')}>{copy.billing.allReceipts}</button>
      </div>
    </div>
  )
}
