import { professions } from '../professions'
import { copy } from '../copy'

const modeLabel = (m?: string): string =>
  (m && copy.waitlist.modeLabels[m as keyof typeof copy.waitlist.modeLabels]) || '—'

/**
 * ตารางสร้างจาก vocab จริงของแต่ละอาชีพ ไม่ได้พิมพ์ค่าซ้ำ
 * เป็นข้อมูลสำหรับตอนนำเสนอ จึงอยู่หน้า /pitch ไม่ใช่หน้าแรกที่คนจะเข้ามาใช้งาน
 */
export default function EngineTable() {
  const cell = (p: (typeof professions)[number], row: number): string => {
    const v = p.vocab
    return [v.client, v.subject, v.unit, v.completionDone, modeLabel(p.defaultBilling)][row]
  }
  return (
    <div className="tblwrap">
      <table className="engine">
        <caption className="engine__cap">{copy.landing.engineCaption}</caption>
        <thead>
          <tr>
            <th scope="col" />
            {professions.map((p) => (
              <th key={p.id} scope="col">
                <span aria-hidden="true">{p.icon}</span> {p.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {copy.landing.engineRows.map((label, i) => (
            <tr key={label}>
              <th scope="row">{label}</th>
              {professions.map((p) => <td key={p.id}>{cell(p, i)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
