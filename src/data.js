// ── ข้อมูลสมมติทั้งหมดสำหรับเดโม ไม่มี backend และไม่มีข้อมูลจริงใดๆ ──

export const APP_VERSION = '2.0.0'
export const TODAY = '30 ก.ย.'
export const MONTH = 'กันยายน 2569'

export const TYPE_LABEL = { single: 'เดี่ยว', group: 'กลุ่ม' }
export const STATUS_LABEL = { paid: 'จ่ายแล้ว', pending: 'รอสลิป', overdue: 'ค้างจ่าย' }
export const LIFE_LABEL = { active: 'กำลังเรียน', paused: 'พักชั่วคราว', ended: 'จบคอร์ส' }

export const AVATAR_COLORS = [
  { id: 'green', label: 'เขียว' },
  { id: 'orange', label: 'ส้ม' },
  { id: 'gold', label: 'ทอง' },
  { id: 'plum', label: 'ม่วงพลัม' },
]

export const EXPENSE_CATEGORIES = ['เดินทาง', 'เอกสาร/ปริ้น', 'ค่าห้อง', 'อุปกรณ์', 'อื่นๆ']

export const DUNNING_TONES = {
  soft: 'สุภาพมาก',
  normal: 'ปกติ',
  direct: 'ตรงไปตรงมา',
}

// ── ค่าตั้งต้นของ "ตั้งค่า" ทั้งหมด ──
export const DEFAULT_SETTINGS = {
  profile: {
    name: 'พี่กานต์',
    publicName: 'พี่กานต์',
    phone: '098-xxx-4211',
    lineId: '@karnphysics',
    avatarColor: 'green',
  },
  payout: {
    bank: 'ธ.กสิกรไทย',
    accountName: 'กานต์ ธ.กสิกรไทย',
    accountNo: '4211',
    promptpay: '098-xxx-4211',
  },
  rates: { single: 400, group: 250 },
  billing: { issueOn: 'end' }, // end = สิ้นเดือน, first = วันที่ 1
  dunning: {
    auto: true,
    everyDays: 3,
    maxTimes: 3,
    quietFrom: '20:00',
    quietTo: '08:00',
    tone: 'normal',
  },
  notify: { beforeClass: 15, missedCheckin: true, dailySummary: false },
  display: { fontScale: 'normal' }, // small | normal | large
}

// ── นักเรียนตั้งต้น ──
export const SEED_STUDENTS = [
  { id: 's1', nick: 'น้องภูมิ', grade: 'ม.5', subject: 'ฟิสิกส์', type: 'single', parent: 'คุณแม่ภูมิ', plan: 8, status: 'paid', life: 'active', rate: null },
  { id: 's2', nick: 'น้องแพรว', grade: 'ม.6', subject: 'คณิต', type: 'single', parent: 'คุณพ่อแพรว', plan: 8, status: 'pending', life: 'active', rate: null },
  { id: 's3', nick: 'น้องต้นน้ำ', grade: 'ม.4', subject: 'คณิต', type: 'group', parent: 'คุณแม่ต้นน้ำ', plan: 4, status: 'overdue', life: 'active', rate: null },
  { id: 's4', nick: 'น้องมีนา', grade: 'ม.6', subject: 'ฟิสิกส์', type: 'single', parent: 'คุณแม่มีนา', plan: 8, status: 'paid', life: 'active', rate: null },
  { id: 's5', nick: 'น้องเจได', grade: 'ม.5', subject: 'คณิต', type: 'group', parent: 'คุณพ่อเจได', plan: 4, status: 'overdue', life: 'active', rate: null },
  { id: 's6', nick: 'น้องปราง', grade: 'ม.3', subject: 'คณิต', type: 'single', parent: 'คุณแม่ปราง', plan: 4, status: 'pending', life: 'active', rate: null },
]

// ── คาบสอนวันนี้ ──
export const SEED_SESSIONS = [
  { id: 'c1', time: '16:30', studentId: 's2', subject: 'คณิต', grade: 'ม.6', type: 'single' },
  { id: 'c2', time: '18:00', studentId: 's3', subject: 'คณิต', grade: 'ม.4', type: 'group' },
  { id: 'c3', time: '18:00', studentId: 's5', subject: 'คณิต', grade: 'ม.4', type: 'group' },
  { id: 'c4', time: '19:45', studentId: 's1', subject: 'ฟิสิกส์', grade: 'ม.5', type: 'single' },
]

// ── ประวัติเรียนเดือนนี้: เก็บ "รายครั้ง" ไม่ใช่ตัวเลขรวม เพื่อให้แก้ย้อนหลังได้ ──
const dates = {
  s1: ['2 ก.ย.', '5 ก.ย.', '9 ก.ย.', '12 ก.ย.', '16 ก.ย.', '19 ก.ย.', '23 ก.ย.'],
  s2: ['1 ก.ย.', '4 ก.ย.', '8 ก.ย.', '11 ก.ย.', '15 ก.ย.', '18 ก.ย.', '22 ก.ย.', '25 ก.ย.'],
  s3: ['3 ก.ย.', '10 ก.ย.', '17 ก.ย.', '24 ก.ย.'],
  s4: ['2 ก.ย.', '6 ก.ย.', '13 ก.ย.', '16 ก.ย.', '20 ก.ย.', '27 ก.ย.'],
  s5: ['3 ก.ย.', '10 ก.ย.', '17 ก.ย.'],
  s6: ['5 ก.ย.', '12 ก.ย.', '19 ก.ย.', '26 ก.ย.'],
}

