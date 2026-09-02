import Sheet from './Sheet.jsx'
import { baht, packState } from '../state.js'

/** ชวนต่อแพ็ก — ข้อความในนามระบบ พร้อม QR ให้จ่ายจบในแชทเดียว */
export default function RenewSheet({ student, state, onClose, onSend }) {
  const b = student.billing
  const pk = packState(student)
  const tutor = state.settings.profile.publicName || state.settings.profile.name
  const { accountName, accountNo, promptpay } = state.settings.payout

  const text =
    `เรียน${student.parent} 🙏\n\n` +
    (pk.over > 0
      ? `แพ็ก ${pk.total} ครั้งของ${student.nick}ใช้ครบแล้ว และเรียนเพิ่มไปอีก ${pk.over} ครั้งครับ\n`
      : pk.left === 0
        ? `แพ็ก ${pk.total} ครั้งของ${student.nick}ใช้ครบพอดีแล้วครับ\n`
        : `แพ็ก ${pk.total} ครั้งของ${student.nick}เหลืออีก ${pk.left} ครั้งครับ\n`) +
    `สนใจต่อแพ็กใหม่ ${pk.total} ครั้ง ${baht(b.price)} บาท สแกนจ่ายได้เลยครับ\n\n` +
    `— ข้อความนี้ส่งโดยระบบของ${tutor}`

  return (
    <Sheet
      title="ชวนต่อแพ็ก"
      sub={`${student.parent} · แพ็ก ${pk.total} ครั้ง ${baht(b.price)} บาท`}
      onClose={onClose}
      footer={
        <button className="btn btn--cta btn--block" onClick={() => onSend(student)}>
          ส่งข้อความนี้
        </button>
      }
    >
      <div className="msg">{text}</div>

      <div className="qr" style={{ marginTop: 12 }}>
        <div className="qr__box" aria-hidden="true" />
        <div className="qr__t">
          <b>สแกนจ่าย PromptPay</b>
          <span>{promptpay}<br />{accountName} ···{accountNo}</span>
        </div>
      </div>

      {pk.over > 0 && (
        <p className="hint">
          <span className="hint__ico">⚠︎</span>
          <span>{pk.over} ครั้งที่เกินมา ระบบจะหักจากแพ็กใหม่ให้อัตโนมัติเมื่อผู้ปกครองต่อแพ็ก</span>
        </p>
      )}
    </Sheet>
  )
}
