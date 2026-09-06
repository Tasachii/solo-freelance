# หลังบ้านสำหรับ LINE OA — ยังไม่ deploy

ทุกอย่างในโฟลเดอร์นี้เขียนไว้รอ **ยังไม่ได้ใช้งานจริง** และจะยังไม่ deploy
จนกว่าจะผ่านเงื่อนไขข้อ 0 ใน [`../docs/line-oa-plan.md`](../docs/line-oa-plan.md)
(ครูจ่ายเงินจริง 5 คน · Supabase ขึ้นแล้ว · พิสูจน์ได้ว่าการกดส่งเองเป็นปัญหาจริง · ครู 2 คนยอมให้ผู้ปกครองแอด OA)

## ทำไมต้องมีหลังบ้าน

`channel access token` ของ LINE ต้องอยู่ฝั่งเซิร์ฟเวอร์เท่านั้น ถ้าอยู่ใน frontend ใครเปิดหน้าเว็บก็อ่านได้
และส่งข้อความในนามครูได้ทุกคน — แอปวันนี้เป็น static ล้วนบน GitHub Pages จึงยังทำส่วนนี้ไม่ได้

## อะไรอยู่ตรงไหน

| ไฟล์ | หน้าที่ |
|---|---|
| `migrations/0001_line.sql` | 4 ตาราง + RLS + view ที่ไม่มีคอลัมน์ความลับ |
| `functions/line-connect` | ครูวาง secret/token → ตรวจกับ LINE → ตั้ง webhook → เก็บแบบเข้ารหัส |
| `functions/line-webhook` | รับ follow / unfollow / ข้อความ → จับคู่ผู้ปกครอง → เก็บข้อความเข้าแชท |
| `functions/line-send` | ส่งคิวใน `message_outbox` พร้อม retry · โควตา · กรอบเวลา |
| `functions/_shared/db.ts` | ต่อ Supabase + เข้ารหัส/ถอดรหัสความลับ |

**การตัดสินใจทั้งหมดไม่ได้อยู่ในไฟล์เหล่านี้** — อยู่ใน `src/core/lineProtocol.ts` และ
`src/core/lineDelivery.ts` ซึ่งเป็นตรรกะล้วนและมีเทสครอบ 30 ข้อ รันได้โดยไม่ต้องมีบัญชี LINE
ไฟล์ใน `functions/` เป็นแค่เปลือกที่ต่อสายเข้ากับฐานข้อมูลและ `fetch`

## ตอน deploy จริงต้องทำอะไร

1. `supabase link` แล้ว `supabase db push` เพื่อสร้างตาราง
2. ตั้ง secrets: `SUPABASE_SERVICE_ROLE_KEY` (มีให้อยู่แล้ว) และ `LINE_SECRET_KEY` (คีย์เข้ารหัสของเราเอง ตั้งเอง)
3. `supabase functions deploy line-connect line-webhook line-send`
4. ถ้า CLI ไม่ยอม bundle การ import ข้าม `supabase/functions/` (`../../../src/core/…`)
   ให้คัดลอกสองไฟล์นั้นเข้า `functions/_shared/` ตอน deploy — **อย่าแก้สำเนา** ให้แก้ที่ `src/core/`
   แล้วคัดลอกทับ ไม่งั้นตรรกะสองชุดจะเพี้ยนกันโดยไม่มีใครรู้
5. ตั้ง `pg_cron` เรียก `line-send` ทุกชั่วโมงสำหรับข้อความตามเวลา

## ที่ยังไม่ได้ทำ

- หน้าจอ `/app/settings/line` ในแอป (ต้องมีล็อกอินก่อน)
- จับคู่ด้วยมือสำหรับผู้ปกครองที่พิมพ์รหัสไม่เป็น (แผนข้อ 5)
- นับโควตาให้ครูเห็นในแอป (แผนข้อ 7)
- ตาราง `chats` ฝั่ง Supabase — ตอนนี้แชทอยู่ใน state ของเครื่อง
