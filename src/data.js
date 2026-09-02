// ── ข้อมูลสมมติทั้งหมดสำหรับเดโม ไม่มี backend และไม่มีข้อมูลจริงใดๆ ──
import { datesOfWeekdayInMonth, iso, periodOf, shiftPeriod } from './dates.js'

export const APP_VERSION = '4.0.0'
export const TODAY = '2026-09-30'
export const TODAY_PERIOD = periodOf(TODAY)
export const FIRST_PERIOD = shiftPeriod(TODAY_PERIOD, -5)

export const TYPE_LABEL = { single: 'เดี่ยว', group: 'กลุ่ม' }
export const STATUS_LABEL = {
  paid: 'จ่ายแล้ว', pending: 'รอสลิป', overdue: 'ค้างจ่าย',
  none: 'ยังไม่มียอด', partial: 'จ่ายบางส่วน', package: 'แพ็ก',
}
export const LIFE_LABEL = { active: 'กำลังเรียน', paused: 'พักชั่วคราว', ended: 'จบคอร์ส' }

/** โหมดการเก็บเงิน — จาก feedback ติวเตอร์จริง: หลายบ้านซื้อเป็นแพ็กจ่ายล่วงหน้า
    per_session  = รายเดือนตามครั้งที่เรียนจริง
    monthly_flat = รายเดือนเหมา เรียนกี่ครั้งก็จ่ายเท่าเดิม
    package      = ซื้อแพ็กล่วงหน้า งานหลังบ้านคือ "ใครเหลือกี่ครั้ง ใครหมดแล้วยังมาเรียน" */
export const MODE_LABEL = { per_session: 'รายครั้ง', monthly_flat: 'เหมารายเดือน', package: 'แพ็ก' }

export const AVATAR_COLORS = [
  { id: 'green', label: 'เขียว' }, { id: 'orange', label: 'ส้ม' },
  { id: 'gold', label: 'ทอง' }, { id: 'plum', label: 'ม่วงพลัม' },
]
export const EXPENSE_CATEGORIES = ['เดินทาง', 'เอกสาร/ปริ้น', 'ค่าห้อง', 'อุปกรณ์', 'อื่นๆ']
export const DUNNING_TONES = { soft: 'สุภาพมาก', normal: 'ปกติ', direct: 'ตรงไปตรงมา' }

export const SEND_DELAY_MS = 6000
export const UNDO_LIMIT = 20

export const DEFAULT_SETTINGS = {
  profile: { name: 'พี่กานต์', publicName: 'พี่กานต์', phone: '098-xxx-4211', lineId: '@karnphysics', avatarColor: 'green' },
  payout: { bank: 'ธ.กสิกรไทย', accountName: 'กานต์ ธ.กสิกรไทย', accountNo: '4211', promptpay: '098-xxx-4211' },
  rates: { single: 400, group: 250 },
  billing: { issueOn: 'end' },
  dunning: { auto: true, everyDays: 3, maxTimes: 3, quietFrom: '20:00', quietTo: '08:00', tone: 'normal' },
  notify: { beforeClass: 15, missedCheckin: true, dailySummary: false },
  display: { fontScale: 'normal' },
}

