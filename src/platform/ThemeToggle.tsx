import { useEffect, useState } from 'react'
import { applyTheme, effectiveTheme, readTheme, type Theme } from '../core/theme'
import { ACCENTS, applyAccent, readAccent, type Accent } from '../core/accent'
import { copy } from '../copy'
import { BottomSheet, Icon } from '../app/components'

/** สลับสว่าง/มืดจากหน้าที่ไม่มีเมนู (หน้าแรก · เลือกรูปแบบ · ราคา) — เก็บค่าเดียวกับเมนูในแอป */
export function ThemeToggle() {
  const [dark, setDark] = useState(() => effectiveTheme(readTheme()) === 'dark')
  // ชีท "ปรับสีและธีม" เปลี่ยนธีมได้เหมือนกัน — ฟัง attribute บน <html> จะได้ไม่ค้างสถานะเก่า
  useEffect(() => {
    const sync = () => setDark(effectiveTheme(readTheme()) === 'dark')
    const mo = new MutationObserver(sync)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => mo.disconnect()
  }, [])
  const flip = () => {
    // อ่านค่าปัจจุบันตอนกด ไม่ใช่จาก state ที่อาจล้าหลัง
    const next = effectiveTheme(readTheme()) === 'dark' ? 'light' : 'dark'
    applyTheme(next)
    setDark(next === 'dark')
  }
  return (
    <button type="button" className="themetoggle" onClick={flip} aria-pressed={dark}
      aria-label={dark ? copy.menu.toLight : copy.menu.toDark} title={dark ? copy.menu.toLight : copy.menu.toDark}>
      <Icon name={dark ? 'sun' : 'moon'} size={18} />
    </button>
  )
}

/** ธีม + สีหลัก เลือกได้ตั้งแต่หน้าแรก — ชุดเดียวกับเมนูในแอป ค่าที่เลือกติดตามเข้าไปในแอป */
export function AppearanceButton() {
  const [open, setOpen] = useState(false)
  const [theme, setTheme] = useState<Theme>(readTheme)
  const [accent, setAccent] = useState<Accent>(readAccent)
  return (
    <>
      <button type="button" className="themetoggle" onClick={() => setOpen(true)} aria-label={copy.menu.appearance} title={copy.menu.appearance}>
        <Icon name="palette" size={18} />
      </button>
      {open && (
        <BottomSheet title={copy.menu.appearance} onClose={() => setOpen(false)}>
          <div className="fld">
            <div className="fld__l">{copy.menu.theme}</div>
            <div className="chips">
              {(['system', 'light', 'dark'] as Theme[]).map((t) => (
                <button key={t} type="button" className={`chip${theme === t ? ' chip--on' : ''}`} aria-pressed={theme === t}
                  onClick={() => { setTheme(t); applyTheme(t) }}>{copy.menu.themes[t]}</button>
              ))}
            </div>
          </div>
          <div className="fld">
            <div className="fld__l">{copy.menu.accent}</div>
            <div className="chips">
              {ACCENTS.map((a) => (
                <button key={a} type="button" className={`chip chip--dot${accent === a ? ' chip--on' : ''}`} aria-pressed={accent === a}
                  data-accent-swatch={a} onClick={() => { setAccent(a); applyAccent(a) }}>{copy.menu.accents[a]}</button>
              ))}
            </div>
          </div>
        </BottomSheet>
      )}
    </>
  )
}
