import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../core/store'
import { professionById } from '../professions'
import { copy } from '../copy'
import { summaryText } from '../core/messages'
import { copyText, openLine } from './share'
import { clientById, completionsIn, isCompleted, packageStatus, subjectById } from '../core/ledger'
import { invoiceFor } from '../core/billing'
import { currentEstimate } from '../core/messages'
import { dateThai, money, periodOf, periodThai } from '../core/format'
import { modeThai } from '../copy/tutor'
import { BottomSheet, EmptyState, ProgressBar } from './components'
import { useToast } from './components/Toast'
import SubjectSheet from './SubjectSheet'

export default function SubjectDetail() {
  const { id = '' } = useParams()
  const { state, dispatch, track } = useStore()
  const prof = professionById(state.professionId)
  const v = prof.vocab
  const nav = useNavigate()
  const toast = useToast()
  const [editing, setEditing] = useState(false)
  const [buying, setBuying] = useState(false)
  const [stopping, setStopping] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [limit, setLimit] = useState(20)

  const s = subjectById(state, id)
  if (!s) return <div className="pane"><EmptyState icon="🔍" title="ไม่พบรายการนี้" action={<button className="btn btn--primary" onClick={() => nav('/app/subjects')}>{copy.common.back}</button>} /></div>

  const period = periodOf(state.today)
  const client = clientById(state, s.clientId)
  const pk = packageStatus(state, s)
  const qty = completionsIn(state, s.id, period).length
  const inv = invoiceFor(state, s.id, period)

  const timeline = [
    ...state.units.filter((u) => u.subjectId === s.id && isCompleted(state, u.id))
      .map((u) => ({ at: u.scheduledAt, text: `${v.completionDone} ${u.time}` })),
    ...state.invoices.filter((i) => i.subjectId === s.id)
      .map((i) => ({ at: i.sentAt ?? i.createdAt, text: `บิล ${periodThai(i.period)} ${money(i.total)} · ${i.status}` })),
    ...state.messages.filter((m) => m.subjectId === s.id && m.status === 'sent')
      .map((m) => ({ at: m.sentAt ?? m.createdAt, text: `ส่งข้อความ ${copy.admin.kinds[m.kind]}` })),
  ].sort((a, b) => b.at.localeCompare(a.at))

  return (
    <div className="pane">
      <div className="rowhead">
        <h1 className="h1">{s.name}</h1>
        <button className="btn btn--ghost btn--sm" onClick={() => setEditing(true)}>{copy.detail.edit}</button>
      </div>
      <p className="dim">{client?.name} · {modeThai(s.billing.mode)}</p>

      <section className="card">
        <h2 className="h2">{copy.detail.thisMonth}</h2>
        <div className="kv"><span>{v.units}</span><b className="num">{qty}</b></div>
        <div className="kv">
          <span>{copy.detail.estimate}</span>
          <b className="num">{pk ? copy.detail.fromPackage : money(inv?.total ?? currentEstimate(state, s, period))}</b>
        </div>
      </section>

      {pk && (
        <section className="card">
          <h2 className="h2">{copy.subjects.filters.package}</h2>
          <ProgressBar value={pk.used} max={pk.total} tone={pk.state === 'ok' ? 'ok' : pk.state === 'low' ? 'warn' : 'danger'} />
          <div className="kv"><span>{copy.detail.usedOfTotal}</span><b className="num">{pk.used}/{pk.total}</b></div>
          <div className="kv"><span>{copy.clientView.packRemain}</span><b className="num">{pk.remaining}{pk.overBy ? ` (เกิน ${pk.overBy})` : ''}</b></div>
          <div className="kv"><span>{copy.detail.boughtAt}</span><b>{dateThai(pk.purchasedAt)}</b></div>
          <button className="btn btn--secondary btn--block" onClick={() => setBuying(true)}>{copy.detail.buyPackage}</button>
        </section>
      )}

      <div className="btnrow">
        <button className="btn btn--primary btn--sm" onClick={() => {
          // ตอบ "ลูกเรียนไปกี่ครั้งแล้ว" กลางเดือนได้ทันที ไม่ต้องรอสิ้นเดือน
          const text = summaryText(state, s, period)
          if (!openLine(text)) { void copyText(text); toast.push({ text: copy.admin.lineBlocked, tone: 'warn' }) }
          track('send_summary')
        }}>{copy.detail.sendSummary}</button>
        <button className="btn btn--secondary btn--sm" onClick={() => nav(`/client/${s.clientId}`)}>{copy.detail.clientView}</button>
        <button className="btn btn--secondary btn--sm" onClick={() => nav(`/app/admin?tab=chat&chat=${s.clientId}`)}>{copy.detail.openChat}</button>
        {s.active && <button className="btn btn--ghost btn--sm" onClick={() => setStopping(true)}>{copy.subjects.stop}</button>}
        <button className="btn btn--ghost btn--sm btn--danger-text" onClick={() => setRemoving(true)}>{copy.subjects.remove}</button>
      </div>

      <section className="card">
        <h2 className="h2">{copy.detail.history}</h2>
        <ul className="tl">
          {timeline.slice(0, limit).map((t, i) => (
            <li key={i}><span className="tl__at num">{dateThai(t.at)}</span><span>{t.text}</span></li>
          ))}
        </ul>
        {timeline.length > limit && <button className="linkbtn" onClick={() => setLimit((l) => l + 20)}>{copy.common.more}</button>}
        {timeline.length === 0 && <p className="dim">{copy.detail.noHistory}</p>}
      </section>

      {editing && <SubjectSheet subject={s} onClose={() => setEditing(false)} />}

      {buying && pk && (
        <BottomSheet title={copy.detail.buyConfirm} sub={`${pk.total} ครั้ง · ${money(pk.price)} ${copy.common.baht}`} onClose={() => setBuying(false)}
          footer={
            <button className="btn btn--primary btn--block" onClick={() => {
              dispatch({ type: 'renewPackage', subjectId: s.id })
              track('renew_package', { subjectId: s.id })
              setBuying(false); toast.push({ text: copy.toast.receiptIssued, tone: 'ok' })
            }}>{copy.common.confirm}</button>
          }>
          <p className="p">บันทึกว่าได้รับเงินค่าแพ็กใหม่แล้ว จะออกใบเสร็จและร่างข้อความแจ้ง{client?.name}ให้</p>
        </BottomSheet>
      )}

      {removing && (
        <BottomSheet title={copy.subjects.removeTitle} onClose={() => setRemoving(false)}
          footer={
            <div className="btnrow">
              <button className="btn btn--ghost" onClick={() => setRemoving(false)}>{copy.common.cancel}</button>
              <button className="btn btn--danger" onClick={() => {
                dispatch({ type: 'deleteSubject', subjectId: s.id })
                track('delete_subject')
                setRemoving(false); nav('/app/subjects')
                toast.push({ text: copy.subjects.removed, tone: 'warn' })
              }}>{copy.subjects.remove}</button>
            </div>
          }>
          <p className="p">{copy.subjects.removeWarn}</p>
          <p className="hint">{copy.subjects.removeHint}</p>
        </BottomSheet>
      )}

      {stopping && (
        <BottomSheet title={copy.subjects.stopConfirm} onClose={() => setStopping(false)}
          footer={
            <button className="btn btn--danger btn--block" onClick={() => {
              dispatch({ type: 'deactivateSubject', subjectId: s.id }); setStopping(false); nav('/app/subjects')
            }}>{copy.subjects.stop}</button>
          }>
          <p className="p">จะย้ายไปกลุ่ม "{copy.subjects.inactiveGroup}" ประวัติยังอยู่ครบ</p>
        </BottomSheet>
      )}
    </div>
  )
}