export function seedRecords() {
  const out = {}
  for (const [sid, list] of Object.entries(dates)) {
    out[sid] = list.map((d, i) => ({ id: `${sid}-r${i}`, date: d, kind: 'attended', sessionId: null }))
  }
  return out
}

// ── รายจ่ายตั้งต้น ──
export const SEED_EXPENSES = [
  { id: 'e1', date: '4 ก.ย.', category: 'เดินทาง', note: 'ไปสอนที่บ้านน้องแพรว', amount: 480 },
  { id: 'e2', date: '11 ก.ย.', category: 'เอกสาร/ปริ้น', note: 'ชีทสรุปแคลคูลัส', amount: 260 },
  { id: 'e3', date: '17 ก.ย.', category: 'ค่าห้อง', note: 'ห้องติวกลุ่ม ม.4', amount: 1200 },
]

// ── รายรับ 6 เดือนย้อนหลัง (เดือนล่าสุดคำนวณสดจาก state) ──
export const INCOME_HISTORY = [
  { month: 'เม.ย.', amount: 9050 },
  { month: 'พ.ค.', amount: 9700 },
  { month: 'มิ.ย.', amount: 10400 },
  { month: 'ก.ค.', amount: 9900 },
  { month: 'ส.ค.', amount: 10850 },
]

export const PROGRESS_NOTE = {
  s1: 'ช่วงนี้ภูมิจับหลักโมเมนตัมได้แล้วครับ ข้อที่เคยติดตอนต้นเดือนตอนนี้ทำเองได้หมด เหลืออีกเรื่องเดียวคือโจทย์ที่มีแรงเสียดทานหลายชั้น อาทิตย์หน้าจะเน้นตรงนี้ให้ครับ',
  s2: 'แพรวทำข้อสอบเก่าแคลคูลัสได้ 17 จาก 20 แล้วครับ จากตอนแรกที่ได้ 9 พัฒนาขึ้นเยอะมาก ที่เหลือเป็นความเร็วในการทำข้อสอบ เดือนหน้าจะจับเวลาให้ทุกคาบครับ',
  s3: 'ต้นน้ำตั้งใจดีมากครับ เรื่องฟังก์ชันเข้าใจแล้ว แต่ยังเผลอลืมเช็คโดเมนตอนตอบ ผมย้ำทุกคาบอยู่ครับ ไม่ต้องห่วง เดี๋ยวติดเป็นนิสัยเอง',
  s4: 'มีนาถามคำถามดีขึ้นมากครับ เริ่มถามว่า "ทำไม" ไม่ใช่แค่ "ทำยังไง" ซึ่งเป็นสัญญาณที่ดีมากสำหรับฟิสิกส์ ม.6 ครับ',
  s5: 'เจไดสนุกกับคาบกลุ่มดีครับ แข่งกับเพื่อนแล้วทำโจทย์เร็วขึ้นเห็นได้ชัด ฝากช่วยดูเรื่องการบ้านนิดนึงนะครับ ส่งไม่ค่อยครบ',
  s6: 'ปรางเก่งขึ้นเรื่องสมการสองตัวแปรมากครับ ตอนนี้ทำโจทย์ประยุกต์ได้เองแล้ว เดือนหน้าจะเริ่มปูเรื่องพาราโบลาให้ครับ',
}

export const FAQ = [
  {
    q: 'ระบบถือเงินของผมไหม',
    a: 'ไม่ครับ ผู้ปกครองโอนเข้าบัญชีคุณโดยตรงผ่าน QR PromptPay ของคุณเอง ระบบทำหน้าที่แค่ตรวจสลิปกับรายการเดินบัญชีแล้วบันทึกให้ เราไม่ได้เป็นตัวกลางรับโอน จึงไม่เข้าข่ายต้องขอใบอนุญาต e-Money จาก ธปท.',
  },
  {
    q: 'ถ้าเช็คชื่อผิดคนต้องทำยังไง',
    a: 'กด "เลิกทำ" ในแถบที่เด้งขึ้นมาได้ทันที หรือถ้าเลยไปแล้ว แตะที่สถานะของคาบนั้นเพื่อเปลี่ยนได้ตลอด และแก้ประวัติย้อนหลังได้ในหน้าโปรไฟล์นักเรียน ยอดเงินจะคำนวณใหม่ให้เองทุกครั้ง',
  },
  {
    q: 'ผู้ปกครองต้องโหลดแอปไหม',
    a: 'ไม่ต้องครับ ทุกอย่างเกิดในแชท LINE ที่เขาใช้อยู่แล้ว บิลเข้า LINE แนบสลิปในแชท ระบบตรวจให้อัตโนมัติ',
  },
  {
    q: 'ระบบจะทวงจนผู้ปกครองรำคาญไหม',
    a: 'ตั้งได้ครับว่าทวงซ้ำทุกกี่วันและสูงสุดกี่ครั้งแล้วให้หยุด รวมถึงกำหนดช่วงเวลาที่ห้ามส่งได้ด้วย ค่าเริ่มต้นคือทวงซ้ำทุก 3 วัน สูงสุด 3 ครั้ง และไม่ส่งช่วง 20:00–08:00',
  },
  {
    q: 'ข้อมูลของผมเก็บที่ไหน',
    a: 'เดโมนี้เก็บทุกอย่างไว้ใน localStorage ของเบราว์เซอร์คุณเครื่องเดียวเท่านั้น ไม่มีการส่งออกไปที่ไหน ไม่มี server ไม่มี analytics และคุณ export ออกเป็นไฟล์ CSV ได้ตลอด',
  },
]
