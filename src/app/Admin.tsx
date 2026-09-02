import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useStore } from '../core/store'
import { professionById } from '../professions'
import { copy } from '../copy'
import { clientById } from '../core/ledger'
import { sortDrafts, mkMessage } from '../core/messages'
import { answer } from '../core/faq'
import { periodOf } from '../core/format'
import { EmptyState, Skeleton, StatCard } from './components'
import { useToast } from './components/Toast'
import type { Message } from '../core/types'

function MessageCard({ m, onSend, onSkip, onEdit }: {
  m: Message; onSend: () => void; onSkip: () => void; onEdit: (t: string) => void
}) {
  const { state } = useStore()
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(m.draft)
  const client = clientById(state, m.clientId)

  return (
    <li className="msg">
      <div className="msg__hd">
        <span className={`tagk tagk--${m.kind}`}>{copy.admin.kinds[m.kind]}</span>
        <span className="dim">{client?.name}</span>
        {m.edited && <span className="tag-neutral">{copy.admin.editedTag}</span>}
      </div>
      {editing ? (
        <textarea className="inp inp--area" value={text} rows={5} onChange={(e) => setText(e.target.value)} />
      ) : (
        <p className="p msg__body">{m.draft}</p>
      )}
      <div className="btnrow">
        {editing ? (
          <button className="btn btn--secondary btn--sm" onClick={() => { onEdit(text); setEditing(false) }}>{copy.common.save}</button>
        ) : (
          <button className="btn btn--ghost btn--sm" onClick={() => setEditing(true)}>{copy.common.edit}</button>
        )}
        <button className="btn btn--primary btn--sm" onClick={onSend}>{copy.common.send}</button>
        <button className="btn btn--ghost btn--sm" onClick={onSkip}>{copy.common.skip}</button>
      </div>
    </li>
  )
}

