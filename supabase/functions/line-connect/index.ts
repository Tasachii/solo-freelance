/**
 * ครูเชื่อม OA ของตัวเอง — ยังไม่ deploy
 * ตรวจ token กับ LINE ก่อนเก็บ ไม่เก็บค่าที่ใช้ไม่ได้ไว้ให้เข้าใจผิดว่าเชื่อมแล้ว
 */
import { admin, seal, ok } from '../_shared/db.ts'

Deno.serve(async (req) => {
  const { providerId, channelSecret, accessToken, webhookUrl } =
    await req.json() as { providerId: string; channelSecret: string; accessToken: string; webhookUrl: string }

  const auth = { Authorization: `Bearer ${accessToken}` }
  const info = await fetch('https://api.line.me/v2/bot/info', { headers: auth })
  if (!info.ok) return ok({ ok: false, error: 'token' })
  const bot = await info.json() as { userId: string; displayName?: string }

  await fetch('https://api.line.me/v2/bot/channel/webhook/endpoint', {
    method: 'PUT', headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint: webhookUrl }),
  })
  const test = await fetch('https://api.line.me/v2/bot/channel/webhook/test', {
    method: 'POST', headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint: webhookUrl }),
  })
  if (!test.ok) return ok({ ok: false, error: 'webhook' })

  await admin().from('line_channels').upsert({
    provider_id: providerId,
    bot_user_id: bot.userId,
    channel_secret: await seal(channelSecret),
    access_token: await seal(accessToken),
    display_name: bot.displayName ?? null,
    status: 'active',
    last_verified_at: new Date().toISOString(),
  })
  return ok({ ok: true, displayName: bot.displayName })
})
