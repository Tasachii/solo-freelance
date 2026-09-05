import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useStore } from '../core/store'
import type { AppState } from '../core/types'
import { pickBackup, saveBackup } from './backup'
import { SCHEMA } from '../core/store'
import { useToast } from './components/Toast'
import { professionById } from '../professions'
import { copy } from '../copy'
import { draftCount } from '../core/selectors'
import { BottomSheet, ConfirmSheet, DemoBadge } from './components'
import { SCENARIOS, SCENARIO_LABEL, type ScenarioId } from '../core/scenarios'
import { applyTheme, readTheme, type Theme } from '../core/theme'
import { applySize, readSize, type DisplaySize } from '../core/display'

export default function AppShell() {
  const { state, dispatch, resetDemo, track } = useStore()
  const prof = professionById(state.professionId)
  const nav = useNavigate()
  const loc = useLocation()
  const [menu, setMenu] = useState(false)
  const [theme, setTheme] = useState<Theme>(readTheme)
  const [size, setSize] = useState<DisplaySize>(readSize)
  // ask = สิ่งที่กำลังถามยืนยันอยู่ (แทน window.confirm ที่ใช้ไม่ได้บน PWA)
  const [ask, setAsk] = useState<null | 'toDemo' | 'toReal' | { restore: AppState; cross: boolean }>(null)
  const real = state.mode === 'real'
  const toast = useToast()
  const drafts = draftCount(state)

  // ยังไม่มีข้อมูลเลย = พาไป onboarding ก่อน
  useEffect(() => {
    if (!state.onboarded && state.subjects.length === 0 && !loc.pathname.endsWith('/onboarding')) {
      nav('/app/onboarding', { replace: true })
    }
  }, [state.onboarded, state.subjects.length, loc.pathname, nav])

  const tabs = [
    { to: '/app/today', label: copy.nav.today },
    { to: '/app/subjects', label: prof.vocab.subjects },
    { to: '/app/billing', label: copy.nav.billing },
    { to: '/app/admin', label: copy.nav.admin, badge: drafts },
  ]

  return (
    <div className="shell">
      <header className="shell__hd">
        <b className="shell__brand">{copy.brand.name}</b>
        <div className="shell__hdr">
          {!real && <DemoBadge />}
          <button className="shell__menu" onClick={() => setMenu(true)} aria-label={copy.menu.title}>⋯</button>
        </div>
      </header>

      <main className="shell__main"><Outlet /></main>

      <nav className="tabbar">
        {tabs.map((t) => (
          <NavLink key={t.to} to={t.to} className={({ isActive }) => `tab${isActive ? ' tab--on' : ''}`}>
            <span>{t.label}</span>
            {t.badge ? <i className="tab__badge">{t.badge}</i> : null}
          </NavLink>
        ))}
      </nav>

      {menu && (
        <BottomSheet title={copy.menu.title} onClose={() => setMenu(false)}>
          <div className="rows">
            {real ? (
              <button className="row" onClick={() => setAsk('toDemo')}>{copy.menu.backToDemo}</button>
            ) : (
              <>
                <button className="row" onClick={() => { resetDemo(); setMenu(false) }}>{copy.menu.reset}</button>
                <button className="row row--go" onClick={() => setAsk('toReal')}>{copy.menu.startReal}</button>
              </>
            )}
            <button className="row" onClick={async () => {
              setMenu(false)
              const ok = await saveBackup(state)
              // จด lastBackupAt เฉพาะเมื่อได้ไฟล์จริง ไม่งั้นคำเตือน 7 วันจะเงียบทั้งที่ไม่มีไฟล์
              if (ok) { dispatch({ type: 'backedUp' }); track('backup_save'); toast.push({ text: copy.menu.backupDone, tone: 'ok' }) }
              else toast.push({ text: copy.menu.backupFailed, tone: 'danger' })
            }}>{copy.menu.backup}</button>
            <button className="row" onClick={async () => {
              const res = await pickBackup(SCHEMA)
              if (!res) return
              if (!res.ok) { toast.push({ text: copy.menu.restoreBad[res.reason], tone: 'danger' }); return }
              // ไฟล์คนละโหมดกับที่ใช้อยู่ = กำลังจะทับข้อมูลจริงด้วยเดโม หรือกลับกัน
              setAsk({ restore: res.state, cross: res.state.mode !== state.mode })
            }}>{copy.menu.restore}</button>
            {state.clients[0] && (
              <button className="row" onClick={() => { setMenu(false); nav(`/client/${state.clients[0].id}`) }}>
                {copy.menu.clientView}
              </button>
            )}
          </div>
          <div className="fld">
            <div className="fld__l">{copy.menu.size}</div>
            <div className="chips">
              {(['sm', 'lg', 'xl'] as DisplaySize[]).map((z) => (
                <button key={z} className={`chip${size === z ? ' chip--on' : ''}`}
                  aria-pressed={size === z}
                  onClick={() => { setSize(z); applySize(z); track('size_switch', { size: z }) }}>
                  {copy.menu.sizes[z]}
                </button>
              ))}
            </div>
          </div>
          <div className="fld">
            <div className="fld__l">{copy.menu.theme}</div>
            <div className="chips">
              {(['system', 'light', 'dark'] as Theme[]).map((tm) => (
                <button key={tm} className={`chip${theme === tm ? ' chip--on' : ''}`}
                  aria-pressed={theme === tm}
                  onClick={() => { setTheme(tm); applyTheme(tm); track('theme_switch', { theme: tm }) }}>
                  {copy.menu.themes[tm]}
                </button>
              ))}
            </div>
          </div>
          {!real && <div className="fld">
            <div className="fld__l">{copy.menu.scenario}</div>
            <div className="chips">
              {SCENARIOS.map((sc) => (
                <button key={sc} className={`chip${state.scenarioId === sc ? ' chip--on' : ''}`}
                  aria-pressed={state.scenarioId === sc}
                  onClick={() => { resetDemo(sc as ScenarioId); track('scenario_switch', { scenario: sc }); setMenu(false); nav('/app/today') }}>
                  {SCENARIO_LABEL[sc]}
                </button>
              ))}
            </div>
          </div>}
        </BottomSheet>
      )}

      {ask === 'toDemo' && (
        <ConfirmSheet title={copy.menu.backToDemo} body={copy.menu.backToDemoConfirm}
          confirmLabel={copy.menu.backToDemo} danger
          onClose={() => setAsk(null)}
          onConfirm={async () => {
            // ต้องได้ไฟล์สำรองก่อน ไม่งั้นข้อมูลเดือนหนึ่งหายโดยไม่มีทางกู้
            if (!(await saveBackup(state))) { toast.push({ text: copy.menu.backupFailed, tone: 'danger' }); return }
            resetDemo('default'); setMenu(false); nav('/app/today')
          }} />
      )}
      {ask === 'toReal' && (
        <ConfirmSheet title={copy.menu.startReal} body={copy.menu.startRealConfirm}
          confirmLabel={copy.menu.startReal}
          onClose={() => setAsk(null)}
          onConfirm={() => {
            dispatch({ type: 'startReal' }); track('start_real')
            setMenu(false); nav('/app/onboarding')
          }} />
      )}
      {ask && typeof ask === 'object' && (
        <ConfirmSheet title={copy.menu.restore}
          body={ask.cross ? copy.menu.restoreCrossMode : copy.menu.restoreConfirm}
          confirmLabel={copy.menu.restore} danger={ask.cross}
          onClose={() => setAsk(null)}
          onConfirm={() => {
            dispatch({ type: 'restore', state: ask.restore }); track('backup_restore')
            setMenu(false); nav('/app/today'); toast.push({ text: copy.menu.restoreDone, tone: 'ok' })
          }} />
      )}
    </div>
  )
}
