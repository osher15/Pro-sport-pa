# PHASE 10 REPORT — Class Test-Coverage Grid ("מה חסר לכיתה")

**המגרש PRO** · ענף `claude/phase-8-identity-closure-zdfogy`

## 1. Executive Summary

Added a read-only class-wide coverage screen inside the fitness-tests module: a table of every student in the selected class against every fitness test the class has actually attempted, marked ✓/✕. Zero new identity mechanism — the screen is a thin presentation layer over the existing `roster(c)`, `cidOf(c)`, registry display name, and `DATA.missingTests()`. One small pure aggregation helper, `DATA.classCoverage()`, was added to `hm-data.js` to avoid recomputing the per-student loop in the DOM layer, and it internally calls `missingTests()` rather than re-deciding student/class membership.

**Verdict: COMPLETE.**

## 2. Starting commit

`854db30` (Phase 9, verified PASS in Phase 9.5). `git status` clean before starting.

## 3. Feature implemented

- New tab **"📋 מה חסר לכיתה"** in the existing `#ft-tabs` bar, alongside "מבחנים" / "מדד הכושר" / "אות החינוך הגופני" — same navigation mechanism, no new UI pattern.
- Opens on the currently selected class (same `cls()`/`roster(c)`/`cidOf(c)` as every other tab).
- Table: one row per student, one column per test the class has actually recorded a result for (not all 30 catalog tests — keeps it compact and scannable on a phone via the existing `.tblwrap` horizontal-scroll pattern used by `renderIndex`).
- Cell: `✓` (green, `var(--acc)`) or `✕` (red, `var(--stop)`), plus a `title` tooltip — status is never color-only.
- Summary line: students · tests tracked · how many finished everything.
- Fully read-only: no click handlers on cells, no writes.

## 4. Files changed

| File | What |
|---|---|
| `hm-data.js` | `classCoverage(rows,roster,testDefs,opts)` — pure, no DOM. Exported. |
| `hm-tests.js` | `renderCoverage()`; tab button wiring in `renderTab()`. |
| `index.html` | One tab button + one container div. |
| `tests/unit/coverage10.test.js` | 11 new unit tests. |
| `tests/e2e/coverage10.e2e.js` | 9 new browser tests. |
| `tests/e2e/run.js` | Registered the new suite. |
| `Hamegrash.html`, `index.html` (stamps), `sw.js` | Build output. |

Not touched: `hm-app.js`, `hm-tools.js`, `hm-new.js`, `hm-lesson.js`, `hm-build.js`, `hm-i18n.js`, backup/encryption, `stu.list`, `ft.roster`, `tools.att`, schema, `cid`/registry/`renameClass` internals, Phase 9 backlog items.

## 5. Data / identity invariants preserved

- `classCoverage()` never computes identity itself: class scoping reuses `rowInClass`/`clsKey` (the exact two conditions `missingTests` already uses), and per-student done/missing status is `missingTests()`'s own answer, called once per student — not reimplemented.
- Class resolved by `cid` (`cidOf(c)` → `resolveClassId` → registry), display name via `disp(c)` (registry name, Phase 9).
- No new storage keys, no schema field, no roster/attendance shape change.
- Confirmed by test: after `renameClass`, same `cid`, same `ft.classes` key count, same `ft.roster` key, same coverage matrix — only the displayed name changes.

## 6. Tests before/after

| | Unit | Browser | Total |
|---|---|---|---|
| Before | 314 | 124 | 438 |
| After | **325** | **133** | **458** |
| Failures / skipped | 0 / 0 | 0 / 0 | 0 / 0 |

No existing assertion was modified.

## 7. Browser scenarios covered

1. Tab is present and reachable from the picker; opening it hides the picker/run screens.
2. Correct students, correct tests (only attempted ones, in catalog order), correct ✓/✕ per cell.
3. Summary counts are correct.
4. Clicking a cell changes nothing (read-only).
5. Empty roster → clean message, no crash.
6. No measurements yet for the class → clean message, no table rendered.
7. All students complete everything → positive banner, all cells ✓.
8. All students missing everything → all ✕, no crash.
9. **Rename regression**: same `cid`, same `ft.classes`/`ft.roster` keys, displayed name updates, coverage matrix identical before/after.

## 8. Build verification

`node build-standalone.js` → 934KB. Rebuilt again → identical hashes (idempotent). `git status` after the second build shows no additional diff beyond the intended files.

## 9. UX notes

Matches the existing `renderIndex` (מדד הכושר) visual language exactly: same card/table/`.tblwrap`/`.ft-idxsum` classes, same empty-state pattern, same font/spacing. No new design system, no charts, no color-only signaling, no pagination (roster sizes of 30–40 render fine in a native scrollable table, consistent with how the existing score-index table already handles the same class sizes).

## 10. Remaining gaps

None material to this feature. Out of scope by design: editing from the grid, filters/sorting, export, and the pre-existing Phase 9 backlog (lesson-plan caption, CSV free-text class names, settings i18n) — untouched.

## 11. Final verdict

**PHASE 10 — COMPLETE**
