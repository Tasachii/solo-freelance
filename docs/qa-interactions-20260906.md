# Solo interaction QA — 6 September 2026

ตรวจอาการกดแล้วเด้ง ปิดเอง หรือออกนอกแอปต่อจาก QA รอบแรก ผ่าน Chromium มือถือจำลองและเดสก์ท็อป โดยรักษาการแก้เมนูที่เข้ามาระหว่างทำงานใน commit `b7e9a28`

## ปัญหาที่แก้

1. **ชีทยืนยันปิดทันทีแม้งานล้มเหลวหรือยังไม่เสร็จ** — `ConfirmSheet` รอผล async ก่อนปิด ใช้ ref กัน double tap ล็อกปุ่มยืนยัน/ยกเลิกและ Escape/backdrop ระหว่างทำงาน ถ้าสำรองข้อมูลถูกยกเลิกหรือเขียนข้อมูลไม่สำเร็จ จะคงชีทเดิมไว้ และ caller ส่งผลสำเร็จ/ล้มเหลวอย่างชัดเจน
2. **Fullscreen หายไปจากโหมดใช้งานจริงหลังย้ายตำแหน่งเมนู** — คงรูปแบบแถวเมนูใหม่ แต่ย้ายออกจากเงื่อนไข demo-only เพื่อใช้ได้ทั้งสองโหมด

## สิ่งที่ตรวจผ่าน

- เดินระหว่างหน้าหลัก แก้ข้อมูล เปิด/ปิดชีท กดด้านใน/พื้นหลัง ใช้ Escape และคืน focus
- เมนู Demo → Real และ Real → Demo เปิดชีทยืนยันเพียงชั้นเดียว ตามการแก้เมนูล่าสุด
- การกดซ้ำขณะรอผล async ไม่เรียกงานซ้ำ และผลล้มเหลวไม่ถูกแสดงเหมือนสำเร็จ
- คงการเปิดหน้าต่าง LINE เฉพาะปุ่มที่ระบุว่าส่งใน LINE; การนำทางและแก้ข้อมูลทั่วไปไม่เปิดหน้าต่างภายนอก
- Console/page errors ในชุด interaction: 0

## หลักฐานล่าสุด

- Unit: **198/198** ใน 25 ไฟล์
- E2E: **58/58** รวม interaction มือถือ/เดสก์ท็อป **12 เคส**
- Production build/TypeScript และ `git diff --check`: ผ่าน
- ผู้รีวิวอิสระ `/root/interaction_fix_review`: **APPROVE** รวมการปรับตำแหน่ง Fullscreen และตรวจบน HEAD ล่าสุด โดยไม่พบข้อคงค้างใน scope ที่ตรวจ
- เพิ่ม regression ใน `tests/unit/ui-accessibility.test.tsx` และ `tests/e2e/interaction-regressions.spec.ts`
- หลักฐาน `/Users/tasachi/Documents/qa-interactions-20260906/solo/`: `unit-final-current-head.log`, `e2e-final-current-head.log`, `build-final-current-head.log`, `interaction-current-head.log`

ขอบเขตเป็นการทดสอบในเครื่อง ไม่ได้ยืนยัน Safari/iOS จริงหรือทุกลำดับการกดที่เป็นไปได้ ผู้ใช้ยังไม่ได้ระบุปุ่มเฉพาะที่เกิดอาการ จึงตรวจ interaction หลักเพิ่มเติมและจำลอง failure ที่มีโอกาสทำให้หน้าต่างปิดหรือข้อมูลหาย
