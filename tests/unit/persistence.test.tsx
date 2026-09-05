import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render } from '@testing-library/react'
import { StoreProvider, STORAGE_KEY, useStore } from '../../src/core/store'
import { buildScenario } from '../../src/core/scenarios'

let store: ReturnType<typeof useStore>
function Probe() { store = useStore(); return null }
afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.clear() })
const mount = () => render(<StoreProvider><Probe /></StoreProvider>)
describe('durable local transitions', () => {
  it('persists a critical queue before dispatch returns', () => {
    mount()
    const id = store.state.messages[0].id
    act(() => { store.dispatch({ type: 'sendingStart', awaiting: id, queue: [] }) })
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).sending.awaiting).toBe(id)
  })
  it('does not commit a payment when storage throws', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(buildScenario('default')))
    mount()
    const before = store.state.payments.length
    const inv = store.state.invoices.find(i => i.status === 'overdue')!
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('full', 'QuotaExceededError') })
    let ok: unknown
    act(() => { ok = store.dispatch({ type: 'recordPayment', invoiceId: inv.id, amount: 100, slipVerified: false }) })
    expect(ok).toBe(false)
    expect(store.state.payments).toHaveLength(before)
    expect(store.persistenceError).toBeTruthy()
  })
  it('preserves broken raw JSON and blocks ordinary autosave', () => {
    localStorage.setItem(STORAGE_KEY, '{broken')
    mount()
    act(() => { store.dispatch({ type: 'track', name: 'app_open' }) })
    expect(localStorage.getItem(STORAGE_KEY)).toBe('{broken')
    expect(store.recoveryRaw).toBe('{broken')
  })
  it('keeps the previous workspace when restoring a backup', () => {
    mount()
    const before = localStorage.getItem(STORAGE_KEY)
    act(() => { store.dispatch({ type: 'restore', state: buildScenario('empty') }) })
    expect(localStorage.getItem(`${STORAGE_KEY}-before-restore`)).toBe(before)
    expect(store.state.subjects).toHaveLength(0)
  })
})
