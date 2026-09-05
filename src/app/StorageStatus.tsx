import { useStore, SCHEMA } from '../core/store'
import { download } from '../core/export'
import { pickBackup, saveBackup } from './backup'

export default function StorageStatus() {
  const { state, dispatch, persistenceError, recoveryRaw, didReset } = useStore()
  if (!persistenceError) return null
  return <section role="alert" className="card" style={{ margin: '12px', border: '2px solid var(--danger)' }}>
    <h2 className="h2">{didReset ? 'ข้อมูลเดิมต้องกู้คืน' : 'ยังบันทึกไม่สำเร็จ'}</h2>
    <p>{persistenceError}</p>
    <div className="btnrow">
      {recoveryRaw !== null
        ? <button className="btn btn--secondary" onClick={() => download(recoveryRaw, 'solo-recovery-raw.json', 'application/json')}>เก็บสำเนาข้อมูลเดิม</button>
        : !didReset && <button className="btn btn--secondary" onClick={() => void saveBackup(state)}>สำรองข้อมูลที่บันทึกแล้ว</button>}
      {didReset && <button className="btn btn--primary" onClick={async () => {
        const result = await pickBackup(SCHEMA)
        if (result?.ok) dispatch({ type: 'restore', state: result.state })
      }}>กู้คืนจากไฟล์สำรอง</button>}
      <button className="btn btn--ghost" onClick={() => window.location.reload()}>โหลดข้อมูลใหม่</button>
    </div>
    {didReset && <p className="hint">ข้อมูลเดิมยังอยู่ในเครื่อง และจะเก็บสำเนาแยกให้อีกครั้งก่อนกู้คืนสำเร็จ</p>}
  </section>
}