// 8 คน: รายครั้ง 3 / เหมา 2 / แพ็ก 3 (เหลือเยอะ · เหลือ 2 · หมดแล้วยังมาเรียน)
export const SEED_STUDENTS = [
  { id: 's1', nick: 'น้องภูมิ', grade: 'ม.5', subject: 'ฟิสิกส์', type: 'single', parent: 'คุณแม่ภูมิ', plan: 8, life: 'active',
    billing: { mode: 'per_session', rate: 400 },
    schedule: [{ day: 3, time: '19:45' }, { day: 0, time: '14:00' }], status: 'paid' },
  { id: 's2', nick: 'น้องแพรว', grade: 'ม.6', subject: 'คณิต', type: 'single', parent: 'คุณพ่อแพรว', plan: 8, life: 'active',
    billing: { mode: 'monthly_flat', amount: 3200 },
    schedule: [{ day: 3, time: '16:30' }, { day: 6, time: '10:00' }], status: 'paid' },
  { id: 's3', nick: 'น้องต้นน้ำ', grade: 'ม.4', subject: 'คณิต', type: 'group', parent: 'คุณแม่ต้นน้ำ', plan: 4, life: 'active',
    billing: { mode: 'per_session', rate: 250 },
    schedule: [{ day: 3, time: '18:00' }], status: 'overdue' },
  { id: 's4', nick: 'น้องมีนา', grade: 'ม.6', subject: 'ฟิสิกส์', type: 'single', parent: 'คุณแม่มีนา', plan: 8, life: 'active',
    billing: { mode: 'monthly_flat', amount: 2800 },
    schedule: [{ day: 1, time: '17:00' }, { day: 4, time: '17:00' }], status: 'pending' },
  { id: 's5', nick: 'น้องเจได', grade: 'ม.5', subject: 'คณิต', type: 'group', parent: 'คุณพ่อเจได', plan: 4, life: 'active',
    billing: { mode: 'package', total: 20, used: 8, price: 6500, purchasedAt: iso(2026, 8, 10) },
    schedule: [{ day: 3, time: '18:00' }], status: 'package' },
  { id: 's6', nick: 'น้องปราง', grade: 'ม.3', subject: 'คณิต', type: 'single', parent: 'คุณแม่ปราง', plan: 4, life: 'active',
    billing: { mode: 'per_session', rate: 400 },
    schedule: [{ day: 5, time: '16:00' }], status: 'pending' },
  { id: 's7', nick: 'น้องอิง', grade: 'ม.2', subject: 'อังกฤษ', type: 'single', parent: 'คุณแม่อิง', plan: 4, life: 'active',
    billing: { mode: 'package', total: 10, used: 8, price: 3500, purchasedAt: iso(2026, 7, 2) },
    schedule: [{ day: 6, time: '13:00' }], status: 'package' },
  { id: 's8', nick: 'น้องปุณ', grade: 'ม.1', subject: 'คณิต', type: 'single', parent: 'คุณแม่ปุณ', plan: 4, life: 'active',
    billing: { mode: 'package', total: 10, used: 11, price: 3500, purchasedAt: iso(2026, 6, 15) },
    schedule: [{ day: 3, time: '17:00' }, { day: 6, time: '15:00' }], status: 'package' },
]

/** มูลค่าต่อครั้งของแต่ละโหมด — ใช้ตีมูลค่าครั้งเรียนใน CSV และเงินที่กู้คืน */
export function perSessionValue(student) {
  const b = student.billing
  if (b.mode === 'per_session') return b.rate
  if (b.mode === 'package') return Math.round(b.price / b.total)
  return 0 // เหมารายเดือน — ครั้งเพิ่มไม่ได้ทำให้บิลโต
}

/** เรทย้อนหลังสำหรับโหมดรายครั้ง (ขึ้นราคาเมื่อ ก.ค.) */
function historicRate(period, rate) {
  return period < '2026-07' ? rate - 20 : rate
}

function hash01(seed) {
  let h = 2166136261
  for (const ch of seed) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) }
  return (h >>> 0) / 4294967296
}

const SEP_TARGET = { s1: 7, s2: 8, s3: 4, s4: 6, s5: 3, s6: 4, s7: 4, s8: 5 }

export function seedRecords() {
  const out = {}
  for (const st of SEED_STUDENTS) {
    const list = []
    for (let i = 5; i >= 0; i--) {
      const period = shiftPeriod(TODAY_PERIOD, -i)
      const dates = st.schedule
        .flatMap((sl) => datesOfWeekdayInMonth(period, sl.day).map((d) => ({ date: d, time: sl.time })))
        .filter((x) => x.date < TODAY)
        .sort((a, b) => a.date.localeCompare(b.date))

      let keep = dates
      if (period === TODAY_PERIOD) keep = dates.slice(0, SEP_TARGET[st.id] ?? dates.length)
      else keep = dates.filter((x) => hash01(st.id + x.date) > 0.12)

      for (const x of keep) {
        const base = perSessionValue(st)
        list.push({
          id: `${st.id}-${x.date}`,
          date: x.date,
          kind: 'attended',
          rate: st.billing.mode === 'per_session' ? historicRate(period, base) : base,
          sessionId: null,
        })
      }
    }
    out[st.id] = list
  }
  return out
}

export const SEED_EXPENSES = [
  { id: 'e1', date: iso(2026, 9, 4), category: 'เดินทาง', note: 'ไปสอนที่บ้านน้องแพรว', amount: 480 },
  { id: 'e2', date: iso(2026, 9, 11), category: 'เอกสาร/ปริ้น', note: 'ชีทสรุปแคลคูลัส', amount: 260 },
  { id: 'e3', date: iso(2026, 9, 17), category: 'ค่าห้อง', note: 'ห้องติวกลุ่ม ม.4', amount: 1200 },
  { id: 'e4', date: iso(2026, 8, 8), category: 'เดินทาง', note: 'ค่าน้ำมันเดือนสิงหา', amount: 620 },
]