export default function Admin() {
  const { state, dispatch, track, hydrated } = useStore()
  const prof = professionById(state.professionId)
  const v = prof.vocab
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'chat' ? 'chat' : 'drafts'
  const chatWith = params.get('chat') ?? ''
  const [input, setInput] = useState('')

  const drafts = useMemo(() => state.messages.filter((m) => m.status === 'draft').sort(sortDrafts), [state.messages])
  const period = periodOf(state.today)
  const monthCount = state.messages.filter(
    (m) => (m.status === 'sent' || m.status === 'draft') && periodOf(m.createdAt) === period).length
  const minutes = Math.ceil((monthCount * 10) / 60)

  const send = (m: Message) => {
    dispatch({ type: 'sendMessage', id: m.id })
    track('send_message', { kind: m.kind })
    toast.push({ text: copy.toast.messageSent, tone: 'ok' })
  }

  if (!hydrated) return <div className="pane"><Skeleton rows={4} /></div>

  const clientsList = state.clients.filter((c) => state.subjects.some((s) => s.clientId === c.id))
  const room = state.chats.filter((c) => c.clientId === chatWith)
  const client = clientById(state, chatWith)

  const simulate = (text: string) => {
    if (!text.trim() || !chatWith) return
    dispatch({ type: 'chat', clientId: chatWith, from: 'client', text: text.trim() })
    const a = answer(state, chatWith, text)
    track('chat_sim', { answerFrom: a.source ?? 'fallback' })
    const key = `faq:${chatWith}:${Date.now()}`
    dispatch({ type: 'addMessage', message: mkMessage(state, 'faq_reply', chatWith, undefined, a.text, key, { answerFrom: a.source }) })
    setInput('')
  }

  return (
    <div className="pane">
      <div className="chips">
        <button className={`chip${tab === 'drafts' ? ' chip--on' : ''}`} onClick={() => setParams({ tab: 'drafts' })}>
          {copy.admin.tabDrafts} {drafts.length ? <span className="chip__n">{drafts.length}</span> : null}
        </button>
        <button className={`chip${tab === 'chat' ? ' chip--on' : ''}`} onClick={() => setParams({ tab: 'chat' })}>
          {copy.admin.tabChat}
        </button>
      </div>

      {tab === 'drafts' && (
        <>
          <div className="stats">
            <StatCard label={copy.admin.draftedStat} value={`${monthCount}`} />
            <StatCard label={copy.admin.timeSaved} value={`~${minutes} ${copy.admin.minutes}`} tone="ok" />
            <StatCard label={copy.admin.tabDrafts} value={`${drafts.length}`} tone={drafts.length ? 'warn' : undefined} />
          </div>

          {drafts.length === 0 ? (
            <EmptyState icon="✓" title={copy.admin.emptyDrafts} />
          ) : (
            <>
              <button className="btn btn--primary btn--block" onClick={() => {
                drafts.forEach((m) => { dispatch({ type: 'sendMessage', id: m.id }); track('send_message', { kind: m.kind }) })
                toast.push({ text: `${copy.toast.messageSent} ${drafts.length}`, tone: 'ok' })
              }}>{copy.admin.sendAll} ({drafts.length})</button>
              <ul className="msgs">
                {drafts.map((m) => (
                  <MessageCard key={m.id} m={m}
                    onSend={() => send(m)}
                    onSkip={() => { dispatch({ type: 'skipMessage', id: m.id }); track('skip_message', { kind: m.kind }); toast.push({ text: copy.toast.messageSkipped }) }}
                    onEdit={(t) => { dispatch({ type: 'editMessage', id: m.id, draft: t }); track('edit_message', { kind: m.kind }) }} />
                ))}
              </ul>
            </>
          )}
        </>
      )}

      {tab === 'chat' && !chatWith && (
        <ul className="rows">
          {clientsList.map((c) => {
            const last = [...state.chats].reverse().find((x) => x.clientId === c.id)
            const n = drafts.filter((m) => m.clientId === c.id).length
            return (
              <li key={c.id}>
                <button className="srow" onClick={() => setParams({ tab: 'chat', chat: c.id })}>
                  <span className="srow__main">
                    <span className="srow__name">{c.name}{n ? <i className="badge badge--danger">{n}</i> : null}</span>
                    <span className="srow__meta">{last?.text.slice(0, 40) ?? '—'}</span>
                  </span>
                  <span aria-hidden="true">›</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {tab === 'chat' && chatWith && (
        <>
          <div className="rowhead">
            <h1 className="h1">{client?.name}</h1>
            <button className="btn btn--ghost btn--sm" onClick={() => setParams({ tab: 'chat' })}>{copy.common.back}</button>
          </div>

          {room.length === 0 ? <p className="dim">{copy.admin.emptyRoom}</p> : (
            <ul className="bubbles">
              {room.map((t) => (
                <li key={t.id} className={`bub bub--${t.from}`}>
                  {t.viaAdmin && <span className="bub__ai" aria-hidden="true">✨</span>}
                  {t.text}
                </li>
              ))}
            </ul>
          )}

          {drafts.filter((m) => m.clientId === chatWith && m.kind === 'faq_reply').map((m) => (
            <div className="draftcard" key={m.id}>
              <span className="dim">{copy.admin.draftedTag} · {m.meta?.answerFrom ? `${copy.admin.answeredFrom}: ${String(m.meta.answerFrom)}` : copy.admin.answerManual}</span>
              <p className="p">{m.draft}</p>
              <div className="btnrow">
                <button className="btn btn--primary btn--sm" onClick={() => send(m)}>{copy.common.send}</button>
                <button className="btn btn--ghost btn--sm" onClick={() => dispatch({ type: 'skipMessage', id: m.id })}>{copy.common.close}</button>
              </div>
            </div>
          ))}

          <div className="simbar">
            <span className="dim">{copy.admin.simTitle}{client?.name}</span>
            <div className="chips">
              {copy.admin.sims.map((sm) => (
                <button key={sm.chip} className="chip" onClick={() => simulate(sm.text)}>{sm.chip}</button>
              ))}
            </div>
            <div className="btnrow">
              <input className="inp" value={input} onChange={(e) => setInput(e.target.value)}
                placeholder={`${copy.admin.sendAs}${client?.name ?? v.client}`} aria-label={copy.admin.simTitle} />
              <button className="btn btn--secondary btn--sm" onClick={() => simulate(input)}>{copy.common.send}</button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
