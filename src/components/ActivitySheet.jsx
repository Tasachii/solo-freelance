import Sheet from './Sheet.jsx'
import { EmptyState } from './Field.jsx'

/** ประวัติสิ่งที่ระบบส่งออกไป — ข้อความที่ส่งแล้วย้อนไม่ได้ อย่างน้อยต้องรู้ว่าส่งอะไรไป */
export default function ActivitySheet({ state, onClose }) {
  return (
    <Sheet title="ประวัติการส่งข้อความ" sub="สิ่งที่ส่งออกไปหาผู้ปกครองแล้ว" onClose={onClose}>
      {state.activity.length === 0 ? (
        <EmptyState
          icon="📭"
          title="ยังไม่ได้ส่งอะไร"
          desc="เมื่อส่งบิล ทวง หรือส่งสรุปพัฒนาการ รายการจะมาโผล่ที่นี่"
        />
      ) : (
        <div className="log">
          {state.activity.map((a) => (
            <div className="logitem" key={a.id}>
              <span className="logitem__dot" />
              <span className="logitem__txt">{a.text}</span>
              <span className="logitem__at">{a.at}</span>
            </div>
          ))}
        </div>
      )}
      <p className="hint">
        <span className="hint__ico">⚠︎</span>
        <span>ข้อความที่ส่งไปแล้ว<b>ยกเลิกไม่ได้</b> ระบบจึงให้ดูตัวอย่างก่อนทุกครั้ง</span>
      </p>
    </Sheet>
  )
}
