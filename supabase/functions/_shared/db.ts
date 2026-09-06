// เปลือกบาง ๆ รอบ Supabase — ฟังก์ชันทุกตัวเรียกผ่านที่นี่ จะได้ mock ได้ตอนเทส
// ตรรกะการตัดสินใจทั้งหมดอยู่ใน src/core/lineProtocol.ts และ src/core/lineDelivery.ts
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

export const admin = (): SupabaseClient =>
  createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  })

/**
 * ความลับของ channel เก็บแบบเข้ารหัสด้วยคีย์ใน Supabase secrets
 * ห้าม log ค่าที่ถอดแล้วไม่ว่ากรณีใด (แผนข้อ 8)
 */
const keyOf = async (): Promise<CryptoKey> => {
  const raw = new TextEncoder().encode(Deno.env.get('LINE_SECRET_KEY')!)
  const hash = await crypto.subtle.digest('SHA-256', raw)
  return crypto.subtle.importKey('raw', hash, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])
}

export async function seal(plain: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const buf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await keyOf(), new TextEncoder().encode(plain))
  return `${btoa(String.fromCharCode(...iv))}.${btoa(String.fromCharCode(...new Uint8Array(buf)))}`
}

export async function open(sealed: string): Promise<string> {
  const [ivB64, dataB64] = sealed.split('.')
  const bytes = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))
  const buf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes(ivB64) }, await keyOf(), bytes(dataB64))
  return new TextDecoder().decode(buf)
}

export const ok = (body: unknown = { ok: true }): Response =>
  new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } })
