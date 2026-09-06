/**
 * ส่งคิวใน message_outbox ออกทาง LINE — ยังไม่ deploy
 * เรียกจากปุ่มส่งในแอป หรือจาก pg_cron สำหรับข้อความตามเวลา
 */
import { classifyPush, pushRequest, retryDelayMs, withinSendWindow, nextSendWindow } from '../../../src/core/lineProtocol.ts'
import { chooseChannel } from '../../../src/core/lineDelivery.ts'
import { admin, open, ok } from '../_shared/db.ts'

Deno.serve(async (req) => {
  const { providerId, auto = false } = await req.json() as { providerId: string; auto?: boolean }
  const db = admin()
  const { data: channel } = await db.from('line_channels')
    .select('access_token, status, quota_used, quota_limit').eq('provider_id', providerId).maybeSingle()
  if (!channel) return ok({ ok: true, sent: 0, reason: 'no-channel' })

  const now = new Date()
  // ห้ามส่งนอกเวลา — เลื่อนไปรอบถัดไป ไม่ใช่ทิ้ง
  if (auto && !withinSendWindow(now)) {
    await db.from('message_outbox').update({ scheduled_at: nextSendWindow(now).toISOString() })
      .eq('provider_id', providerId).eq('status', 'queued').lte('scheduled_at', now.toISOString())
    return ok({ ok: true, sent: 0, reason: 'outside-window' })
  }

  const token = await open(channel.access_token)
  const { data: queue } = await db.from('message_outbox')
    .select('id, recipient_id, body, attempts').eq('provider_id', providerId).eq('status', 'queued')
    .lte('scheduled_at', now.toISOString()).order('scheduled_at').limit(20)

  let sent = 0
  let quotaUsed = channel.quota_used
  for (const row of queue ?? []) {
    const { data: recipient } = await db.from('line_recipients')
      .select('line_user_id, client_id, unfollowed_at').eq('id', row.recipient_id).maybeSingle()
    const choice = chooseChannel(
      { status: channel.status, quotaUsed, quotaLimit: channel.quota_limit },
      recipient ? { linked: !!recipient.client_id, unfollowed: !!recipient.unfollowed_at } : undefined,
      { auto })
    if (choice.channel !== 'oa') {
      // ส่งทาง OA ไม่ได้ = ครูส่งเองทาง share link ตามเดิม ไม่ใช่ error
      await db.from('message_outbox').update({ status: 'skipped', error: choice.reason }).eq('id', row.id)
      continue
    }

    const request = pushRequest(token, recipient!.line_user_id, row.body)
    const res = await fetch(request.url, request.init)
    const outcome = classifyPush(res.status, await res.text().catch(() => ''))

    if (outcome === 'sent') {
      quotaUsed += 1
      sent += 1
      await db.from('message_outbox').update({ status: 'sent', sent_at: now.toISOString() }).eq('id', row.id)
      await db.from('line_channels').update({ quota_used: quotaUsed }).eq('provider_id', providerId)
    } else if (outcome === 'retry') {
      const delay = retryDelayMs(row.attempts + 1)
      await db.from('message_outbox').update(delay === null
        ? { status: 'failed', attempts: row.attempts + 1, error: 'retry-exhausted' }
        : { attempts: row.attempts + 1, scheduled_at: new Date(now.getTime() + delay).toISOString() })
        .eq('id', row.id)
    } else if (outcome === 'invalid-token') {
      // token ใช้ไม่ได้แล้ว ปิด OA ทั้งบัญชี ทุกอย่างกลับไป share link เอง
      await db.from('line_channels').update({ status: 'invalid' }).eq('provider_id', providerId)
      break
    } else {
      await db.from('message_outbox').update({ status: 'failed', error: outcome }).eq('id', row.id)
      if (outcome === 'blocked') {
        await db.from('line_recipients').update({ unfollowed_at: now.toISOString() }).eq('id', row.recipient_id)
      }
    }
  }
  return ok({ ok: true, sent })
})
