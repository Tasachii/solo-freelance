import Sheet from './Sheet.jsx'
import { EmptyState } from './Field.jsx'

const ICON = { slip: '🧾', slipBad: '⚠️', paid: '✓', reminded: '🔔', sent: '📤' }

/** กล่องข้อความเข้า — เหตุการณ์ที่ "เกิดกับคุณ" ไม่ใช่สิ่งที่คุณกดเอง */
export default function InboxSheet({ state, onClose, onOpenStudent, onMarkAllRead }) {
  return (
    <Sheet
      title="การแจ้งเตือน"
      sub="สิ่งที่เกิดขึ้นระหว่างที่คุณไม่ได้เปิดแอป"
      onClose={onClose}
      footer={
        state.inbox.some((i) => !i.read) ? (
          <button className="btn btn--ghost btn--block" onClick={onMarkAllRead}>
            อ่านทั้งหมดแล้ว
          </button>
        ) : null
      }
    >
      {state.inbox.length === 0 ? (
        <EmptyState icon="📭" title="ยังไม่มีการแจ้งเตือน"
          desc="เมื่อผู้ปกครองแนบสลิป หรือระบบทวงแทนคุณ รายการจะมาโผล่ที่นี่" />
      ) : (
        <div className="log">
          {state.inbox.map((n) => {
            const student = state.students.find((s) => s.id === n.studentId)
            return (
              <button
                key={n.id}
                className={`notif${n.read ? '' : ' notif--new'}`}
                onClick={() => student && onOpenStudent(student)}
              >
                <span className="notif__ico" aria-hidden="true">{ICON[n.kind] || '•'}</span>
                <span className="notif__main">
                  <span className="notif__txt">{n.text}</span>
                  <span className="notif__at">{n.at}</span>
                </span>
                {!n.read && <span className="notif__dot" aria-label="ยังไม่อ่าน" />}
              </button>
            )
          })}
        </div>
      )}
    </Sheet>
  )
}
