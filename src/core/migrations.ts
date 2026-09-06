import type { AppState } from './types'
import { validateState } from './validation'
import { snapshotLegacyPrices } from './ledger'
import { snapshotLegacyReceipts } from './receipts'

/** Shared storage/backup migration. Future schemas fail closed. */
export function migrateCanonical(raw: unknown): AppState | null {
  try {
    if (!raw || typeof raw !== 'object') return null
    const source = raw as Record<string, unknown>
    const sourceVersion = Number(source.schemaVersion)
    if (![3, 4, 5].includes(sourceVersion)) return null

    // Current-schema data is never "repaired" from mutable profile/invoice state.
    // Missing revision/snapshots indicate corruption or an incomplete writer and must fail closed.
    if (sourceVersion === 5) return validateState(source).ok ? source as unknown as AppState : null

    let candidate: unknown = source
    if (source.schemaVersion === 3) {
      candidate = { ...source, schemaVersion: 4, mode: source.mode ?? 'demo' }
    }
    const v4 = candidate as Record<string, unknown>
    if (v4.schemaVersion === 4) {
      candidate = { ...v4, schemaVersion: 5, revision: 0 }
    }
    const v5 = candidate as AppState
    if (v5.schemaVersion !== 5) return null
    if (v5.revision === undefined) candidate = { ...v5, revision: 0 }

    const prices = snapshotLegacyPrices(candidate as AppState)
    const receipts = snapshotLegacyReceipts(prices)
    if (!receipts || !validateState(receipts).ok) return null
    return receipts
  } catch {
    return null
  }
}
