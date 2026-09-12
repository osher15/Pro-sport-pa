# PHASE 13 REPORT — Pilot Readiness Polish

**המגרש PRO** · ענף `claude/phase-8-identity-closure-zdfogy`

## Baseline commit

`70eea6a` (Phase 12, COMPLETE). 353 unit / 157 browser / 510 total before any change, working tree clean, standalone build byte-identical across two consecutive builds. Phase 13 pre-audit verdict: **READY WITH MINOR POLISH**.

## 1. Changes Made

Exactly the two P1 items identified by the Phase 13 pre-audit — nothing else.

**A. Lesson-screen class picker.** `wireStartFromPlan()` in `hm-lesson.js` derived its class context solely from `ft.last`, which only the Fitness Tests / Beep Test / Photo-Finish pickers ever wrote. A teacher opening "שיעור" first (generating a plan via the wizard) saw a permanently disabled "▶ בחר כיתה קודם" with no control on that screen to resolve it. Fix: a new "🏷 בחר כיתה" button appears next to "▶ התחל שיעור" exactly when the class context is missing, and opens the existing shared class picker, `window.FT.pick(...)` — the same modal Beep Test and Photo-Finish already reuse. `FT.pick`'s own `cp-load` handler already writes `ft.last`; the button's `onPick` callback simply re-runs `wireStartFromPlan()` to repaint the now-valid state. No second picker, no new class-selection state, no new storage key.

**B. Attendance-fill visible hint.** `#gr-fillAtt`'s only explanation of its non-destructive behavior was a `title=` hover tooltip, invisible on touch devices. Fix: a small always-visible `<div class="hint">` line (`#gr-fillAttHint`), using the app's existing `.hint` styling convention, placed directly under the button row, stating plainly that it only fills empty participation fields and never overwrites or fabricates a value. The `title` attribute was left in place for desktop hover; nothing about `fillFromAttendance()` itself changed.

## 2. Files Changed

| File | What | Why |
|---|---|---|
| `hm-lesson.js` | `wireStartFromPlan()` extended to show/wire a new `#ls-pickCls` button when class context is missing. | The actual fix for item A. |
| `index.html` | One new button `#ls-pickCls` in `#ls-planCard`'s header row; one new `<div class="hint" id="gr-fillAttHint">` under the grades button row. | Markup for both fixes. |
| `hm-new.js` | `renderGrades()`: `#gr-fillAttHint`'s visibility now toggles together with `#gr-fillAtt`'s existing `(weights.part||0)>0` condition. | So the hint never sits visible with no button, or vice versa. |
| `tests/e2e/pilotpolish13.e2e.js` | 6 new browser tests. | Covers both fixes; the attendance logic itself is unchanged and already fully covered by `attendgrade12.e2e.js`. |
| `tests/e2e/run.js` | Registered the new suite. | |
| `Hamegrash.html`, `sw.js` | Build output (content-hashed cache version bump only). | Standard rebuild. |

Not touched: `hm-data.js`, `hm-tools.js`, `LessonSession` data model, `attendanceRateOf()`, `fillFromAttendance()`, `tools.att`, `stu.list`, `ft.roster`, the migration chain, schema version, `FT.pick()` itself (only called, never modified).

## 3. Tests

| | Unit | Browser | Total |
|---|---|---|---|
| Before | 353 | 157 | 510 |
| After | **353** | **163** | **516** |
| Failures / skipped | 0 / 0 | 0 / 0 | 0 / 0 |

Unit count is unchanged by design — no pure-logic function was added or modified. The 6 new browser tests cover: the disabled/blocked state and picker visibility on first entry to Lesson without visiting Fitness Tests first; picking a class from the new button correctly starting a session with the right `cid`/`clsSnapshot`; the pre-existing `ft.last`-based path continuing to work untouched; a rename-regression check that the session's `cid` survives a class rename made after picking through the new button; the attendance hint's visible text and its wording; and the hint hiding together with the button when the participation weight is zero.

## 4. Build Verification

- First build: `Hamegrash.html` — 950KB.
- Second build (immediately after): `Hamegrash.html` — 950KB.
- SHA-1 of both builds: `d5fe544a51aa9630ee6c6297bd146adf3e67d2f1`.
- **Byte-identical: YES.**

## 5. Identity / Storage Safety

- `cid` changed: **NO**
- Registry (`ft.classes`) changed: **NO**
- Schema version changed: **NO** (still 4)
- Migration chain changed: **NO**
- `tools.att` format changed: **NO**
- Any storage format changed: **NO**
- New storage key introduced: **NO**

The rename-regression test (`#161`) explicitly confirms: after picking a class through the new Lesson-screen button, renaming that class via the existing Settings UI leaves `session.active().cid` unchanged and the registry still holding exactly one entry under the same `cid`.

## 6. Scope Audit

Only the two named P1 items were implemented. No grades navigation shortcut, no rename shortcut, no fitness-test tab redesign, no onboarding/"What's New" work, no LessonSession redesign, no attendance/LessonSession integration, no date-range grading, no analytics, no charts, no CSV/backup/import changes, no schema or migration work, no `tools.att`/`stu.list`/`ft.roster` merging. `git diff --stat` shows changes confined to `hm-lesson.js`, `index.html`, `hm-new.js`, the new/updated test files, and build output — nothing else.

## 7. Git

- Commit: see push output below (created after this report).
- `git status --short` before commit: only the 6 files listed in section 2, plus this report — no unrelated or stray files.
- Working tree: clean after commit.

## 8. Pilot Readiness

**Yes.** Both P1 items from the Phase 13 pre-audit are now resolved, verified by build, full regression (353 unit + 163 browser, 0 failures), and an explicit identity/rename regression check. No blocker was found or introduced. Per the pre-audit's recommendation, the next step is to **freeze feature development and begin a real teacher pilot** — no further phase is queued.
