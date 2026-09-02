import { navigate } from '../router.js'
import { freshState, totals, baht, sessionsOn } from '../state.js'
import { TODAY, TODAY_PERIOD } from '../data.js'

// ภาพตัวอย่างต้องเลขตรงกับเดโมจริงเสมอ — เคย hardcode แล้วหลุดตอนเปลี่ยน mock
const PEEK = (() => {
  const s = freshState()
  const find = (id) => s.students.find((x) => x.id === id)
  return {
    outstanding: baht(totals(s, TODAY_PERIOD).outstanding),
    sessions: sessionsOn(s, TODAY).slice(0, 3).map((c) => ({ time: c.time, nick: find(c.studentId).nick })),
    auto: (s.autoLog || []).slice(0, 3).map((a) => a.text),
  }
})()
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
          <h1 className="land__logo rise d1">Solo<em>Tutor</em></h1>
          <p className="land__lead rise d2">
            ปิดบิลสิ้นเดือนใน 5 นาที
            <br />
            ไม่ใช่ 5 ชั่วโมง
          </p>
          <p className="land__sub rise d2">
            ระบบหลังบ้านสำหรับติวเตอร์เดี่ยว — เช็คชื่อ คิดเงิน ส่งบิล LINE ตรวจสลิป
            ออกใบเสร็จ และทวงแทนคุณ รองรับทั้งรายเดือนและแพ็กจ่ายล่วงหน้า
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
            <div className="peek__big">{PEEK.outstanding}<small> บาท</small></div>
            <div className="peek__lbl">ยังไม่เข้าบัญชี</div>

            <div className="peek__sec">วันนี้มี {PEEK.sessions.length}+ คาบ</div>
            {PEEK.sessions.map((c) => (
              <div className="peek__row" key={c.time + c.nick}>
                <b>{c.time}</b> {c.nick} <span className="peek__btn">เช็คชื่อ</span>
              </div>
            ))}

            <div className="peek__sec">ระบบทำให้แล้ว</div>
            {PEEK.auto.map((t) => (
              <div className="peek__auto" key={t}><i>✓</i> {t}</div>
            ))}
          </div>
        </div>
      </div>

      <footer className="land__foot rise d5">
        <p className="land__foot-t">
          ทีมนิสิต ม.เกษตรศาสตร์ กำลังหาติวเตอร์ <b>100&nbsp;คนแรก</b> มาลองใช้ฟรี 2 เดือน
        </p>
        <button className="land__foot-btn" onClick={onLead}>สนใจร่วมทดลองใช้ →</button>
      </footer>
    </div>
  )
}
