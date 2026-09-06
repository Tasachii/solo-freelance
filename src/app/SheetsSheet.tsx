import { useState } from 'react'
import { useStore } from '../core/store'
import { copy } from '../copy'
import { isWebAppUrl, type SheetsConfig } from '../core/sheets'
import { pushToSheets, writeSheetsConfig } from './sheetsSync'
import { BottomSheet } from './components'
import { useToast } from './components/Toast'

/**
 * ตั้งค่าสำรองลง Google Sheets ของครูเอง
 * ปุ่มเดียวคือ "ทดสอบและบันทึก" — ไม่บันทึกค่าที่ยังส่งไม่ผ่าน จะได้ไม่มีการตั้งค่าที่ดูเหมือนใช้ได้แต่เงียบ
 */
export function SheetsSheet({ current, onSaved, onClose }: {
  current?: SheetsConfig; onSaved: (c?: SheetsConfig) => void; onClose: () => void
}) {
  const { state } = useStore()
  const toast = useToast()
  const c = copy.sheets
  const [url, setUrl] = useState(current?.url ?? '')
  const [token, setToken] = useState(current?.token ?? '')
  const [auto, setAuto] = useState(current?.auto ?? true)
  const [busy, setBusy] = useState(false)
  const [urlBad, setUrlBad] = useState(false)

  const save = async () => {
    if (!isWebAppUrl(url)) { setUrlBad(true); return }
    if (!token.trim()) return
    setBusy(true)
    const at = new Date().toISOString()
    const next: SheetsConfig = { url: url.trim(), token: token.trim(), auto }
    const res = await pushToSheets(state, next, at)
    setBusy(false)
    if (!res.ok) {
      toast.push({ text: res.reason === 'rejected' ? c.badToken : c.failed, tone: 'danger' })
      return
    }
    const saved: SheetsConfig = { ...next, lastSyncAt: at, lastSyncConfirmed: res.confirmed }
    writeSheetsConfig(saved)
    onSaved(saved)
    toast.push({ text: res.confirmed ? c.saved : c.sentUnconfirmed, tone: res.confirmed ? 'ok' : 'warn' })
    onClose()
  }

  const disconnect = () => {
    writeSheetsConfig(undefined)
    onSaved(undefined)
    toast.push({ text: c.disconnected, tone: 'ok' })
    onClose()
  }

  return (
    <BottomSheet title={c.title} sub={c.sub} onClose={onClose}
      footer={
        <button className="btn btn--primary btn--block" disabled={busy || !token.trim() || !url.trim()} onClick={() => void save()}>
          {busy ? c.testing : c.testAndSave}
        </button>
      }>
      <label className="fld">
        <span className="fld__l">{c.fieldUrl}</span>
        <input className="inp" value={url} inputMode="url" aria-invalid={urlBad || undefined}
          placeholder="https://script.google.com/macros/s/…/exec"
          onChange={(e) => { setUrl(e.target.value); setUrlBad(false) }} />
        {urlBad ? <span className="fld__err">{c.badUrl}</span> : <span className="hint">{c.urlHint}</span>}
      </label>
      <label className="fld">
        <span className="fld__l">{c.fieldToken}</span>
        <input className="inp" value={token} onChange={(e) => setToken(e.target.value)} />
        <span className="hint">{c.tokenHint}</span>
      </label>
      <label className="check">
        <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} />
        <span>{c.autoLabel}</span>
      </label>
      {current?.lastSyncAt && (
        <p className="hint">{current.lastSyncConfirmed === false ? c.lastUnconfirmed : c.lastAt} {new Date(current.lastSyncAt).toLocaleString('th-TH')}</p>
      )}
      <details className="hint hint--fold"><summary>{c.howTo}</summary>{c.steps}</details>
      {current && (
        <div className="danger-zone">
          <button className="btn btn--danger-text btn--sm" onClick={disconnect}>{c.disconnect}</button>
          <span className="hint">{c.disconnectHint}</span>
        </div>
      )}
    </BottomSheet>
  )
}
