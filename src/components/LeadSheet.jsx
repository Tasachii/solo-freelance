import { useState } from 'react'
import Sheet from './Sheet.jsx'
import { TextField, Switch } from './Field.jsx'
import { submitLead, markLeadSent, FORM_ENDPOINT } from '../lead.js'

const PLAN_LABEL = { self: 'ใช้เอง 299', done: 'ให้เราทำให้ 1,500' }

export default function LeadSheet({ plan, onClose }) {
  const [f, setF] = useState({ name: '', contact: '', students: '', subjects: '', wantsHelp: true })
  const [err, setErr] = useState({})
  const [state, setState] = useState('form') // form | sending | done | error

  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }))

  const submit = async () => {
    const next = {}
    if (!f.name.trim()) next.name = 'ใส่ชื่อที่ให้เราเรียกด้วยครับ'
    if (!f.contact.trim()) next.contact = 'ใส่ LINE ID หรือเบอร์ไว้ให้เราทักกลับครับ'
    if (f.students !== '' && (!Number.isFinite(Number(f.students)) || Number(f.students) < 0)) {
      next.students = 'ใส่เป็นตัวเลขนะครับ'
    }
    setErr(next)
    if (Object.keys(next).length) return

    setState('sending')
    try {
      await submitLead({
        name: f.name.trim(),
        contact: f.contact.trim(),
        students: f.students,
        subjects: f.subjects.trim(),
        wantsHelp: f.wantsHelp ? 'สนใจ' : 'ยังไม่สนใจ',
        plan: plan ? PLAN_LABEL[plan] || plan : '',
      })
      markLeadSent()
      setState('done')
    } catch {
      setState('error')
    }
  }

  if (state === 'done') {
    return (
      <Sheet title="ขอบคุณมากครับ" onClose={onClose}
        footer={<button className="btn btn--ink btn--block" onClick={onClose}>ปิด</button>}>
        <p className="msg">
          ได้รับข้อมูลของ{f.name.trim() || 'คุณ'}แล้วครับ
          {'\n\n'}ทีมงานจะทักกลับทาง LINE ภายใน 1–2 วัน เพื่อนัดคุยสั้นๆ ว่าสิ้นเดือนของคุณเป็นยังไง
          และดูว่าระบบช่วยตรงไหนได้บ้าง
          {'\n\n'}ถ้าอยากคุยเร็วกว่านั้น ทักมาที่ LINE ของทีมได้เลยครับ
        </p>
        <p className="disclaimer">เดโม · ข้อมูลสมมติทั้งหมด</p>
      </Sheet>
    )
  }

  return (
    <Sheet
      title="อยากลองใช้กับนักเรียนจริงไหม"
      sub="ทีมนิสิต ม.เกษตรศาสตร์ กำลังหาติวเตอร์ 100 คนแรกมาลองใช้ฟรี 2 เดือน"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn--cta btn--block" onClick={submit} disabled={state === 'sending'}>
            {state === 'sending' ? 'กำลังส่ง…' : 'ส่งข้อมูล'}
          </button>
          {state === 'error' && (
            <p className="fld__err" style={{ textAlign: 'center', marginTop: 10 }}>
              ส่งไม่สำเร็จ ลองอีกครั้งครับ
            </p>
          )}
        </>
      }
    >
      {plan && (
        <div className="notice" style={{ background: 'var(--ok-soft)', color: 'var(--ok)' }}>
          สนใจแพ็ก <b>{PLAN_LABEL[plan]} บาท/เดือน</b>
        </div>
      )}

      <TextField label="ชื่อ" value={f.name} onChange={set('name')} placeholder="เรียกคุณว่าอะไรดีครับ" error={err.name} />
      <TextField label="LINE ID หรือเบอร์" value={f.contact} onChange={set('contact')}
        placeholder="@yourline หรือ 08x-xxx-xxxx" error={err.contact} />
      <div className="two">
        <TextField label="ตอนนี้สอนกี่คน" type="number" inputMode="numeric" min="0"
          value={f.students} onChange={set('students')} suffix="คน" error={err.students} />
        <TextField label="สอนวิชาอะไร" value={f.subjects} onChange={set('subjects')} placeholder="คณิต ฟิสิกส์" />
      </div>

      <Switch
        label="สนใจให้ทีมทำให้ฟรี 1 รอบบิล"
        hint="เราคีย์ข้อมูล ตามสลิป และทวงให้ 1 เดือน เพื่อดูว่าเวิร์กกับคุณไหม"
        checked={f.wantsHelp}
        onChange={(v) => setF((p) => ({ ...p, wantsHelp: v }))}
      />

      <p className="fld__hint" style={{ marginTop: 12 }}>
        เราใช้ข้อมูลนี้เพื่อติดต่อกลับเท่านั้น ไม่ส่งต่อให้ใคร
        {!FORM_ENDPOINT && ' · โหมดเดโม: ข้อมูลไม่ถูกส่งออกไปไหน'}
      </p>
    </Sheet>
  )
}
