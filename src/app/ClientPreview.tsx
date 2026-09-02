import { Link, useParams } from 'react-router-dom'
import { useStore } from '../core/store'
import { copy } from '../copy'
import { PROMPTPAY_DISPLAY } from '../platform/config'
import { clientById, packageStatus } from '../core/ledger'
import { invoiceFor } from '../core/billing'
import { receiptOfInvoice } from '../core/receipts'
import { money, periodOf, periodThai } from '../core/format'
import { DemoBadge, EmptyState, ProgressBar, QRPlaceholder } from './components'
import type { Invoice, Subject } from '../core/types'

/** มุมมองผู้จ่าย — อ่านอย่างเดียว ตัวเลขทุกตัวมาจาก ledger ชุดเดียวกับฝั่งครู */
export default function ClientPreview() {
  const { clientId = '' } = useParams()
  const { state } = useStore()
  const client = clientById(state, clientId)
  const period = periodOf(state.today)

  if (!client) {
    return (
      <div className="page page--client">
        <DemoBadge />
        <EmptyState icon="🔍" title={copy.errors.notFound}
          action={<Link className="btn btn--ghost" to="/app/today">{copy.clientView.backToApp}</Link>} />
      </div>
    )
  }

  const subjects = state.subjects.filter((s) => s.clientId === clientId && s.active)

  // ผู้จ่ายกดลิงก์มาจากข้อความทวง ซึ่งพูดถึงบิลเดือนที่ค้าง ไม่ใช่เดือนปฏิทินปัจจุบัน
  // จึงต้องโชว์ใบที่ยังค้างก่อน แล้วค่อย fallback เป็นใบของเดือนนี้
  const openOf = (s: Subject): Invoice | undefined =>
    state.invoices
      .filter((i) => i.subjectId === s.id && (i.status === 'sent' || i.status === 'overdue'))
      .sort((a, b) => a.period.localeCompare(b.period))[0]

  const rows: { subject: Subject; invoice?: Invoice }[] = subjects.map((s) => ({
    subject: s, invoice: openOf(s) ?? invoiceFor(state, s.id, period),
  }))
  const billed = rows.filter((r) => r.invoice && r.invoice.status !== 'draft')
  const shownPeriod = billed[0]?.invoice?.period ?? period
  const total = billed.reduce((n, r) => n + (r.invoice?.total ?? 0), 0)
  const allPaid = billed.length > 0 && billed.every((r) => r.invoice?.status === 'paid')
  const receipt = billed.map((r) => receiptOfInvoice(state, r.invoice!.id)).find(Boolean)

  return (
    <div className="page page--client">
      <div className="cbanner">
        <span>{copy.clientView.banner}</span>
        <Link className="btn btn--sm btn--ghost" to="/app/today">{copy.clientView.backToApp}</Link>
      </div>

      <h1 className="cv__h1">{copy.clientView.invoiceTitle}</h1>
      <p className="cv__who">{client.name} · {periodThai(shownPeriod)}</p>

      {billed.length === 0 ? (
        <EmptyState icon="🧾" title={copy.clientView.noInvoice} desc={copy.billing.firstMonthHint} />
      ) : (
        <>
          <ul className="cv__lines">
            {billed.map((r) => (
              <li key={r.subject.id}>
                <span>{r.subject.name}</span>
                <b className="num">{money(r.invoice!.total)} {copy.common.baht}</b>
              </li>
            ))}
            <li className="cv__lines--sum">
              <span>{copy.receipt.total}</span>
              <b className="num">{money(total)} {copy.common.baht}</b>
            </li>
          </ul>

          {allPaid ? (
            <div className="paid-ok">
              <span className="paid-ok__txt">{copy.clientView.paid}</span>
              {receipt && (
                <Link className="btn btn--sm btn--primary" to={`/receipt/${receipt.id}`}>{copy.clientView.viewReceipt}</Link>
              )}
            </div>
          ) : (
            <div className="cv__pay">
              <QRPlaceholder label={copy.clientView.scanToPay} sub={PROMPTPAY_DISPLAY} />
              <p className="hint">{copy.clientView.sample}</p>
            </div>
          )}
        </>
      )}

      {subjects.map((s) => {
        const pk = packageStatus(state, s)
        if (!pk) return null
        return (
          <div key={s.id} className="card cv__pack">
            <div className="cv__packhd">
              <span>{s.name}</span>
              <b className="num">{copy.clientView.packRemain} {pk.remaining}/{pk.total}</b>
            </div>
            <ProgressBar value={pk.used} max={pk.total}
              tone={pk.state === 'exhausted' ? 'danger' : pk.state === 'low' ? 'warn' : 'ok'} />
          </div>
        )
      })}

      <p className="hint cv__fine">{copy.demoBadge}</p>
    </div>
  )
}
