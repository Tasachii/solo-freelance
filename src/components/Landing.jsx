import { navigate } from '../router.js'
import { IconSun, IconMoon } from './Icons.jsx'

const POINTS = [
  'เช็คชื่อแตะเดียวทุกคาบ',
  'บิลเข้า LINE ผู้ปกครองอัตโนมัติ',
  'ระบบทวงแทน คุณไม่ต้องทวงเอง',
]

export default function Landing({ isDark, onToggleTheme, onLead }) {
  return (
    <div className="land">
      <div className="land__top rise">
          <span className="land__tag">เดโม · ข้อมูลสมมติ</span>
          <button className="land__theme" onClick={onToggleTheme}
            aria-label={isDark ? 'ใช้โหมดสว่าง' : 'ใช้โหมดมืด'}>
            {isDark ? <IconSun /> : <IconMoon />}
          </button>
        </div>

      <div className="land__inner">
        <div className="land__col">
        <div className="land__brand">
          <h1 className="land__logo rise d1">ติวได้<em>ตังค์</em></h1>
          <p className="land__lead rise d2">
            ปิดบิลสิ้นเดือนใน 5 นาที
            <br />
            ไม่ใช่ 5 ชั่วโมง
          </p>
        </div>

        <ul className="land__list rise d3">
          {POINTS.map((p) => (
            <li key={p}>
              <span aria-hidden="true">✓</span>
              {p}
            </li>
          ))}
        </ul>

        <div className="land__cta rise d4">
          <button className="btn btn--cta btn--block" onClick={() => navigate('/app/home')}>
            ลองกดเล่นเดโม →
          </button>
          <p className="land__note">
            ระบบไม่แตะเงิน โอนเข้าบัญชีคุณโดยตรง
            {' · '}
            <button className="land__link" onClick={() => navigate('/pricing')}>ดูราคา</button>
          </p>
        </div>
        </div>

        {/* ภาพตัวอย่างหน้าจอจริง — ให้จอกว้างมีอะไรดูและรู้ว่าโปรดักต์หน้าตายังไง */}
        <div className="land__peek rise d4" aria-hidden="true">
          <div className="peek">
            <div className="peek__hd">สวัสดี พี่กานต์</div>
            <div className="peek__big">3,350<small> บาท</small></div>
            <div className="peek__lbl">ยังไม่เข้าบัญชี</div>

            <div className="peek__sec">วันนี้มี 4 คาบ</div>
            <div className="peek__row"><b>16:30</b> น้องแพรว <span className="peek__btn">เช็คชื่อ</span></div>
            <div className="peek__row"><b>18:00</b> น้องต้นน้ำ <span className="peek__btn">เช็คชื่อ</span></div>
            <div className="peek__row"><b>19:45</b> น้องภูมิ <span className="peek__btn">เช็คชื่อ</span></div>

            <div className="peek__sec">ระบบทำให้แล้ว</div>
            <div className="peek__auto"><i>✓</i> รับยอดของน้องแพรว 3,200 บาท</div>
            <div className="peek__auto"><i>✓</i> ส่งบิลเข้า LINE ผู้ปกครอง 6 คน</div>
            <div className="peek__auto"><i>✓</i> ทวงน้องต้นน้ำแทนคุณ (1/3)</div>
          </div>
        </div>
      </div>

      <footer className="land__foot rise d5">
        <p className="land__foot-t">
          ทีมนิสิต ม.เกษตรศาสตร์ กำลังหาติวเตอร์ <b>10&nbsp;คนแรก</b> มาลองใช้ฟรี 2 เดือน
        </p>
        <button className="land__foot-btn" onClick={onLead}>สนใจร่วมทดลองใช้ →</button>
      </footer>
    </div>
  )
}
