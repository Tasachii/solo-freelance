import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useStore } from '../core/store'
import { urlParam } from '../core/urlParams'
import { professionById } from '../professions'
import { copy } from '../copy'
import { draftCount } from '../core/selectors'
import { BottomSheet, DemoBadge } from './components'
import DevBar from './DevBar'
import WaitlistSheet from '../platform/WaitlistSheet'
import { SCENARIOS, SCENARIO_LABEL, type ScenarioId } from '../core/scenarios'
import { applyTheme, readTheme, type Theme } from '../core/theme'

export default function AppShell() {
  const { state, resetDemo, track } = useStore()
  const prof = professionById(state.professionId)
  const nav = useNavigate()
  const loc = useLocation()
  const [menu, setMenu] = useState(false)
  const [lead, setLead] = useState(false)
  const [dev, setDev] = useState(() => urlParam('dev') === '1')
  const [theme, setTheme] = useState<Theme>(readTheme)
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
        <b className="shell__brand">{prof.name}</b>
        <div className="shell__hdr">
          <DemoBadge />
          <button className="shell__menu" onClick={() => setMenu(true)} aria-label={copy.menu.title}>⋯</button>
        </div>
      </header>

      <main className="shell__main"><Outlet /></main>

      <button className="fab" onClick={() => { setLead(true); track('contact_fab') }}>{copy.waitlist.title}</button>

      <nav className="tabbar">
        {tabs.map((t) => (
          <NavLink key={t.to} to={t.to} className={({ isActive }) => `tab${isActive ? ' tab--on' : ''}`}>
            <span>{t.label}</span>
            {t.badge ? <i className="tab__badge">{t.badge}</i> : null}
          </NavLink>
        ))}
      </nav>

      {dev && <DevBar onClose={() => setDev(false)} />}

      {menu && (
        <BottomSheet title={copy.menu.title} onClose={() => setMenu(false)}>
          <div className="rows">
            <button className="row" onClick={() => { resetDemo(); setMenu(false) }}>{copy.menu.reset}</button>
            <button className="row" onClick={() => { setDev(true); setMenu(false) }}>{copy.menu.dev}</button>
            {state.clients[0] && (
              <button className="row" onClick={() => { setMenu(false); nav(`/client/${state.clients[0].id}`) }}>
                {copy.menu.clientView}
              </button>
            )}
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
          <div className="fld">
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
          </div>
        </BottomSheet>
      )}

      {lead && <WaitlistSheet preselect={state.professionId} onClose={() => setLead(false)} />}
    </div>
  )
}