/** สลิปที่แนบมา — แพรว (เหมา) ยอดตรง ระบบรับให้เอง / ปรางโอนขาด ต้องให้คนตัดสิน */
export const SEED_SLIPS = {
  s2: { at: '30 ก.ย. 2569 · 20:14 น.', ref: '0142 8837 5591', paid: null, match: true },
  s6: { at: '29 ก.ย. 2569 · 09:02 น.', ref: '0142 8710 2244', paid: 1200, match: false,
        reason: 'ยอดในสลิปน้อยกว่าที่ต้องเก็บ อาจโอนตามยอดเดือนก่อน' },
}

export const AUTO_MINUTES = { bill: 3, slip: 2, remind: 5, count: 1, receipt: 2 }

export const SEED_AUTOLOG = [
  { id: 'a1', at: '30 ก.ย. · 20:14', kind: 'slip', studentId: 's2', minutes: 4,
    text: 'รับยอดของน้องแพรว 3,200 บาท · สลิปตรง · ส่งใบเสร็จแล้ว' },
  { id: 'a2', at: '30 ก.ย. · 09:00', kind: 'bill', minutes: 15,
    text: 'ส่งบิลเข้า LINE ผู้ปกครอง 5 คน' },
  { id: 'a3', at: '29 ก.ย. · 17:05', kind: 'pack', studentId: 's8', minutes: 2,
    text: 'จับได้ว่าแพ็กของน้องปุณหมดแล้ว — เกิน 1 ครั้งยังไม่ได้เก็บ' },
  { id: 'a4', at: '28 ก.ย. · 08:00', kind: 'remind', studentId: 's3', minutes: 5,
    text: 'ทวงน้องต้นน้ำแทนคุณ (1/3)' },
  { id: 'a5', at: 'ตลอดเดือน', kind: 'count', minutes: 37,
    text: 'นับครั้งเรียนให้ 37 ครั้ง' },
]

export const SEED_INBOX = [
  { id: 'i1', at: '30 ก.ย. · 20:14', kind: 'slip', studentId: 's2', read: true,
    text: 'คุณพ่อแพรวแนบสลิปมา · ยอดตรง รับยอดและส่งใบเสร็จให้แล้ว' },
  { id: 'i2', at: '29 ก.ย. · 09:02', kind: 'slipBad', studentId: 's6', read: false,
    text: 'คุณแม่ปรางแนบสลิปมา · ยอดไม่ตรงกับบิล ต้องตรวจเอง' },
  { id: 'i3', at: '29 ก.ย. · 17:05', kind: 'pack', studentId: 's8', read: false,
    text: 'แพ็กของน้องปุณหมดแล้วแต่ยังมาเรียน — ควรชวนต่อแพ็ก' },
  { id: 'i4', at: '28 ก.ย. · 08:00', kind: 'reminded', studentId: 's3', read: true,
    text: 'ระบบทวงค่าเรียนของน้องต้นน้ำอัตโนมัติ (ครั้งที่ 1)' },
]

/** ใบเสร็จที่ระบบออกไปแล้ว — ของแพรวออกอัตโนมัติตอนสลิปตรง */
export const SEED_RECEIPTS = [
  { id: 'rc1', no: 'ST-2569-09-0011', studentId: 's2', period: TODAY_PERIOD,
    date: '30 ก.ย. 2569', amount: 3200, desc: 'ค่าเรียนคณิตรายเดือน (เหมา) — กันยายน 2569' },
]

export const PROGRESS_NOTE = {
  s1: 'ช่วงนี้ภูมิจับหลักโมเมนตัมได้แล้วครับ ข้อที่เคยติดตอนต้นเดือนตอนนี้ทำเองได้หมด เหลืออีกเรื่องเดียวคือโจทย์ที่มีแรงเสียดทานหลายชั้น อาทิตย์หน้าจะเน้นตรงนี้ให้ครับ',
  s2: 'แพรวทำข้อสอบเก่าแคลคูลัสได้ 17 จาก 20 แล้วครับ จากตอนแรกที่ได้ 9 พัฒนาขึ้นเยอะมาก ที่เหลือเป็นความเร็วในการทำข้อสอบ เดือนหน้าจะจับเวลาให้ทุกคาบครับ',
  s3: 'ต้นน้ำตั้งใจดีมากครับ เรื่องฟังก์ชันเข้าใจแล้ว แต่ยังเผลอลืมเช็คโดเมนตอนตอบ ผมย้ำทุกคาบอยู่ครับ ไม่ต้องห่วง เดี๋ยวติดเป็นนิสัยเอง',
  s4: 'มีนาถามคำถามดีขึ้นมากครับ เริ่มถามว่า "ทำไม" ไม่ใช่แค่ "ทำยังไง" ซึ่งเป็นสัญญาณที่ดีมากสำหรับฟิสิกส์ ม.6 ครับ',
  s5: 'เจไดสนุกกับคาบกลุ่มดีครับ แข่งกับเพื่อนแล้วทำโจทย์เร็วขึ้นเห็นได้ชัด ฝากช่วยดูเรื่องการบ้านนิดนึงนะครับ ส่งไม่ค่อยครบ',
  s6: 'ปรางเก่งขึ้นเรื่องสมการสองตัวแปรมากครับ ตอนนี้ทำโจทย์ประยุกต์ได้เองแล้ว เดือนหน้าจะเริ่มปูเรื่องพาราโบลาให้ครับ',
  s7: 'อิงกล้าพูดภาษาอังกฤษขึ้นเยอะมากครับ ตอนนี้เล่าเรื่องสั้นๆ ได้เองแล้ว เดือนหน้าจะเริ่มฝึกเขียนครับ',
  s8: 'ปุณคิดเลขเร็วขึ้นชัดเจนครับ โจทย์เศษส่วนที่เคยกลัวตอนนี้ทำได้สบาย กำลังปูพื้นสมการให้ครับ',
}

