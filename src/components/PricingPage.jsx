import { navigate } from '../router.js'

const PLANS = [
  {
    id: 'self',
    name: 'ใช้เอง',
    price: '299',
    fit: 'เหมาะกับนักเรียน 10–25 คน',
    lines: ['ระบบเช็คชื่อแตะเดียว', 'คิดเงินอัตโนมัติจากครั้งที่สอนจริง', 'ส่งบิลเข้า LINE พร้อม QR ของคุณ', 'ตรวจสลิปกับธนาคารให้', 'ทวงอัตโนมัติแทนคุณ'],
  },
  {
    id: 'done',
    name: 'ให้เราทำให้',
    price: '1,500',
    fit: 'เหมาะกับนักเรียน 30 คนขึ้นไป',
    featured: true,
    lines: ['ทุกอย่างในแพ็กใช้เอง', 'ทีมงานคีย์ข้อมูลให้', 'ตามสลิปให้ทุกใบ', 'ทวงและคุยกับผู้ปกครองแทน', 'สรุปส่งคุณเดือนละครั้ง'],
  },
]

export default function PricingPage({ onPick }) {
  return (
    <div className="page">
      <header className="page__hd">
        <button className="page__back" onClick={() => navigate('/')} aria-label="กลับหน้าแรก">‹</button>
        <span className="land__tag">เดโม · ข้อมูลสมมติทั้งหมด</span>
      </header>

      <div className="page__body">
        <div className="promo">ทดลองฟรี 2 เดือน — รับ 100 ที่แรก</div>

        <h1 className="page__h1">ราคา</h1>
        <p className="page__sub">เลือกได้ว่าจะทำเองหรือให้เราทำให้</p>

        <div className="plans">
          {PLANS.map((p) => (
            <div className={`plan${p.featured ? ' plan--hot' : ''}`} key={p.id}>
              {p.featured && <span className="plan__badge">แนะนำ</span>}
              <h2 className="plan__name">{p.name}</h2>
              <p className="plan__price">
                {p.price}<small> บาท/เดือน</small>
              </p>
              <p className="plan__fit">{p.fit}</p>
              <ul className="plan__list">
                {p.lines.map((l) => (
                  <li key={l}><span aria-hidden="true">✓</span>{l}</li>
                ))}
              </ul>
              <button
                className={`btn btn--block ${p.featured ? 'btn--cta' : 'btn--ghost'}`}
                onClick={() => onPick(p.id)}
              >
                สนใจแพ็กนี้
              </button>
            </div>
          ))}
        </div>

        <ul className="notes">
          <li>เงินค่าเรียนโอนเข้าบัญชีคุณโดยตรง ระบบไม่ถือเงินของใคร</li>
          <li>ข้อมูลเป็นของคุณ กดดาวน์โหลดออกได้ทุกเมื่อ</li>
        </ul>

        <button className="home__more" onClick={() => navigate('/app/home')} style={{ display: 'block', margin: '0 auto' }}>
          ← กลับไปลองกดเดโม
        </button>
      </div>
    </div>
  )
}
