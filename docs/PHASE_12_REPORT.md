# PHASE 12 REPORT — Attendance-Assisted Grading

**המגרש PRO** · ענף `claude/phase-8-identity-closure-zdfogy`

## Baseline commit

`8b3be44` (Phase 11, COMPLETE). `git status` clean, 342 unit / 150 browser / 492 total before any change.

## Problem solved

The grading table's participation category ("הגעה והשתתפות") is weighted **70% of the final grade by default** and was filled entirely by hand — a teacher re-typing a percentage, per student, per grading period, that the attendance tab had already recorded day by day. This phase removes that repetitive step without making a grading decision for the teacher.

## Implementation summary

**Data layer — `DATA.attendanceRateOf(att,stud,store,opts)`** (`hm-data.js`), placed directly after `classProgress()`:
- Reuses the exact formula already shipped in `attSummary()` (`hm-tools.js`): `Math.round((p + h*0.5) / days * 100)`. No second formula was written.
- The one deliberate, required difference: a student with **zero** attendance records returns `null`, not `0`. `attSummary()` returns `0` for that case because it is filling a CSV export column that must always show something; here, writing `0` into a grade would falsely claim "recorded, present 0% of the time" for a student who was simply never marked. This distinction is exactly what the spec's item 3 requires ("If a student has no attendance data, do not invent a percentage").
- Class scoping reuses the existing `resolveClassId(store,label)` on every `tools.att` key's label part, matched against `opts.cid` — the same pattern `rowInClass` already uses for measurements. `tools.att`'s `"date|label"` key format is untouched; the function only reads it.
- Pure, deterministic, no DOM, no new storage key, no schema field.

**UI — `hm-new.js` / `index.html`:** one button, "⬇ מלא לפי נוכחות", added next to the existing "⬇ CSV" button in the grades card. `fillFromAttendance()`:
1. Takes the currently filtered student list (same `cidOf(s)===grClsF` filter the grades screen already uses).
2. For each student, skips silently if `g.part` is already set (any value, including `0`) — never overwritten.
3. Otherwise computes `attendanceRateOf(tools.att, student, store, {cid})`; if `null` (no data), leaves the field empty.
4. Writes the resulting percentage into `g.part`, saves, re-renders, and reports a count via the existing toast mechanism. If nothing was filled, the toast says so explicitly rather than silently doing nothing.

The button is hidden when the participation category's weight is 0, mirroring the existing `show("part")` convention that already hides the column itself in that case.

## Attendance formula/source reused

`Math.round((p + h*0.5) / days * 100)` — copied from `attSummary()` in `hm-tools.js`, not reinvented. `e` (exempt) and `a` (absent) both count toward `days` with zero weight, exactly as in the original.

## Overwrite protection behavior

Verified by both unit and browser tests: a field with any existing value (including a value the teacher typed seconds before clicking the button) is left untouched on every run, including repeated clicks. A field with no attendance data is left empty rather than filled with a fabricated `0`.

## Files changed

| File | What |
|---|---|
| `hm-data.js` | `attendanceRateOf()` — pure, exported. |
| `hm-new.js` | `fillFromAttendance()`; button wiring; button visibility tied to `show("part")`. |
| `index.html` | One button. |
| `tests/unit/attendgrade12.test.js` | 11 new unit tests. |
| `tests/e2e/attendgrade12.e2e.js` | 7 new browser tests. |
| `tests/e2e/run.js` | Registered the suite. |
| `Hamegrash.html`, `index.html` (stamps), `sw.js` | Build output. |

Not touched: `hm-tools.js` (attendance module and `tools.att` format untouched), `cidOfStudent`, `resolveClassId`, `rowInClass`, `renameClass`, `classCoverage`, `classProgress`, the migration chain, `stu.list` shape (beyond the pre-existing, already-writable `grades[period].part` field), grading period storage shape. No date-range concept was added, per explicit instruction.

## Test totals

| | Unit | Browser | Total |
|---|---|---|---|
| Before | 342 | 150 | 492 |
| After | **353** | **157** | **510** |
| Failures / skipped | 0 / 0 | 0 / 0 | 0 / 0 |

No existing assertion was modified.

## Build / idempotence result

`node build-standalone.js` → 948KB. Rebuilt again → identical hashes. `git status` after the second build shows only the files listed above.

## Identity / rename regression result

Both a unit test and a browser test rename the class through the existing `renameClass()`/Settings UI mid-scenario and confirm: same `cid`, `ft.classes` still holds exactly one entry, `tools.att` is untouched (still 2 recorded days), and the fill button produces the **identical** suggested percentages before and after the rename — only the displayed class name changed. **PASS.**

## Explicit deferred items (out of scope, per spec)

Date-range grading periods, automatic/silent grade writing, participation prediction, attendance pattern analysis, LessonSession integration, CSV changes, any identity/registry/migration work, charts, dashboards. No blocker was discovered that required touching protected identity code or the `tools.att` storage format.

## Final verdict

**COMPLETE**
