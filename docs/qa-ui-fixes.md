# QA UI fixes

This document maps the browser-facing remediation for audit items SF-01–SF-33 and SF-47. Domain guarantees remain in the core tests; this file records what the UI does with those guarantees.

| IDs | UI remediation | Evidence |
| --- | --- | --- |
| SF-01 | `StorageStatus` exposes acquiring, read-only, conflict, and error states; unsafe tabs cannot appear writable and offer an explicit retry/export path. | multi-tab E2E (root), store persistence tests |
| SF-02, SF-05 | Billing has a period selector built from invoice and completed-work history. Inactive people with unbilled work remain closable. | `qa-ui.test.tsx`: historical periods; core billing regressions |
| SF-03, SF-26 | Unknown chat IDs show a non-mutating not-found state. Real workspaces label manually entered customer questions and only create reply drafts; simulator shortcuts remain demo-only. | core unknown-client rejection; UI source/DOM review |
| SF-04 | Failed complete, undo, move, cancel, restore, and close-period actions show an error instead of reporting success. | core finalized-period regressions; component behavior |
| SF-06, SF-31 | Receipt rendering is owned by the root integration lane and reads immutable receipt snapshots, including explicit demo/legacy treatment. | receipt/document unit tests and receipt E2E |
| SF-07–SF-09 | Package creation requires an explicit opening-balance or paid-purchase choice; renewals default to manual/unverified confirmation; remaining old credits and current purchased units are shown separately. | core ledger/receipt tests; `ui-validation.test.ts` |
| SF-10 | Reschedule/cancel dispatch one atomic action; the UI no longer drafts a notice separately. | core schedule tests |
| SF-11, SF-24, SF-47 | Waitlist dates are local ISO date-only values. Errors use `aria-invalid`/`aria-describedby`. Local saves never claim team receipt; remote receipt is shown only for an inspectable successful response. | `qa-ui.test.tsx`: date/delivery result |
| SF-12 | Landing/pricing copy labels paid plans as concepts/demo, removes automatic bank/LINE claims, and states when interest is stored locally. | copy unit/E2E checks |
| SF-13 | Period selection keeps dashboard/share/export scoped to the same selected period; selector computations are period-correct in core. | selector tests; billing UI |
| SF-14 | Package warnings prevent Billing from returning the monthly empty state early. | Billing conditional/source review |
| SF-15 | Inactive subjects expose a `reactivateSubject` action. | core reducer tests; detail UI |
| SF-16, SF-17 | Subject form can reuse an existing payer and sends `lineId: null` when LINE is cleared. | `qa-ui.test.tsx`: payer reuse/clear |
| SF-18 | Message editing and question drafting disable blank submission, expose an accessible validation error, and core rejects whitespace-only content. | delivery/message unit tests; Admin component |
| SF-19, SF-20 | LINE launch uses launch-request semantics owned by root. Every clipboard path awaits its boolean result and reports failure truthfully. | share launch tests; Admin/SubjectDetail source |
| SF-21 | Recovery and backup errors remain visible with specific unreadable/wrong-file/wrong-version/save messages. | backup unit tests; StorageStatus UI |
| SF-22 | Add-appointment requires subject, date, and time and reports rejected saves. | Today component behavior; core validation tests |
| SF-23 | Admin tabs, billing modes, package intent, client history, and choice chips expose `aria-pressed`; form errors are programmatically related. | accessibility tests; component DOM |
| SF-25 | Primary buttons use the contrast-safe solid accent token in light themes rather than the pale gradient endpoint. | style checks/manual contrast review |
| SF-27 | Reduced-motion preference collapses animations/transitions and removes decorative card transforms. | CSS media-query check |
| SF-28, SF-29 | Roster onboarding can return to provider details and requires a second explicit confirmation before discarding invalid rows. ImportSheet uses the same confirmation rule. | `qa-ui.test.tsx`: invalid rows; onboarding/import UI |
| SF-30 | Client view separates outstanding bills from full paid history and labels the all-paid state as history. | ClientPreview UI |
| SF-32 | Desktop frame behavior is owned by root integration (`present.ts`/shell defaults). | responsive E2E |
| SF-33 | Add/move screens warn about exact time collisions while still allowing intentional group work. | `qa-ui.test.tsx`: overlap behavior |

Targeted UI regression command:

```sh
npm test -- --run tests/unit/qa-ui.test.tsx tests/unit/ui-accessibility.test.tsx tests/unit/ui-validation.test.ts tests/unit/subject-sheet-guard.test.tsx
```
