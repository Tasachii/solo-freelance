import Sheet from './Sheet.jsx'
import { FAQ, APP_VERSION } from '../data.js'

export default function HelpSheet({ onClose }) {
  return (
    <Sheet title="คำถามที่พบบ่อย" sub="สิ่งที่ติวเตอร์ถามเราบ่อยที่สุด" onClose={onClose}>
      <div className="faq">
        {FAQ.map((f) => (
          <div className="faqitem" key={f.q}>
            <h4>{f.q}</h4>
            <p>{f.a}</p>
          </div>
        ))}
      </div>
      <p className="disclaimer">Solo Tutor · เวอร์ชัน {APP_VERSION} · เดโม · ข้อมูลสมมติทั้งหมด</p>
    </Sheet>
  )
}
