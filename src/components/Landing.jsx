import { navigate } from '../router.js'
import { IconSun, IconMoon } from './Icons.jsx'

const POINTS = ['เช็คชื่อแตะเดียวทุกคาบ', 'บิลเข้า LINE ผู้ปกครองอัตโนมัติ', 'ระบบทวงแทน คุณไม่ต้องทวงเอง']

export default function Landing({ isDark, onToggleTheme, onLead }) {
  return (
    <div className="land">
      <div className="land__inner">
        <div className="land__topbar rise">
          <span className="land__tag">เดโม · ข้อมูลสมมติ</span>
          <button
            className="hd__btn"
            onClick={onToggleTheme}
            aria-label={isDark ? 'ใช้โหมดสว่าง' : 'ใช้โหมดมืด'}
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--muted)' }}
          >
            {isDark ? <IconSun /> : <IconMoon />}
          </button>
        </div>

        <h1 className="land__logo rise d1">
          ติวได้<em>ตังค์</em>
        </h1>
        <p className="land__lead rise d2">ปิดบิลสิ้นเดือนใน 5 นาที ไม่ใช่ 5 ชั่วโมง</p>

        <ul className="land__list">
          {POINTS.map((p, i) => (
            <li className={`land__item rise d${i + 3}`} key={p}>
              <span className="land__num">{i + 1}</span>
              {p}
            </li>
          ))}
        </ul>

        <div className="land__cta rise d6">
          <button className="btn btn--cta btn--block" onClick={() => navigate('/app')}>
            ลองกดเล่นเดโม →
          </button>
          <p className="land__note">ระบบไม่แตะเงิน — โอนเข้าบัญชีคุณโดยตรง</p>
          <button className="home__more" style={{ display: 'block', margin: '10px auto 0' }}
            onClick={() => navigate('/pricing')}>
            ดูราคา →
          </button>
        </div>

        <div className="recruit rise d6">
          <p className="recruit__t">ทีมนิสิต ม.เกษตรศาสตร์ กำลังหาติวเตอร์ 10 คนแรก มาลองใช้ฟรี 2 เดือน</p>
          <button className="btn btn--ink btn--block" onClick={onLead}>สนใจร่วมทดลองใช้</button>
        </div>
      </div>

      <div className="land__foot">
        <p>
          ทีมนิสิต KU · เดโม ข้อมูลสมมติทั้งหมด ·{' '}
          <a href="#" onClick={(e) => e.preventDefault()}>
            ทักเราทาง LINE
          </a>
        </p>
      </div>
    </div>
  )
}
