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
import { Mascot } from './components/Mascot'
import { useToast } from './components/Toast'
import { copyText, openLine } from './share'
import type { Message } from '../core/types'

function MessageCard({ m, awaiting, left, onSend, onSent, onCancel, onSkipQueue, onCopy, onSkip, onEdit }: {
  m: Message; awaiting: boolean; left: number
  onSend: () => void; onSent: () => void; onCancel: () => void; onSkipQueue: () => void; onCopy: () => void
  onSkip: () => void; onEdit: (t: string) => void
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
      {awaiting ? (
        // เปิด LINE ไปแล้ว — ยังไม่นับว่าส่งจนกว่าครูจะยืนยัน
        // การ์ดถามค้างไว้ ไม่ใช้ toast เพราะครูสลับไป LINE แล้ว toast หายไปก่อนกลับมา
        <div className="confirm">
          <span className="confirm__q">
            {copy.admin.sentAsk}
            {left > 0 && <i className="confirm__left">{copy.admin.queueLeft} {left}</i>}
          </span>
          <div className="btnrow">
            <button className="btn btn--primary btn--sm" onClick={onSent}>{copy.admin.sentYes}</button>
            <button className="btn btn--ghost btn--sm" onClick={onCopy}>{copy.admin.copyText}</button>
            <button className="btn btn--ghost btn--sm" onClick={onSkipQueue}>{copy.admin.notYet}</button>
            {left > 0 && <button className="btn btn--ghost btn--sm" onClick={onCancel}>{copy.admin.stopQueue}</button>}
          </div>
        </div>
      ) : (
        <div className="btnrow">
          {editing ? (
            <button className="btn btn--secondary btn--sm" onClick={() => { onEdit(text); setEditing(false) }}>{copy.common.save}</button>
          ) : (
            <button className="btn btn--ghost btn--sm" onClick={() => setEditing(true)}>{copy.common.edit}</button>
          )}
          <button className="btn btn--primary btn--sm" onClick={onSend}>{copy.admin.sendLine}</button>
          <button className="btn btn--ghost btn--sm" onClick={onSkip}>{copy.common.skip}</button>
        </div>
      )}
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

  // คิวอยู่ใน state ไม่ใช่ในคอมโพเนนต์ — สลับไป LINE แล้วกลับมาต้องยังรู้ว่าค้างที่ใคร
  const awaiting = state.sending?.awaiting ?? null
  const queue = state.sending?.queue ?? []

  const byId = (id: string): Message | undefined => state.messages.find((x) => x.id === id)
  /** เอาเฉพาะที่ยังเป็นร่างอยู่ — ระหว่างคิวครูอาจกดข้ามบางใบไปแล้ว */
  const nextDraft = (ids: string[]): Message | undefined =>
    ids.map(byId).find((m): m is Message => m?.status === 'draft')

  const openFor = (m: Message, rest: string[] = queue) => {
    if (!openLine(m.draft)) {
      // popup โดนบล็อก (มักบนเดสก์ท็อป) — คัดลอกให้แทน ครูวางเองได้
      void copyText(m.draft)
      toast.push({ text: copy.admin.lineBlocked, tone: 'warn' })
    }
    dispatch({ type: 'sendingStart', awaiting: m.id, queue: rest })
    track('open_line', { kind: m.kind })
  }

  const confirmSent = () => {
    const m = awaiting ? byId(awaiting) : undefined
    if (m) {
      dispatch({ type: 'sendMessage', id: m.id })
      track('send_message', { kind: m.kind })
      toast.push({ text: copy.toast.messageSent, tone: 'ok' })
    }
    const nextMsg = nextDraft(queue)
    if (nextMsg) {
      const rest = queue.slice(queue.indexOf(nextMsg.id) + 1)
      openFor(nextMsg, rest)
    } else {
      dispatch({ type: 'sendingStop' })
    }
  }

  /** ยังไม่ได้ส่งใบนี้ — ไปใบถัดไปในคิว ไม่ใช่ทิ้งทั้งคิวเงียบ ๆ */
  const skipInQueue = () => {
    const nextMsg = nextDraft(queue)
    if (nextMsg) openFor(nextMsg, queue.slice(queue.indexOf(nextMsg.id) + 1))
    else dispatch({ type: 'sendingStop' })
  }
  const cancelSend = () => dispatch({ type: 'sendingStop' })

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
            <EmptyState icon={<Mascot mood="cheer" />} title={copy.admin.emptyDrafts} />
          ) : (
            <>
              {/* ส่งทีละคนเป็นคิว — LINE เปิดได้ทีละแชท จะกดรวดเดียวแล้วนับว่าส่งหมดไม่ได้ */}
              <button className="btn btn--primary btn--block" disabled={awaiting !== null} onClick={() => {
                const [first, ...rest] = drafts
                if (!first) return
                openFor(first, rest.map((m) => m.id))
              }}>{copy.admin.sendAll} ({drafts.length})</button>
              <ul className="msgs">
                {drafts.map((m) => (
                  <MessageCard key={m.id} m={m}
                    awaiting={awaiting === m.id}
                    left={queue.filter((id) => byId(id)?.status === 'draft').length}
                    onSkipQueue={skipInQueue}
                    onSend={() => openFor(m)}
                    onSent={confirmSent}
                    onCancel={cancelSend}
                    onCopy={() => { void copyText(m.draft).then((ok) => ok && toast.push({ text: copy.toast.copied, tone: 'ok' })) }}
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
              {awaiting === m.id ? (
                <div className="confirm">
                  <span className="confirm__q">{copy.admin.sentAsk}</span>
                  <div className="btnrow">
                    <button className="btn btn--primary btn--sm" onClick={confirmSent}>{copy.admin.sentYes}</button>
                    <button className="btn btn--ghost btn--sm" onClick={cancelSend}>{copy.admin.notYet}</button>
                  </div>
                </div>
              ) : (
                <div className="btnrow">
                  <button className="btn btn--primary btn--sm" onClick={() => openFor(m)}>{copy.admin.sendLine}</button>
                  <button className="btn btn--ghost btn--sm" onClick={() => dispatch({ type: 'skipMessage', id: m.id })}>{copy.common.close}</button>
                </div>
              )}
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
