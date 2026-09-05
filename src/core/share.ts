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
