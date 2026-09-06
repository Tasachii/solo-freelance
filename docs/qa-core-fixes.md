# QA core fixes — 2026-09-06

Scope: domain, local persistence, migrations, billing, receipts, messages, and core regression tests. This file records only locally verified behavior; it does not claim live LINE, bank, or deployed Supabase validation.

| Finding | Status | Core change and evidence |
| --- | --- | --- |
| SF-01 | fixed locally | Schema 5 adds monotonic `revision`; StoreProvider holds one lifetime exclusive Web Lock, refuses stale raw storage, syncs followers, supports takeover/retry, and fails closed without Web Locks. An explicit demo scenario is applied only on the first acquired lock when storage still matches the hydrate snapshot; a waiting follower never overwrites newer writer data. `persistence.test.tsx` covers scenario switching, follower refusal, takeover, stale conflict/retry, and unsupported browsers. |
| SF-02 | fixed | Any subject with completions or invoices archives instead of deleting. Inactive subjects with unbilled completions remain closable. `delete.test.ts` and `qa-core-regressions.test.ts`. |
| SF-03 | fixed at reducer boundary | Unknown chat/message clients and mismatched subject recipients are rejected; blank chats/messages are rejected. Reload validation remains strict. `qa-core-regressions.test.ts`. UI not-found handling is owned by the UI lane. |
| SF-04 | fixed | Draft monthly invoices reconcile from the ledger after mutations. In real mode, complete/uncomplete/cancel/restore/reschedule/add in a sent, paid, or overdue period is refused centrally. `qa-core-regressions.test.ts`. |
| SF-05 | core complete | `closablePeriods` exposes every period containing unbilled work, including inactive subjects. `qa-core-regressions.test.ts`. Period picker rendering is owned by the UI lane. |
| SF-06 | fixed | Every receipt now requires an immutable snapshot of provider, destination, payer, subject, period, lines, total, paid amount, and verification evidence. Installment verification is true only when every payment was verified; slip amounts are aggregated only when every installment has that evidence. Receipt documents read only the snapshot. Schema 3/4 migration eagerly backfills and labels legacy snapshots; schema 5 never reconstructs a missing snapshot from mutable current data. `qa-core-regressions.test.ts`, `documents.test.ts`, `backup.test.ts`. |
| SF-07 | fixed | Package carry is stored as `carriedCredits`, separate from the newly purchased quantity and price. Renewal may atomically accept new `total`/`price` terms, computes carry from the old package first, and invoices only the new purchase. Package terms cannot be rewritten through ordinary subject edits. Status exposes `purchasedUnits`, `carriedCredits`, and `entitlementTotal`; `total` remains a compatibility alias for entitlement. `qa-core-regressions.test.ts`. |
| SF-08 | fixed | Package renewal defaults `slipVerified` to false; callers must explicitly provide verified evidence. Receipt snapshot preserves the chosen value. `qa-core-regressions.test.ts`. |
| SF-09 | fixed | New package creation requires and distinguishes `opening_balance` from `paid_purchase`. Paid purchase atomically creates invoice, payment, and receipt; opening balance creates entitlement without a false payment record. Onboarding uses the same atomic action. `qa-core-regressions.test.ts` plus reducer coverage. |
| SF-10 | fixed | Reschedule/cancel and their notice draft now occur in one reducer transition and one durable write. `finishOnboarding` commits provider, payer reuse, subjects, purchase intent, and completion status together. `qa-core-regressions.test.ts`. |
| SF-11 | core boundary retained | Waitlist accepts only a real `YYYY-MM-DD` date and rejects malformed payloads without state change. UI now supplies the same contract in its lane. |
| SF-13 | fixed | Dashboard outstanding, received, and recovered amounts are period filtered; expected per-unit revenue uses completion price snapshots. `selectors.test.ts`. |
| SF-15 | fixed at domain boundary | `reactivateSubject` restores an archived subject without replacing client, history, or package entitlement. `qa-core-regressions.test.ts`. |
| SF-16 | fixed at domain boundary | `finishOnboarding.rows[].clientId` reuses an existing payer without mutating the previous state on failed persistence. Existing `upsertSubject.subject.clientId` remains supported before invoicing; payer changes are refused once invoice history exists so invoice ownership remains valid. UI selection is owned by the UI lane. |
| SF-17 | fixed | `upsertSubject.lineId` distinguishes omitted from explicit `null`; null clears the saved LINE ID. `qa-core-regressions.test.ts`. |
| SF-18 | fixed at core/delivery boundaries | Blank chat, message creation, message edit, and send are rejected. Unknown recipients are rejected before state changes. `qa-core-regressions.test.ts` and existing message tests. |
| SF-30 | fixed at selector boundary | `invoiceToActOn` is scoped to the requested period, so an overdue invoice from another month cannot replace the bill for the selected month. `selectors.test.ts`. |
| SF-48 | fixed | Dashboard expected revenue sums `completion.unitPrice` snapshots, matching invoice construction after a rate change. `selectors.test.ts` and billing tests. |

Schema migration is sequential 3 → 4 → 5 and shared by local storage and backup restore. Unknown future schemas, corrupt snapshots, incomplete collections, and invalid relationships fail closed. Existing v3/v4 identities that had already been overwritten cannot be reconstructed; their current values are preserved with `legacyBackfill: true` rather than presented as original historical evidence.

Canonical schema 5 also rejects missing revision/snapshots and whitespace-only client names, messages, dedupe keys, chats, waitlist identity/contact, and event names. Those defects are never silently repaired from mutable state.

One limitation remains intrinsic to local storage: an already open older application build that ignores Web Locks can still write once. The current build detects the changed raw revision, refuses its own next commit, and requires rehydrate/retry. Tabs running the current build cannot overwrite one another.

Fresh verification:

- `npm test -- --run` → 34 files, 288 tests passed.
- `npm run build` → TypeScript and Vite production build passed.
- `git diff --check` → passed.
- Follow-up targeted regression run → 6 files, 102 tests passed; `npm run typecheck` and scoped `git diff --check` passed.
