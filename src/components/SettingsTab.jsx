import { useState } from 'react'
import { TextField, SelectField, Switch, Segmented, Group } from './Field.jsx'
import { AVATAR_COLORS, DUNNING_TONES, APP_VERSION } from '../data.js'
import { baht, initialOf } from '../state.js'

const BANKS = ['ธ.กสิกรไทย', 'ธ.ไทยพาณิชย์', 'ธ.กรุงเทพ', 'ธ.กรุงไทย', 'ธ.กรุงศรีอยุธยา', 'ธ.ทหารไทยธนชาต', 'พร้อมเพย์อย่างเดียว']

export default function SettingsTab({
  state, onChange, theme, onTheme, onExport, onBackup, onImport,
  onClearData, onReset, onHelp, onActivity, onHistory, onInbox, unread,
}) {
  const s = state.settings
  const [advanced, setAdvanced] = useState(false)
  const put = (section, patch) => onChange({ ...s, [section]: { ...s[section], ...patch } })

  return (
    <div className={'settings'}>
      <Group title="โปรไฟล์" desc="ชื่อนี้จะขึ้นในข้อความที่ส่งถึงผู้ปกครอง">
        <div className="prof">
          <span className={`av av--lg av--c-${s.profile.avatarColor}`}>{initialOf(s.profile.name)}</span>
          <div className="prof__pick">
            <div className="fld__label">สีอวตาร</div>
            <div className="swatches">
              {AVATAR_COLORS.map((c) => (
                <button
                  key={c.id}
                  className={`swatch swatch--${c.id}${s.profile.avatarColor === c.id ? ' swatch--on' : ''}`}
                  onClick={() => put('profile', { avatarColor: c.id })}
                  aria-label={c.label}
                  aria-pressed={s.profile.avatarColor === c.id}
                />
              ))}
            </div>
          </div>
        </div>

        <TextField label="ชื่อที่ใช้ในระบบ" value={s.profile.name}
          onChange={(e) => put('profile', { name: e.target.value })} placeholder="พี่กานต์" />
        <TextField label="ชื่อที่ผู้ปกครองเห็น" value={s.profile.publicName}
          onChange={(e) => put('profile', { publicName: e.target.value })}
          hint="ใช้ลงท้ายข้อความบิลและข้อความทวง" />
        <div className="two">
          <TextField label="เบอร์โทร" value={s.profile.phone}
            onChange={(e) => put('profile', { phone: e.target.value })} inputMode="tel" />
          <TextField label="LINE ID" value={s.profile.lineId}
            onChange={(e) => put('profile', { lineId: e.target.value })} />
        </div>
      </Group>

      <Group title="บัญชีรับเงิน" desc="เงินเข้าบัญชีนี้โดยตรง ระบบไม่ได้เป็นตัวกลางรับโอน">
        <SelectField label="ธนาคาร" value={s.payout.bank}
          onChange={(e) => put('payout', { bank: e.target.value })}
          options={BANKS.map((b) => ({ value: b, label: b }))} />
        <TextField label="ชื่อบัญชี" value={s.payout.accountName}
          onChange={(e) => put('payout', { accountName: e.target.value })} />
        <div className="two">
          <TextField label="เลขบัญชี 4 ตัวท้าย" value={s.payout.accountNo}
            onChange={(e) => put('payout', { accountNo: e.target.value })}
            inputMode="numeric" maxLength={4} hint="แสดงบนสลิปเท่านั้น" />
          <TextField label="PromptPay" value={s.payout.promptpay}
            onChange={(e) => put('payout', { promptpay: e.target.value })}
            inputMode="tel" hint="ใช้สร้าง QR ในบิล" />
        </div>
      </Group>

      <Group title="เรทและการออกบิล" desc="เปลี่ยนแล้วยอดทุกใบคำนวณใหม่ทันที">
        <div className="two">
          <TextField label="เรทเรียนเดี่ยว" type="number" inputMode="numeric" min="0"
            value={s.rates.single} suffix="บาท"
            onChange={(e) => put('rates', { single: Math.max(0, Number(e.target.value) || 0) })} />
          <TextField label="เรทเรียนกลุ่ม" type="number" inputMode="numeric" min="0"
            value={s.rates.group} suffix="บาท"
            onChange={(e) => put('rates', { group: Math.max(0, Number(e.target.value) || 0) })} />
        </div>
        <Segmented label="วันออกบิล" value={s.billing.issueOn}
          onChange={(v) => put('billing', { issueOn: v })}
          options={[{ value: 'end', label: 'สิ้นเดือน' }, { value: 'first', label: 'วันที่ 1 เดือนถัดไป' }]}
          hint="นักเรียนที่ตั้งเรทเฉพาะคนไว้จะไม่ถูกกระทบ" />
      </Group>

      {advanced && (<>
      <Group title="การทวงอัตโนมัติ" desc="ระบบทวงแทน แต่ต้องไม่ทวงจนผู้ปกครองรำคาญ">
        <Switch label="ให้ระบบทวงแทน" hint="ปิดแล้วต้องกดทวงเองทุกครั้ง"
          checked={s.dunning.auto} onChange={(v) => put('dunning', { auto: v })} />
        {s.dunning.auto && (
          <>
            <div className="two">
              <TextField label="ทวงซ้ำทุก" type="number" inputMode="numeric" min="1" max="30" suffix="วัน"
                value={s.dunning.everyDays}
                onChange={(e) => put('dunning', { everyDays: Math.min(30, Math.max(1, Number(e.target.value) || 1)) })} />
              <TextField label="ทวงสูงสุด" type="number" inputMode="numeric" min="1" max="10" suffix="ครั้ง"
                value={s.dunning.maxTimes}
                onChange={(e) => put('dunning', { maxTimes: Math.min(10, Math.max(1, Number(e.target.value) || 1)) })}
                hint="ครบแล้วระบบจะหยุดและบอกคุณ" />
            </div>
            <div className="two">
              <TextField label="ห้ามส่งตั้งแต่" type="time" value={s.dunning.quietFrom}
                onChange={(e) => put('dunning', { quietFrom: e.target.value })} />
              <TextField label="ถึง" type="time" value={s.dunning.quietTo}
                onChange={(e) => put('dunning', { quietTo: e.target.value })} />
            </div>
            <Segmented label="โทนข้อความ" value={s.dunning.tone}
              onChange={(v) => put('dunning', { tone: v })}
              options={Object.entries(DUNNING_TONES).map(([value, label]) => ({ value, label }))} />
          </>
        )}
      </Group>

      <Group title="เตือนตัวคุณเอง" desc="กันลืมเช็คชื่อ ซึ่งคือจุดที่เงินรั่วบ่อยที่สุด">
        <SelectField label="เตือนก่อนคาบเริ่ม" value={String(s.notify.beforeClass)}
          onChange={(e) => put('notify', { beforeClass: Number(e.target.value) })}
          options={[
            { value: '0', label: 'ไม่เตือน' }, { value: '10', label: '10 นาที' },
            { value: '15', label: '15 นาที' }, { value: '30', label: '30 นาที' },
          ]} />
        <Switch label="เตือนเมื่อคาบจบแล้วยังไม่เช็คชื่อ"
          hint="ฟีเจอร์ที่กันเงินรั่วได้จริงที่สุด"
          checked={s.notify.missedCheckin} onChange={(v) => put('notify', { missedCheckin: v })} />
        <Switch label="สรุปรายวันตอนสี่ทุ่ม" hint="วันนี้สอนกี่คาบ ได้เท่าไหร่ ใครยังไม่จ่าย"
          checked={s.notify.dailySummary} onChange={(v) => put('notify', { dailySummary: v })} />
        <p className="fld__hint" style={{ marginTop: 10 }}>
          เดโมนี้ยังไม่มีระบบส่งแจ้งเตือนจริง ตั้งค่าไว้เพื่อให้เห็นว่าระบบจริงจะทำงานยังไง
        </p>
      </Group>

      </>)}

      <Group title="หน้าตา">
        <Segmented label="ธีม" value={theme} onChange={onTheme}
          options={[
            { value: 'light', label: 'สว่าง' },
            { value: 'dark', label: 'มืด' },
            { value: 'system', label: 'ตามระบบ' },
          ]} />
        <Segmented label="ขนาดตัวอักษร" value={s.display.fontScale}
          onChange={(v) => put('display', { fontScale: v })}
          options={[
            { value: 'small', label: 'เล็ก' },
            { value: 'normal', label: 'ปกติ' },
            { value: 'large', label: 'ใหญ่' },
          ]}
          hint="หน้าเช็คชื่อต้องกดถูกตั้งแต่ครั้งแรก แม้ในที่แสงน้อย" />
      </Group>

      <Group title="ข้อมูลของคุณ" desc="ข้อมูลทั้งหมดอยู่ในเบราว์เซอร์เครื่องนี้เท่านั้น ไม่ถูกส่งไปที่ไหน">
        <div className="rows">
          <button className="row" onClick={onInbox}>
            <span className="row__main"><b>การแจ้งเตือน</b><span>สลิปที่ผู้ปกครองแนบมา และสิ่งที่ระบบทำแทนคุณ</span></span>
            <span className="row__go">{unread > 0 ? <span className="row__n">{unread}</span> : '›'}</span>
          </button>
          <button className="row" onClick={onHistory}>
            <span className="row__main"><b>ประวัติการแก้ไข</b><span>ย้อนกลับได้หลายขั้น ไม่ใช่แค่ขั้นล่าสุด</span></span>
            <span className="row__go">↺</span>
          </button>
          <button className="row" onClick={onActivity}>
            <span className="row__main"><b>ประวัติการส่งข้อความ</b><span>ดูว่าระบบส่งอะไรถึงใครไปแล้วบ้าง</span></span>
            <span className="row__go">›</span>
          </button>
          <button className="row" onClick={onExport}>
            <span className="row__main"><b>ดาวน์โหลดข้อมูล (CSV)</b><span>เปิดใน Excel หรือ Google Sheets ได้เลย</span></span>
            <span className="row__go">↓</span>
          </button>
          <button className="row" onClick={onBackup}>
            <span className="row__main"><b>สำรองข้อมูล (JSON)</b><span>เก็บไฟล์ไว้ กู้คืนกลับมาได้ทั้งหมด</span></span>
            <span className="row__go">↓</span>
          </button>
          <button className="row" onClick={onImport}>
            <span className="row__main"><b>กู้คืนจากไฟล์สำรอง</b><span>เลือกไฟล์ .json ที่เคยสำรองไว้</span></span>
            <span className="row__go">↑</span>
          </button>
          <button className="row" onClick={onClearData}>
            <span className="row__main"><b>เริ่มจากศูนย์</b><span>ลบข้อมูลตัวอย่าง เพื่อใส่นักเรียนจริงของคุณ</span></span>
            <span className="row__go">›</span>
          </button>
          <button className="row row--danger" onClick={onReset}>
            <span className="row__main"><b>รีเซ็ตข้อมูลเดโม</b><span>กลับไปเป็นข้อมูลตัวอย่างตั้งต้น</span></span>
            <span className="row__go">↺</span>
          </button>
        </div>
      </Group>

      {!advanced && (
        <button className="advbtn" onClick={() => setAdvanced(true)}>
          ตั้งค่าขั้นสูง · การทวงและการแจ้งเตือน
        </button>
      )}

      <Group title="ช่วยเหลือ">
        <div className="rows">
          <button className="row" onClick={onHelp}>
            <span className="row__main"><b>คำถามที่พบบ่อย</b><span>ระบบถือเงินไหม · กดผิดทำยังไง · ผู้ปกครองต้องโหลดแอปไหม</span></span>
            <span className="row__go">›</span>
          </button>
          <a className="row" href="#" onClick={(e) => e.preventDefault()}>
            <span className="row__main"><b>ทักทีมงานทาง LINE</b><span>อยากคุยกับติวเตอร์จริง บอกเราได้เลย</span></span>
            <span className="row__go">›</span>
          </a>
        </div>
        <p className="fld__hint" style={{ marginTop: 12, textAlign: 'center' }}>
          Solo Tutor · เวอร์ชัน {APP_VERSION} · เดโม ข้อมูลสมมติทั้งหมด
          <br />
          เรทปัจจุบัน เดี่ยว {baht(s.rates.single)} · กลุ่ม {baht(s.rates.group)} บาท/ครั้ง
        </p>
      </Group>
    </div>
  )
}
