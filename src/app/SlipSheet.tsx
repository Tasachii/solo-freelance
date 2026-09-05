import { useEffect, useState } from 'react'
import { useStore } from '../core/store'
import { copy } from '../copy'
import { money } from '../core/format'
import { BottomSheet, Skeleton } from './components'
import { useToast } from './components/Toast'
import { mkMessage, slipRequestText } from '../core/messages'
import type { Invoice } from '../core/types'
import { seedOf } from '../core/share'

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

  const real = state.mode === 'real'

  useEffect(() => {
    if (phase !== 'checking' || real) return
    const t = window.setTimeout(() => {
      // ผลผูกกับเลขที่ใบแจ้ง ไม่ใช่ Math.random — เดโมเดิมสุ่มใหม่ทุกครั้ง
      // ตอนโชว์กรรมการอาจขึ้น "ยอดไม่ตรง" โดยไม่ตั้งใจ และเทสก็แกว่งตาม
      const res = rollSlip(invoice.total, seedOf(invoice.id))
      setPhase(res.phase); setSlipAmount(res.slipAmount)
      track('slip_verify', { result: res.phase })
    }, 1500)
    return () => window.clearTimeout(t)
  }, [phase, invoice.total, track, real])

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
    <BottomSheet title={real ? copy.billing.attachSlipReal : copy.billing.attachSlip} sub={`${money(invoice.total)} ${copy.common.baht}`} onClose={onClose}
      footer={
        real
          // โหมดจริง: ไม่มีการอ่านสลิปอัตโนมัติ ครูเทียบยอดเองแล้วกดยืนยัน
          // การสุ่มผลบนสลิปจริงคือหายนะ — บอกว่ายอดไม่ตรงทั้งที่ตรง
          ? <div className="btnrow">
              <button className="btn btn--primary" onClick={() => pay(invoice.total, false)}>{copy.billing.slipRealOk}</button>
              <button className="btn btn--secondary" onClick={() => {
                const v = Number(window.prompt(copy.billing.slipRealOther, String(invoice.total)) ?? '')
                if (Number.isFinite(v) && v > 0) pay(v, false)
              }}>{copy.billing.slipRealOther}</button>
            </div>
        : phase === 'idle'
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
          <div className="kv"><span>{copy.billing.slipAmount}</span><b className="num">{money(slipAmount ?? 0)}</b></div>
          <div className="kv"><span>{copy.billing.invoiceAmount}</span><b className="num">{money(invoice.total)}</b></div>
        </>
      )}
      {phase === 'unreadable' && <p className="p">{copy.billing.slipUnreadable}</p>}
      {real
        ? <p className="p dim">{copy.billing.slipReal}</p>
        : phase === 'idle' && <p className="p dim">{copy.billing.slipSim}</p>}
    </BottomSheet>
  )
}
