# QA backend fixes — LINE/Supabase (undeployed)

สถานะ ณ 2026-09-06: แก้และทดสอบเฉพาะ local scaffold แล้ว ยังไม่ deploy และไม่ส่งข้อความ LINE จริง

| Finding | สถานะ | หลักฐานในเครื่อง |
|---|---|---|
| SF-34 clean migration ใช้ไม่ได้ | แก้แล้ว | `scripts/test-db.sh` สร้าง PostgreSQL 16 ใหม่และรัน migration ตั้งแต่ฐานว่าง |
| SF-35 public view/RLS อ่านไม่ได้ | แก้แล้ว | authenticated owner เห็น 1 แถว, tenant อื่น 0 แถว และไม่มี grant อ่าน secret/token |
| SF-36 cross-tenant references | แก้แล้ว | composite foreign keys ปฏิเสธ client/recipient คนละ provider |
| SF-37 ผู้ใช้ปลอมสถานะส่ง | แก้แล้ว | ไม่มี INSERT/UPDATE table grant; enqueue RPC รับเฉพาะ request fields และ DB สร้าง retry/status/attempt fields |
| SF-38 collision/atomic redeem | แก้แล้ว | code scoped ต่อ provider, issuance retry สูงสุด 10 ครั้ง, server-side attempt window และ concurrent redeem สำเร็จได้ครั้งเดียว |
| SF-39 API/integration gap | แก้ใน local scaffold | connect/send ใช้ verified JWT, cron secret แยก, webhook signature, atomic claim/settle และ PostgreSQL integration tests |

การส่งมี `X-Line-Retry-Key` UUID ที่บันทึกกับ outbox ตั้งแต่ enqueue และใช้ key เดิมทุก retry
HTTP 409 จาก LINE ถูกนับเป็น accepted ตามสัญญา retry ของ LINE การ claim ใช้ `FOR UPDATE SKIP LOCKED`
และการปิดงานส่งสำเร็จกับการเพิ่ม quota อยู่ transaction เดียว
การ claim สำรอง quota ภายใต้ channel row lock จึงไม่เกินเพดานเมื่อมี worker พร้อมกัน
เมื่อ RPC คืน claim แล้ว worker จะไม่ใช้ค่า quota snapshot ก่อน RPC มาตัดสินซ้ำ จึงไม่ทิ้งคิวหลัง monthly rollover
quota รีเซ็ตตามเดือนปฏิทินเวลา Bangkok ภายใต้ lock เดียวกัน และยก reservation ที่กำลังส่งข้ามเดือนไปเดือนใหม่
คิวอัตโนมัติหยุด claim ที่ 280 โดยคงสถานะ `queued` ไว้ให้ครูกดส่งเองได้ และ claim อัตโนมัติได้
ไม่เกินหนึ่งข้อความต่อผู้รับต่อวัน Bangkok; การส่งแบบครูกดเองไม่ถูกจำกัดด้วยกฎนี้
แถวที่ผ่าน 23 ชั่วโมงจากครั้งแรกจะเปลี่ยนเป็น `manual_review` แทนการยิงซ้ำด้วย retry key ที่หมดหน้าต่างรับประกัน
`scripts/test-edge.sh` ตรวจ handler auth/method/malformed-webhook ด้วย fake dependencies โดยไม่เปิด network runtime permission
browser endpoints ตอบ preflight เฉพาะ `LINE_ALLOWED_ORIGIN` และรองรับ header ของ Supabase SDK
(`authorization`, `content-type`, `apikey`, `x-client-info`)
Supabase gateway ปิด JWT เฉพาะ webhook/cron routes แล้วให้ handler ตรวจ LINE signature หรือ cron/JWT เอง
ทุก LINE `webhookEventId` ถูก claim ในฐานข้อมูลก่อนทำ follow/link/opt-out/inbound และ redelivery ที่ processed แล้วถูกข้าม
การเชื่อม OA เก็บ secret/token ที่เข้ารหัสด้วยสถานะ `pending` ก่อนแก้ webhook ภายนอก จากนั้นจึงเปลี่ยนเป็น
`active`; ความล้มเหลวคงสถานะ `setup_failed` เพื่อ retry ได้โดยไม่แสดงว่าเชื่อมสำเร็จ

สิ่งที่ยังต้องทดสอบภายนอกเมื่อผ่าน product gate ใน `docs/line-oa-plan.md`:

- Supabase staging Auth/JWT และ migration กับ schema production จริง
- LINE OA test account: bot info, webhook endpoint/test, signature และ redelivery 24 ชั่วโมง
- secret rotation, pg_cron configuration, quota reset และ monitoring/alerts
- staging E2E สำหรับ connect, follow, redeem, block, push/retry โดยใช้บัญชีทดสอบเท่านั้น

ข้อจำกัดเหล่านี้จึงยังห้ามอ้างว่า backend พร้อม production หรือ LINE integration ผ่านจริง
