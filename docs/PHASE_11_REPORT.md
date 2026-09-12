# PHASE 11 REPORT — Class Progress & Insights

**המגרש PRO** · ענף `claude/phase-8-identity-closure-zdfogy`

## Baseline commit

`ab47f93` (Phase 10.5, COMPLETE). `git status` clean, 325 unit / 142 browser / 467 total before any change.

## Implementation summary

Added one class-level, read-only "Progress Insights" view answering, per fitness test the class has actually attempted: how many students improved, declined, or show no measurable change yet.

**Data layer — `DATA.classProgress(rows,roster,testDefs,opts)`** (`hm-data.js`), placed directly after `classCoverage()` and built on top of it rather than reimplementing scoping:
- Calls `classCoverage(rows,roster,testDefs,opts)` unchanged to get the exact same "attempted tests" list and per-student "done" map already used by the Phase 10 grid — so the two class-level screens never disagree about what "measured" means.
- For each attempted test, for each student who completed it, calls the existing `progress(rows,stud,testId,dir,scope)` unchanged and buckets on **`firstToLast`** (best result on the last day measured vs. best result on the first day measured — the same comparison the student history window already shows).
- **A real finding during implementation:** the recon's proposed basis, `sinceFirst` (personal best vs. first day), turned out to be structurally incapable of ever reporting "declined" — a personal best can never be worse than the first measurement by definition, so `sinceFirst.declined` is always `false`. Verified this empirically before writing any test, then switched to `firstToLast`, which correctly reports all three outcomes symmetrically. This is still 100% "existing `progress()` semantics, not a new interpretation" — just the correct existing field for a metric that needs to show decline.
- `noChange` is one honest bucket for two states that have no different real answer: a tied result, or a student with only one measurement day (so `progress()` returns a `reason` and no comparison exists). `completed = improved + declined + noChange` always, exactly matching `classCoverage`'s own completion count for that test — no double-counting, no silent drops.
- Pure, deterministic, no DOM, no new storage, no schema change.

**UI — `hm-tests.js` / `index.html`:** one new tab, "📈 תובנות התקדמות", added to the existing `#ft-tabs` bar alongside `tests`/`idx`/`ot`/`cov`, wired through the existing `renderTab()` switch exactly like Phase 10's tab. `renderInsights()` mirrors `renderCoverage()`'s structure: a `.card` header with the registry-resolved class name (`disp(c)`) and a summary row, a second `.card` with a `.tblwrap`/`.tbl` table (one row per test: Test · Completed · Improved · Declined · No measurable change), and the same empty-state pattern.

## Files changed

| File | What |
|---|---|
| `hm-data.js` | `classProgress()` — pure, exported. |
| `hm-tests.js` | `renderInsights()`; one `renderTab()` branch. |
| `index.html` | One tab button, one container div. |
| `tests/unit/progress11.test.js` | 17 new unit tests. |
| `tests/e2e/progress11.e2e.js` | 8 new browser tests. |
| `tests/e2e/run.js` | Registered the suite. |
| `Hamegrash.html`, `index.html` (stamps), `sw.js` | Build output. |

Not touched: `rowInClass`, `cidOfStudent`, `resolveClassId`, `renameClass`, `classCoverage` (called, not modified), `ft.roster`/`tools.att`/`stu.list` shapes, schema, any file outside the list above.

## Tests before/after

| | Unit | Browser | Total |
|---|---|---|---|
| Before | 325 | 142 | 467 |
| After | **342** | **150** | **492** |
| Failures / skipped | 0 / 0 | 0 / 0 | 0 / 0 |

No existing assertion was modified.

## Build verification

`node build-standalone.js` → 945KB. Rebuilt again → identical hashes (idempotent). `git status` after the second build shows only the files listed above.

## Rename / cid regression result

Both a unit test (`progress11.test.js` #7) and a browser test (`progress11.e2e.js` #8) rename the class through the existing `renameClass()`/Settings UI and confirm: same `cid`, `ft.classes` still holds exactly one entry for it, every measurement's `cid` unchanged, and the insights table produces **byte-identical** output before and after — only the displayed class name changes. **PASS.**

## Explicit deferred items (out of scope, per spec)

Median, strongest/weakest test ranking, cross-test normalized scoring, charts/sparklines, attendance/grading integration, CSV changes, lesson-plan changes, i18n changes, any identity/registry/migration work. No blocker was discovered that required touching protected identity code — none of it was reopened.

## Final verdict

**COMPLETE**
