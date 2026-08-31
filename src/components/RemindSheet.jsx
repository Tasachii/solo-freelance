import Sheet from './Sheet.jsx'
import { MONTH } from '../data.js'
import { baht, billOf } from '../state.js'

/** ข้อความทวงเปลี่ยนตามโทนที่ตั้งไว้ในหน้าตั้งค่า */
function compose(tone, { tutor, student, times, rate, amount }) {
  const head = `เรียน ${student.parent}\nค่าเรียนของ${student.nick} เดือน${MONTH}\n${times} ครั้ง × ${baht(rate)} = ${baht(amount)} บาท`
  const sign = '\n\n— ข้อความนี้ส่งโดยระบบอัตโนมัติ'

  if (tone === 'soft')
    return (
      `สวัสดีครับ รบกวนแจ้งจากระบบของ${tutor}นะครับ\n\n${head}\n` +
      `ระบบยังไม่พบยอดเข้าบัญชีครับ\n\n` +
      `ถ้าโอนแล้วรบกวนแนบสลิปในแชทนี้ได้เลยนะครับ\n` +
      `ถ้าช่วงนี้ยังไม่สะดวก ไม่ต้องเกรงใจเลยครับ แจ้งมาได้ตลอด${sign}`
    )
  if (tone === 'direct')
    return (
      `แจ้งจากระบบของ${tutor}ครับ\n\n${head}\n` +
      `ยังไม่ได้รับยอดครับ\n\n` +
      `รบกวนโอนและแนบสลิปในแชทนี้ครับ${sign}`
    )
  return (
    `แจ้งเตือนจากระบบของ${tutor}ครับ\n\n${head}\n` +
    `ระบบยังไม่พบยอดเข้าบัญชีนะครับ\n\n` +
    `ถ้าโอนแล้ว รบกวนแนบสลิปในแชทนี้ได้เลยครับ\n` +
    `ถ้าเดือนนี้ยังไม่สะดวก แจ้งมาได้เลยนะครับ ไม่มีปัญหาครับ${sign}`
  )
}

export default function RemindSheet({ student, state, onClose, onSend }) {
  const { times, rate, amount } = billOf(student, state)
  const d = state.settings.dunning
  const tutor = state.settings.profile.publicName || state.settings.profile.name
  const sentTimes = state.reminded[student.id] || 0
  const atLimit = sentTimes >= d.maxTimes

  const text = compose(d.tone, { tutor, student, times, rate, amount })

  return (
    <Sheet
      title="ให้ระบบทวงแทน"
      sub={`${student.parent} · ค้าง ${baht(amount)} บาท`}
      onClose={onClose}
      footer={
        <button className="btn btn--cta btn--block" onClick={() => onSend(student)} disabled={atLimit}>
          {atLimit ? `ทวงครบ ${d.maxTimes} ครั้งแล้ว` : 'ส่งข้อความนี้'}
        </button>
      }
    >
      <div className="msg">{text}</div>

      {atLimit ? (
        <div className="notice">
          ระบบทวงครบ <b>{d.maxTimes} ครั้ง</b>แล้วจึงหยุดอัตโนมัติ
          ถึงจุดนี้แนะนำให้คุยกับผู้ปกครองโดยตรงครับ ปรับจำนวนครั้งได้ในหน้าตั้งค่า
        </div>
      ) : (
        <div className="kv" style={{ borderTop: 'none' }}>
          <span>ทวงไปแล้ว</span>
          <b>{sentTimes}/{d.maxTimes} ครั้ง</b>
        </div>
      )}

      <p className="hint">
        <span className="hint__ico">🤝</span>
        <span>ลงชื่อว่า<b>ส่งโดยระบบ</b> ผู้ปกครองจึงไม่รู้สึกว่าถูกครูทวง</span>
      </p>
      <p className="hint">
        <span className="hint__ico">🌙</span>
        <span>ไม่ส่งช่วง <b>{d.quietFrom}–{d.quietTo}</b> · ทวงซ้ำทุก {d.everyDays} วัน</span>
      </p>
    </Sheet>
  )
}
