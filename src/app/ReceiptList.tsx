import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../core/store'
import { copy } from '../copy'
import { subjectById } from '../core/ledger'
import { attendanceCsv, billingCsv, download } from '../core/export'
import { dateThai, money, periodOf, periodThaiFull } from '../core/format'
import { EmptyState } from './components'
import { useToast } from './components/Toast'

export default function ReceiptList() {
  const { state, track } = useStore()
  const nav = useNavigate()
  const toast = useToast()
  const [period, setPeriod] = useState(periodOf(state.today))

  const periods = useMemo(() => {
    const set = new Set(state.receipts.map((r) => periodOf(r.issuedAt)))
    set.add(periodOf(state.today))
    return [...set].sort().reverse()
  }, [state])

  const rows = state.receipts.filter((r) => periodOf(r.issuedAt) === period)

  return (
    <div className="pane">
      <h1 className="h1">{copy.billing.allReceipts}</h1>
      <label className="fld">
        <span className="fld__l">เดือน</span>
        <select className="inp" value={period} onChange={(e) => setPeriod(e.target.value)}>
          {periods.map((p) => <option key={p} value={p}>{periodThaiFull(p)}</option>)}
        </select>
      </label>

      {rows.length === 0 ? (
        <EmptyState icon="🧾" title={copy.receipt.emptyMonth} />
      ) : (
        <ul className="rows">
          {rows.map((r) => {
            const pay = state.payments.find((p) => p.id === r.paymentId)
            const inv = pay ? state.invoices.find((i) => i.id === pay.invoiceId) : undefined
            const s = inv ? subjectById(state, inv.subjectId) : undefined
            return (
              <li key={r.id}>
                <button className="srow" onClick={() => nav(`/receipt/${r.id}`)}>
                  <span className="srow__main">
                    <span className="srow__name">{s?.name ?? '—'} · {money(pay?.amount ?? 0)}</span>
                    <span className="srow__meta">{r.number} · {dateThai(r.issuedAt)}</span>
                  </span>
                  <span aria-hidden="true">›</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <button className="btn btn--secondary btn--block" style={{ marginTop: 'var(--space-4)' }} onClick={() => {
        download(attendanceCsv(state, period), `attendance-${period}.csv`, 'text/csv;charset=utf-8')
        window.setTimeout(() => download(billingCsv(state, period), `billing-${period}.csv`, 'text/csv;charset=utf-8'), 350)
        track('export_csv', { period }); toast.push({ text: copy.toast.exported, tone: 'ok' })
      }}>{copy.billing.exportCsv}</button>
    </div>
  )
}
