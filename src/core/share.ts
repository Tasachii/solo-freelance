/**
 * ช่องทางส่งข้อความ — ไม่รู้จักอาชีพ ไม่แตะ DOM
 *
 * ใช้ LINE share link ไม่ใช่บอท เพราะข้อความต้องออกจากบัญชีของผู้ให้บริการเอง
 * (หลักการข้อ 5) และลูกค้าไม่ต้องแอดบอทเป็นเพื่อนก่อน ซึ่งสัมภาษณ์บอกว่าเป็นกำแพงจริง
 */
export const LINE_TEXT_LIMIT = 5000

export function lineShareUrl(text: string): string {
  const t = text.length > LINE_TEXT_LIMIT ? text.slice(0, LINE_TEXT_LIMIT) : text
  return `https://line.me/R/share?text=${encodeURIComponent(t)}`
}

/** ตัวเลข [0,1) ที่คงที่สำหรับ id เดิมเสมอ — ใช้ให้ผลจำลองในเดโมเดาได้ */
export function seedOf(id: string): number {
  let h = 2166136261
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return ((h >>> 0) % 10000) / 10000
}
