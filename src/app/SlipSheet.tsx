import { useEffect, useState } from 'react'
import { useStore } from '../core/store'
import { copy } from '../copy'
import { money } from '../core/format'
import { BottomSheet, Skeleton } from './components'
import { useToast } from './components/Toast'
import { mkMessage, slipRequestText } from '../core/messages'
import type { Invoice } from '../core/types'

type Phase = 'idle' | 'checking' | 'match' | 'mismatch' | 'unreadable'

/** ผลการอ่านสลิป: 80% ตรง / 15% ยอดไม่ตรง / 5% อ่านไม่ออก */
export function rollSlip(total: number, rnd = Math.random()): { phase: Phase; slipAmount?: number } {
  if (rnd < 0.8) return { phase: 'match' }
  if (rnd < 0.95) return { phase: 'mismatch', slipAmount: rnd < 0.875 ? total - 200 : total + 500 }
  return { phase: 'unreadable' }
}

export default function SlipSheet(
  { invoice, onClose, onPaid }: { invoice: Invoice; onClose: () => void; onPaid?: () => void },
) {
  const { state, dispatch, track } = useStore()
  const toast = useToast()
  const [phase, setPhase] = useState<Phase>('idle')
  const [slipAmount, setSlipAmount] = useState<number | undefined>(undefined)

  useEffect(() => {
    if (phase !== 'checking') return
    const t = window.setTimeout(() => {
      const res = rollSlip(invoice.total)
      setPhase(res.phase); setSlipAmount(res.slipAmount)
      track('slip_verify', { result: res.phase })
    }, 1500)
    return () => window.clearTimeout(t)
  }, [phase, invoice.total, track])

  const pay = (amount: number, verified: boolean) => {
    dispatch({ type: 'recordPayment', invoiceId: invoice.id, amount, slipVerified: verified, slipAmount })
    toast.push({ text: copy.toast.receiptIssued, tone: 'ok' })
    onPaid?.(); onClose()
  }

  const askAgain = () => {
    if (slipAmount === undefined) return
    const msg = mkMessage(state, 'faq_reply', invoice.clientId, invoice.subjectId,
      slipRequestText(state, invoice, slipAmount), `slip:${invoice.id}:${slipAmount}`)
    dispatch({ type: 'addMessage', message: msg })
    toast.push({ text: copy.admin.draftedTag, tone: 'warn' })
    onClose()
  }

  return (
    <BottomSheet title={copy.billing.attachSlip} sub={`${money(invoice.total)} ${copy.common.baht}`} onClose={onClose}
      footer={
        phase === 'idle'
          ? <button className="btn btn--primary btn--block" onClick={() => setPhase('checking')}>{copy.billing.slipPick}</button>
          : phase === 'match'
            ? <button className="btn btn--primary btn--block" onClick={() => pay(invoice.total, true)}>{copy.billing.slipConfirm}</button>
            : phase === 'mismatch'
              ? <div className="btnrow">
                  <button className="btn btn--primary" onClick={() => pay(slipAmount!, true)}>{copy.billing.slipAcceptAs}</button>
                  <button className="btn btn--secondary" onClick={askAgain}>{copy.billing.slipAskAgain}</button>
                </div>
              : phase === 'unreadable'
                ? <div className="btnrow">
                    <button className="btn btn--secondary" onClick={() => setPhase('checking')}>{copy.billing.slipRetry}</button>
                    <button className="btn btn--primary" onClick={() => pay(invoice.total, false)}>{copy.billing.slipManual}</button>
                  </div>
                : null
      }>
      {phase === 'checking' && <><p className="p">{copy.billing.slipChecking}</p><Skeleton rows={2} /></>}
      {phase === 'match' && <p className="p">{copy.billing.slipMatch} · {money(invoice.total)} {copy.common.baht}</p>}
      {phase === 'mismatch' && (
        <>
          <p className="p">{copy.billing.slipMismatch}</p>
          <div className="kv"><span>ยอดในสลิป</span><b className="num">{money(slipAmount ?? 0)}</b></div>
          <div className="kv"><span>ยอดในใบแจ้ง</span><b className="num">{money(invoice.total)}</b></div>
        </>
      )}
      {phase === 'unreadable' && <p className="p">{copy.billing.slipUnreadable}</p>}
      {phase === 'idle' && <p className="p dim">จำลองการแนบสลิปจากผู้จ่าย</p>}
    </BottomSheet>
  )
}
