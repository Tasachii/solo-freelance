import { navigate } from '../router.js'

const POINTS = [
  {
    t: 'เช็คชื่อแตะเดียวทุกคาบ',
    d: 'ลืมนับครั้งเรียน 1 ครั้ง = สอนฟรี 400 บาท ระบบนับให้ ไม่ต้องจำเอง',
  },
  {
    t: 'บิลเข้า LINE ผู้ปกครองอัตโนมัติ',
    d: 'สิ้นเดือนคิดเงินจากครั้งที่สอนจริง ส่งพร้อม QR PromptPay ของคุณเอง',
  },
  {
    t: 'ระบบทวงแทน คุณไม่ต้องทวงเอง',
    d: 'คนที่ทวงคือระบบ ไม่ใช่ครู ความสัมพันธ์กับผู้ปกครองเลยไม่เสีย',
  },
]

export default function Landing() {
  return (
    <div className="land">
      <div className="land__body">
        <span className="land__tag rise">เดโม · ข้อมูลสมมติทั้งหมด</span>

        <h1 className="land__logo rise d1">
          ติวได้<em>ตังค์</em>
        </h1>

        <p className="land__lead rise d2">ปิดบิลสิ้นเดือนใน 5 นาที ไม่ใช่ 5 ชั่วโมง</p>
        <p className="land__sub rise d2">
          ระบบหลังบ้านสำหรับติวเตอร์เดี่ยวที่มีนักเรียน 30–80 คน
          เก็บครบทุกครั้งที่สอน เก็บเงินได้ตรงเวลา โดยไม่ต้องเป็นคนทวงเอง
        </p>

        <ul className="land__list">
          {POINTS.map((p, i) => (
            <li className={`land__item rise d${i + 3}`} key={p.t}>
              <span className="land__num">{i + 1}</span>
              <span>
                <b>{p.t}</b>
                <span>{p.d}</span>
              </span>
            </li>
          ))}
        </ul>

        <div className="land__cta rise d6">
          <button className="btn btn--cta btn--block" onClick={() => navigate('/app')}>
            ลองกดเล่นเดโม →
          </button>
          <p className="land__note">
            ระบบไม่แตะเงินของคุณ — ผู้ปกครองโอนเข้าบัญชีคุณโดยตรง
            <br />
            ระบบทำหน้าที่แค่ตรวจสลิปและบันทึกให้เท่านั้น
          </p>
        </div>
      </div>

      <div className="land__foot">
        <p>
          ทำโดย<b>ทีมนิสิต KU</b> เพื่อ validation — ถ้าคุณเป็นติวเตอร์และอยากคุยกับเรา
          เราอยากฟังว่าสิ้นเดือนของคุณเป็นยังไง
        </p>
        <a className="btn btn--ink btn--block" href="#" onClick={(e) => e.preventDefault()}>
          ทักเราทาง LINE
        </a>
        <p className="disclaimer">เดโม · ข้อมูลสมมติทั้งหมด · ไม่มีการเก็บข้อมูลจริง</p>
      </div>
    </div>
  )
}
