import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../core/store'
import { professionById } from '../professions'
import { copy } from '../copy'
import { daysSinceBackup } from '../core/backup'
import { diffDays } from '../core/format'
import { dashboard, invoiceToActOn } from '../core/selectors'
import { closableSubjects } from '../core/billing'
import { packageStatus } from '../core/ledger'
import { attendanceCsv, billingCsv, download } from '../core/export'
import { receiptOfInvoice } from '../core/receipts'
import { money, periodOf, periodThaiFull } from '../core/format'
import { BottomSheet, EmptyState, Skeleton, StatCard } from './components'
import { useToast } from './components/Toast'
import SlipSheet from './SlipSheet'
import ShareCard from './components/ShareCard'
import type { Invoice } from '../core/types'

export default function Billing() {
  const { state, dispatch, track, hydrated } = useStore()
  const prof = professionById(state.professionId)
  const v = prof.vocab
  const nav = useNavigate()
  const toast = useToast()
  const period = periodOf(state.today)
  const [confirmClose, setConfirmClose] = useState(false)
  const [slipFor, setSlipFor] = useState<Invoice | null>(null)
  const [share, setShare] = useState(false)

  const dash = useMemo(() => dashboard(state, period), [state, period])
  const closable = useMemo(() => closableSubjects(state, period), [state, period])

  const monthly = state.subjects.filter((s) => s.active && s.billing.mode !== 'package')
  const packs = state.subjects
    .filter((s) => s.active)
    .map((s) => ({ s, pk: packageStatus(state, s) }))
    .filter((x) => x.pk && x.pk.state !== 'ok')

  if (!hydrated) return <div className="pane"><Skeleton rows={5} /></div>

  const nothingToDo = state.invoices.length === 0 && closable.length === 0
  if (nothingToDo) {
    return (
      <div className="pane">
        <EmptyState icon="🧾" title={copy.billing.emptyTitle} desc={`${v.completion}ก่อนได้ที่แท็บ${copy.nav.today}`} />
      </div>
    )
  }

  const sinceBackup = daysSinceBackup(state, state.today, diffDays)
  const noBackup = state.mode === 'real' && sinceBackup > 7

  return (
    <div className="pane">
      {noBackup && (
        <p className="warnbar">
          {Number.isFinite(sinceBackup)
            ? copy.billing.backupWarn.replace('{days}', String(sinceBackup))
            : copy.billing.backupNever}
        </p>
      )}
      <section className="card card--brand">
        <h2 className="h2">{periodThaiFull(period)}</h2>
        <div className="stats">
          <StatCard label={copy.billing.dash.expected} value={money(dash.expected)} />
          <StatCard label={copy.billing.dash.received} value={money(dash.received)} tone="ok" />
          <StatCard label={copy.billing.dash.outstanding} value={money(dash.outstanding)} tone="danger" />
        </div>
        <div className="kv">
          <span>{copy.billing.dash.recovered}</span>
          <b className="num">{money(dash.recovered)} {copy.common.baht}</b>
        </div>
        {dash.recovered < 299
          ? <p className="hint">{copy.billing.firstMonthHint}</p>
          : <p className="hint">ช่วยไว้ {money(dash.recovered)} บาท · ค่าบริการ 299 บาท</p>}
        <button className="btn btn--secondary btn--block" onClick={() => setShare(true)}>{copy.billing.share}</button>
      </section>

      {closable.length > 0 && (
        <button className="btn btn--primary btn--block" onClick={() => setConfirmClose(true)}>
          {copy.billing.closeMonth} ({closable.length})
        </button>
      )}

      <h2 className="h2" style={{ marginTop: 'var(--space-4)' }}>{copy.billing.groupMonthly}</h2>
      <ul className="rows">
        {monthly.map((s) => {
          const inv = invoiceToActOn(state, s.id, period)
          const rc = inv ? receiptOfInvoice(state, inv.id) : undefined
          return (
            <li className="srow" key={s.id}>
              <span className="srow__main">
                <span className="srow__name">{s.name}</span>
                <span className="srow__meta">{inv ? `${money(inv.total)} · ${copy.billing.status[inv.status]}` : copy.billing.noInvoices}</span>
              </span>
              {inv?.status === 'draft' && <button className="btn btn--secondary btn--sm" onClick={() => nav('/app/admin?tab=drafts')}>{copy.billing.viewMessage}</button>}
              {(inv?.status === 'sent' || inv?.status === 'overdue') && <button className="btn btn--primary btn--sm" onClick={() => setSlipFor(inv)}>{copy.billing.attachSlip}</button>}
              {inv?.status === 'paid' && rc && <button className="btn btn--ghost btn--sm" onClick={() => nav(`/receipt/${rc.id}`)}>{copy.billing.viewReceipt}</button>}
            </li>
          )
        })}
      </ul>

      {packs.length > 0 && (
        <>
          <h2 className="h2" style={{ marginTop: 'var(--space-4)' }}>{copy.billing.groupPackage}</h2>
          <ul className="rows">
            {packs.map(({ s, pk }) => (
              <li className="srow" key={s.id}>
                <span className="srow__main">
                  <span className="srow__name">{s.name}</span>
                  <span className="srow__meta">{pk!.overBy ? `เกิน ${pk!.overBy}` : `เหลือ ${pk!.remaining}/${pk!.total}`}</span>
                </span>
                <button className="btn btn--secondary btn--sm" onClick={() => nav('/app/admin?tab=drafts')}>{copy.billing.viewMessage}</button>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="btnrow">
        <button className="btn btn--secondary btn--sm" onClick={() => nav('/app/receipts')}>{copy.billing.allReceipts}</button>
        <button className="btn btn--secondary btn--sm" onClick={() => {
          download(attendanceCsv(state, period), `attendance-${period}.csv`, 'text/csv;charset=utf-8')
          window.setTimeout(() => download(billingCsv(state, period), `billing-${period}.csv`, 'text/csv;charset=utf-8'), 350)
          track('export_csv', { period }); toast.push({ text: copy.toast.exported, tone: 'ok' })
        }}>{copy.billing.exportCsv}</button>
      </div>
      <p className="hint">{copy.billing.exportNote}</p>

      {confirmClose && (
        <BottomSheet title={copy.billing.closeMonth} sub={`${copy.billing.closeConfirm} ${closable.length}`} onClose={() => setConfirmClose(false)}
          footer={
            <button className="btn btn--primary btn--block" onClick={() => {
              dispatch({ type: 'closeMonth', period })
              track('close_month', { period, count: closable.length })
              setConfirmClose(false)
              toast.push({ text: `${copy.toast.invoicesCreated} ${closable.length}`, tone: 'ok', action: { label: copy.toast.goSend, run: () => nav('/app/admin?tab=drafts') } })
            }}>{copy.common.confirm}</button>
          }>
          <ul className="rows">
            {closable.map(({ subject, invoice }) => (
              <li className="kv" key={subject.id}><span>{subject.name}</span><b className="num">{money(invoice.total)}</b></li>
            ))}
          </ul>
        </BottomSheet>
      )}

      {slipFor && <SlipSheet invoice={slipFor} onClose={() => setSlipFor(null)} />}
      {share && <ShareCard period={period} recovered={dash.recovered} onClose={() => setShare(false)} />}
    </div>
  )
}
