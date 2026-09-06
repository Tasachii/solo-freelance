/**
 * รับ webhook จาก LINE — ยังไม่ deploy รอเงื่อนไขข้อ 0 ใน docs/line-oa-plan.md
 *
 * หน้าที่เดียวคือต่อสาย: ตรวจลายเซ็น → แปลเหตุการณ์ → ทำตามแผนที่ core ตัดสินให้
 * ทุกการตัดสินใจอยู่ใน src/core/lineProtocol.ts ซึ่งมีเทสครอบไว้แล้ว
 */
import { verifyLineSignature, redeemLinkCode } from '../../../src/core/lineDelivery.ts'
import { parseWebhook, planWebhookEvent, replyRequest } from '../../../src/core/lineProtocol.ts'
import { admin, open, ok } from '../_shared/db.ts'

const REPLIES = {
  'ask-code': 'สวัสดีค่ะ ห้องนี้ใช้ส่งบิลและสรุปงาน — พิมพ์รหัส 6 หลักที่ได้รับมาเพื่อเชื่อมข้อมูลได้เลยค่ะ',
  linked: 'เชื่อมเรียบร้อยแล้วค่ะ ต่อจากนี้บิลและใบเสร็จจะส่งมาทางนี้',
  'bad-code': 'รหัสไม่ถูกต้องหรือหมดอายุแล้ว รบกวนขอรหัสใหม่อีกครั้งค่ะ',
  'opted-out': 'หยุดส่งข้อความให้แล้วค่ะ หากต้องการรับอีกครั้งแจ้งได้เลย',
}

Deno.serve(async (req) => {
  const raw = await req.text()
  const signature = req.headers.get('x-line-signature') ?? ''
  const hook = parseWebhook(raw)
  // ไม่รู้ว่าเป็นของใครก็ตอบ 200 แล้วทิ้ง — ห้ามบอก LINE ว่ามีหรือไม่มีบัญชีนั้น
  if (!hook) return ok()

  const db = admin()
  const { data: channel } = await db.from('line_channels')
    .select('provider_id, channel_secret, access_token, status')
    .eq('bot_user_id', hook.destination).maybeSingle()
  if (!channel) return ok()

  const secret = await open(channel.channel_secret)
  if (!(await verifyLineSignature(raw, secret, signature))) {
    return new Response('bad signature', { status: 401 })
  }
  const token = await open(channel.access_token)
  const reply = async (replyToken: string | undefined, key: keyof typeof REPLIES) => {
    if (!replyToken) return
    const r = replyRequest(token, replyToken, REPLIES[key])
    await fetch(r.url, r.init)
  }

  for (const event of hook.events) {
    const userId = 'userId' in event ? event.userId : ''
    const { data: recipient } = await db.from('line_recipients')
      .select('id, client_id, unfollowed_at')
      .eq('provider_id', channel.provider_id).eq('line_user_id', userId).maybeSingle()
    const plan = planWebhookEvent(event, !!recipient?.client_id)

    if (plan.kind === 'register') {
      // follow ซ้ำจากคนเดิมต้องไม่สร้างแถวใหม่ และต้องล้างสถานะบล็อกเดิม
      await db.from('line_recipients').upsert(
        { provider_id: channel.provider_id, line_user_id: plan.userId, unfollowed_at: null },
        { onConflict: 'provider_id,line_user_id' })
      await reply(event.type === 'follow' ? event.replyToken : undefined, 'ask-code')
    } else if (plan.kind === 'unfollow' || plan.kind === 'opt-out') {
      await db.from('line_recipients').update({ unfollowed_at: new Date().toISOString() })
        .eq('provider_id', channel.provider_id).eq('line_user_id', plan.userId)
      if (plan.kind === 'opt-out') await reply(event.type === 'message' ? event.replyToken : undefined, 'opted-out')
    } else if (plan.kind === 'link') {
      const { data: codes } = await db.from('line_link_codes')
        .select('code, client_id, expires_at, used_at').eq('provider_id', channel.provider_id)
      const result = redeemLinkCode(
        (codes ?? []).map((c) => ({ code: c.code, clientId: c.client_id, expiresAt: Date.parse(c.expires_at), usedAt: c.used_at ? Date.parse(c.used_at) : undefined })),
        plan.code, Date.now(), 0)
      if (result.ok) {
        await db.from('line_recipients').update({ client_id: result.clientId, linked_at: new Date().toISOString() })
          .eq('provider_id', channel.provider_id).eq('line_user_id', plan.userId)
        await db.from('line_link_codes').update({ used_at: new Date().toISOString() }).eq('code', plan.code)
      }
      await reply(event.type === 'message' ? event.replyToken : undefined, result.ok ? 'linked' : 'bad-code')
    } else if (plan.kind === 'inbound' && recipient?.client_id) {
      await db.from('chats').insert({
        provider_id: channel.provider_id, client_id: recipient.client_id,
        from: 'client', text: plan.text, at: new Date().toISOString().slice(0, 10),
      })
    }
  }
  return ok()
})
