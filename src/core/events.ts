import type { AppState, EventLog } from './types'

export const MAX_EVENTS = 500

export function appendEvent(events: EventLog[], name: string, props?: Record<string, unknown>): EventLog[] {
  const entry: EventLog = { at: new Date().toISOString(), name, ...(props ? { props } : {}) }
  return [entry, ...events].slice(0, MAX_EVENTS)
}

export function eventsJson(state: AppState): string {
  return JSON.stringify(
    { app: 'solo', scenario: state.scenarioId, exportedAt: new Date().toISOString(), events: state.events },
    null, 2,
  )
}
