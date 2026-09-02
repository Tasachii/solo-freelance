import { useState } from 'react'
import { navigate } from '../router.js'

const PLANS = [
  {
    id: 'free', name: 'ฟรี', price: '0', unit: 'ใช้ฟรีตลอด',
    fit: 'เริ่มจัดระเบียบการสอน',
    lines: ['เช็คชื่อแตะเดียว', 'นับครั้งเรียนอัตโนมัติ', 'ตารางสอนรายสัปดาห์', 'ดาวน์โหลดข้อมูล (Excel)'],
  },
  {
    id: 'pro', name: 'Pro', price: '299', unit: 'บาท/เดือน', featured: true,
    fit: 'จ่ายเฉพาะเดือนที่ส่งบิล ปิดเทอมไม่คิด',
    lines: ['ทุกอย่างในแพ็กฟรี', 'คิดเงินอัตโนมัติทั้งรายครั้ง เหมา และแพ็ก', 'บิลเข้า LINE + ตรวจสลิปกับธนาคาร', 'ใบเสร็จรับเงินอัตโนมัติ', 'ทวงแทนคุณ + เตือนต่อแพ็ก', 'Dashboard และประวัติเรียน-จ่าย'],
  },
  {
    id: 'done', name: 'Concierge', price: '1,500', unit: 'บาท/เดือน',
    fit: 'เหมาะกับนักเรียน 30 คนขึ้นไป',
    lines: ['ทุกอย่างในแพ็ก Pro', 'ทีมงานทำให้ทั้งหมด', 'คุณแค่บอกว่าใครเรียนกี่ครั้ง', 'สรุปส่งคุณเดือนละครั้ง'],
  },
]

export default function PricingPage({ onPick }) {
  const [quarterly, setQuarterly] = useState(false)

  return (
    <div className="page">
      <header className="page__hd">
        <button className="page__back" onClick={() => navigate('/')} aria-label="กลับหน้าแรก">‹</button>
        <span className="land__tag">เดโม · ข้อมูลสมมติทั้งหมด</span>
      </header>

      <div className="page__body">
        <div className="promo">ทดลองฟรี 2 เดือน — รับ 100 ที่แรก ล็อกราคานี้ตลอดไป</div>

        <h1 className="page__h1">ราคา</h1>
        <p className="page__sub">เริ่มฟรี จ่ายเมื่อพร้อม หรือให้เราทำให้</p>

        <div className="plans plans--3">
          {PLANS.map((p) => (
            <div className={`plan${p.featured ? ' plan--hot' : ''}`} key={p.id}>
              {p.featured && <span className="plan__badge">แนะนำ</span>}
              <h2 className="plan__name">{p.name}</h2>
              <p className="plan__price">
                {p.featured && quarterly ? '850' : p.price}
                <small> {p.featured && quarterly ? 'บาท/ไตรมาส' : p.unit}</small>
              </p>
              <p className="plan__fit">
                {p.featured && quarterly ? 'ประหยัด 47 บาทจากจ่ายรายเดือน' : p.fit}
              </p>

              {p.featured && (
                <button
                  className={`qtoggle${quarterly ? ' qtoggle--on' : ''}`}
                  role="switch" aria-checked={quarterly}
                  onClick={() => setQuarterly((v) => !v)}
                >
                  <span className="qtoggle__dot" aria-hidden="true" />
                  รายไตรมาส 850 บาท (ประหยัด 47)
                </button>
              )}

              <ul className="plan__list">
                {p.lines.map((l) => <li key={l}><span aria-hidden="true">✓</span>{l}</li>)}
              </ul>
              <button
                className={`btn btn--block ${p.featured ? 'btn--cta' : 'btn--ghost'}`}
                onClick={() => onPick(p.id)}
              >
                {p.id === 'free' ? 'เริ่มใช้ฟรี' : 'สนใจแพ็กนี้'}
              </button>
            </div>
          ))}
        </div>

        <ul className="notes">
          <li>เงินค่าเรียนโอนเข้าบัญชีคุณโดยตรง ระบบไม่ถือเงินของใคร</li>
          <li>ข้อมูลเป็นของคุณ ดาวน์โหลดออกได้ทุกเมื่อ</li>
        </ul>

        <button className="home__more" onClick={() => navigate('/app/home')} style={{ display: 'block', margin: '0 auto' }}>
          ← กลับไปลองกดเดโม
        </button>
      </div>
    </div>
  )
}