export const FAQ = [
  { q: 'ระบบถือเงินของผมไหม',
    a: 'ไม่ครับ ผู้ปกครองโอนเข้าบัญชีคุณโดยตรงผ่าน QR PromptPay ของคุณเอง ระบบทำหน้าที่แค่ตรวจสลิปกับรายการเดินบัญชีแล้วบันทึกให้ เราไม่ได้เป็นตัวกลางรับโอน จึงไม่เข้าข่ายต้องขอใบอนุญาต e-Money จาก ธปท.' },
  { q: 'นักเรียนผมซื้อเป็นแพ็ก ไม่ใช่รายเดือน ใช้ได้ไหม',
    a: 'ได้ครับ ระบบรองรับ 3 โหมด: รายครั้ง เหมารายเดือน และแพ็กจ่ายล่วงหน้า สำหรับแพ็ก ระบบจะนับให้ว่าใครเหลือกี่ครั้ง เตือนเมื่อใกล้หมด และจับได้ทันทีถ้าแพ็กหมดแล้วยังมาเรียน พร้อมร่างข้อความชวนต่อแพ็กให้' },
  { q: 'ถ้าเช็คชื่อผิดคนต้องทำยังไง',
    a: 'มีสามทาง: กด "เลิกทำ" ในแถบที่เด้งขึ้น · แตะที่สถานะของคาบเพื่อเปลี่ยน · หรือลบครั้งที่เรียนในหน้าโปรไฟล์นักเรียน ทุกทางยอดเงินและตัวนับแพ็กคำนวณใหม่ทันที' },
  { q: 'เผลอกดส่งบิลผิดจะทำยังไง',
    a: 'ระบบไม่ส่งทันทีครับ จะหน่วงไว้ 6 วินาทีให้กด "ยกเลิกการส่ง" ก่อน ถ้าเลยไปแล้วจะยกเลิกไม่ได้ เพราะข้อความออกไปถึงผู้ปกครองจริง — ดูได้ว่าส่งอะไรไปแล้วบ้างที่ "ประวัติการส่งข้อความ"' },
  { q: 'ขึ้นราคากลางคัน บิลเดือนเก่าจะเพี้ยนไหม',
    a: 'ไม่ครับ ทุกครั้งที่เช็คชื่อ ระบบจะเก็บราคา ณ วันนั้นติดไปกับครั้งเรียนเลย การขึ้นราคาจึงมีผลกับคาบที่สอนหลังจากนั้นเท่านั้น บิลเดือนก่อนไม่ขยับ' },
  { q: 'ผู้ปกครองต้องโหลดแอปไหม',
    a: 'ไม่ต้องครับ ทุกอย่างเกิดในแชท LINE ที่เขาใช้อยู่แล้ว บิลเข้า LINE แนบสลิปในแชท ระบบตรวจให้ ใบเสร็จส่งกลับให้อัตโนมัติ' },
  { q: 'ระบบจะทวงจนผู้ปกครองรำคาญไหม',
    a: 'ตั้งได้ครับว่าทวงซ้ำทุกกี่วันและสูงสุดกี่ครั้งแล้วให้หยุด รวมถึงกำหนดช่วงเวลาที่ห้ามส่ง ค่าเริ่มต้นคือทุก 3 วัน สูงสุด 3 ครั้ง และไม่ส่งช่วง 20:00–08:00' },
  { q: 'ข้อมูลของผมเก็บที่ไหน',
    a: 'เดโมนี้เก็บทุกอย่างไว้ใน localStorage ของเบราว์เซอร์คุณเครื่องเดียว ไม่มี server ไม่มี analytics และคุณดาวน์โหลดออกเป็นไฟล์ CSV (เปิดใน Excel ได้) หรือสำรอง/กู้คืนเป็น JSON ได้ตลอด' },
]
