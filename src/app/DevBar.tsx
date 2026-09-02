import { useState } from 'react'
import { useStore } from '../core/store'
import { addDays, dateThai } from '../core/format'
import { eventsJson } from '../core/events'
import { download } from '../core/export'
import { BottomSheet } from './components'
import { SCENARIOS, SCENARIO_LABEL } from '../core/scenarios'

export default function DevBar({ onClose }: { onClose: () => void }) {
  const { state, dispatch, resetDemo, track } = useStore()
  const [log, setLog] = useState(false)

  const shift = (n: number) => dispatch({ type: 'setToday', date: addDays(state.today, n) })

  return (
    <>
      <div className="devbar">
        <span className="devbar__now">{dateThai(state.today)}</span>
        <button onClick={() => shift(-1)}>−1</button>
        <button onClick={() => shift(1)}>+1</button>
        <button onClick={() => shift(7)}>+7</button>
        <select value={state.scenarioId} onChange={(e) => { resetDemo(e.target.value); track('scenario_switch', { scenario: e.target.value }) }}>
          {SCENARIOS.map((s) => <option key={s} value={s}>{SCENARIO_LABEL[s]}</option>)}
        </select>
        <button onClick={() => dispatch({ type: 'clearMessages' })}>ล้างข้อความ</button>
        <button onClick={() => setLog(true)}>event log</button>
        <button onClick={onClose} aria-label="ปิด DevBar">✕</button>
      </div>

      {log && (
        <BottomSheet title="Event log" sub={`${state.events.length} รายการ`} onClose={() => setLog(false)}
          footer={<button className="btn btn--primary btn--block"
            onClick={() => download(eventsJson(state), `solo-events-${state.today}.json`, 'application/json')}>
            ดาวน์โหลด JSON
          </button>}>
          <table className="tbl">
            <thead><tr><th>เวลา</th><th>event</th><th>props</th></tr></thead>
            <tbody>
              {state.events.slice(0, 60).map((e, i) => (
                <tr key={i}>
                  <td className="dim">{e.at.slice(11, 19)}</td>
                  <td>{e.name}</td>
                  <td className="dim">{e.props ? JSON.stringify(e.props) : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </BottomSheet>
      )}
    </>
  )
}
