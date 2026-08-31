import Sheet from './Sheet.jsx'
import { EmptyState } from './Field.jsx'

const time = (isoTs) => {
  try {
    const d = new Date(isoTs)
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  } catch { return '' }
}

/** ย้อนได้หลายขั้น ไม่ใช่แค่ขั้นเดียวเหมือน toast */
export default function HistorySheet({ state, onClose, onUndoTo }) {
  const history = state.history || []
  return (
    <Sheet
      title="ประวัติการแก้ไข"
      sub={`ย้อนกลับได้ถึง ${history.length} ขั้น`}
      onClose={onClose}
    >
      {history.length === 0 ? (
        <EmptyState icon="↺" title="ยังไม่มีอะไรให้ย้อน"
          desc="ทุกการเปลี่ยนแปลงในระบบจะถูกบันทึกไว้ที่นี่ ย้อนกลับได้ตลอด" />
      ) : (
        <>
          <div className="log">
            {history.map((h, i) => (
              <div className="logitem" key={h.id}>
                <span className="logitem__dot" />
                <span className="logitem__txt">{h.label}</span>
                <span className="logitem__at">{time(h.at)}</span>
                <button className="btn btn--ghost btn--sm" onClick={() => onUndoTo(i)}>
                  ย้อนถึงนี่
                </button>
              </div>
            ))}
          </div>
          <p className="hint">
            <span className="hint__ico">ⓘ</span>
            <span>ย้อนได้เฉพาะสิ่งที่เกิด<b>ในระบบ</b> · ข้อความที่ส่งออกไปแล้วย้อนไม่ได้</span>
          </p>
        </>
      )}
    </Sheet>
  )
}
