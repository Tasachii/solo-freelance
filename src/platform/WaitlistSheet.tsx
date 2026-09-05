import { useState } from 'react'
import { useStore } from '../core/store'
import { professionById, professions } from '../professions'
import { copy } from '../copy'
import { BottomSheet } from '../app/components'
import { WAITLIST_ENDPOINT, WAITLIST_FIELDS } from './config'
import type { WaitlistEntry } from '../core/types'

const MODES = ['per_unit', 'flat_monthly', 'package'] as const

export default function WaitlistSheet({ preselect, onClose }: { preselect?: string; onClose: () => void }) {
  const { dispatch, track } = useStore()
  const [professionId, setProfessionId] = useState(preselect ?? professions.find((p) => p.status === 'live')?.id ?? professions[0].id)
  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  const [size, setSize] = useState('')
  const [modes, setModes] = useState<string[]>([])
  const [concierge, setConcierge] = useState(false)
  const [err, setErr] = useState<{ name?: string; contact?: string }>({})
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)

  const toggleMode = (m: string) =>
    setModes((p) => (p.includes(m) ? p.filter((x) => x !== m) : [...p, m]))

  const submit = async () => {
    const e: typeof err = {}
    if (!name.trim()) e.name = copy.common.required
    if (!contact.trim()) e.contact = copy.common.required
    setErr(e)
    if (Object.keys(e).length) return

    setSending(true)
    const entry: WaitlistEntry = {
      professionId, name: name.trim(), contact: contact.trim(),
      size: size || undefined, modes: modes.length ? modes : undefined,
      concierge: professionById(professionId).conciergeAvailable ? concierge : undefined,
      at: new Date().toISOString(),
    }
    if (!dispatch({ type: 'waitlist', entry })) { setSending(false); return }
    track('waitlist_submit', { professionId })

    if (WAITLIST_ENDPOINT) {
      try {
        const body = new FormData()
        for (const [k, field] of Object.entries(WAITLIST_FIELDS)) {
          const v = (entry as unknown as Record<string, unknown>)[k]
          if (v !== undefined && v !== null && v !== '') body.append(field, Array.isArray(v) ? v.join(', ') : String(v))
        }
        await fetch(WAITLIST_ENDPOINT, { method: 'POST', mode: 'no-cors', body })
      } catch (error) {
        console.warn('[solo] waitlist post failed, kept locally', error)
      }
    }
    setSending(false)
    setDone(true)
  }

  if (done) {
    return (
      <BottomSheet title={copy.waitlist.thanks} onClose={onClose}
        footer={<button className="btn btn--primary btn--block" onClick={onClose}>{copy.common.close}</button>}>
        <p className="p">{copy.waitlist.privacy}</p>
      </BottomSheet>
    )
  }

  return (
    <BottomSheet
      title={copy.waitlist.title} sub={copy.waitlist.sub} onClose={onClose}
      footer={
        <button className="btn btn--primary btn--block" onClick={submit} disabled={sending}>
          {sending ? copy.waitlist.sending : copy.waitlist.submit}
        </button>
      }
    >
      <label className="fld">
        <span className="fld__l">{copy.waitlist.profession}</span>
        <select className="inp" value={professionId} onChange={(e) => setProfessionId(e.target.value)}>
          {professions.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </label>

      <label className="fld">
        <span className="fld__l">{copy.waitlist.name}</span>
        <input className="inp" value={name} onChange={(e) => setName(e.target.value)} />
        {err.name && <span className="fld__err">{err.name}</span>}
      </label>

      <label className="fld">
        <span className="fld__l">{copy.waitlist.contact}</span>
        <input className="inp" value={contact} onChange={(e) => setContact(e.target.value)} />
        {err.contact && <span className="fld__err">{err.contact}</span>}
      </label>

      <div className="fld">
        <span className="fld__l">{copy.waitlist.size}</span>
        <div className="chips">
          {copy.waitlist.sizes.map((sz) => (
            <button key={sz} className={`chip${size === sz ? ' chip--on' : ''}`}
              aria-pressed={size === sz} onClick={() => setSize(sz)}>{sz}</button>
          ))}
        </div>
      </div>

      <div className="fld">
        <span className="fld__l">{copy.waitlist.modes}</span>
        <div className="chips">
          {MODES.map((m) => (
            <button key={m} className={`chip${modes.includes(m) ? ' chip--on' : ''}`}
              aria-pressed={modes.includes(m)} onClick={() => toggleMode(m)}>
              {copy.waitlist.modeLabels[m]}
            </button>
          ))}
        </div>
      </div>

      {professionById(professionId).conciergeAvailable && (
        <label className="check">
          <input type="checkbox" checked={concierge} onChange={(e) => setConcierge(e.target.checked)} />
          <span>{copy.waitlist.concierge}</span>
        </label>
      )}

      <p className="hint">
        {copy.waitlist.privacy}{!WAITLIST_ENDPOINT && ` · ${copy.waitlist.demoNote}`}
      </p>
    </BottomSheet>
  )
}
