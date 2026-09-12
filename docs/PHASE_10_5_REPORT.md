# PHASE 10.5 REPORT — Focused Product Polish

**המגרש PRO** · ענף `claude/phase-8-identity-closure-zdfogy`

## Starting commit

`c28fa9f` (Phase 10, COMPLETE). `git status` clean, 325 unit / 133 browser / 458 total passing before any change.

## 1. Lock-screen title RTL/direction issue — FIXED

**Root cause found, not guessed:** the topbar brand mark already uses a proven-correct pattern —
`<div class="ttl" dir="auto"><span data-i18n="brand.word">המגרש</span> <b>PRO</b></div>` plus `unicode-bidi:isolate` in CSS (added earlier after a documented bug where a leading "ℹ" glyph made `dir="auto"` misdetect direction). The lock screen instead used a single fused string, `<h1 dir="auto" data-i18n="brand.full">המגרש PRO</h1>`, with no `unicode-bidi` isolation at all — a mixed Hebrew+Latin string left to a single `dir="auto"` guess, which is exactly the class of bug the topbar fix was written to prevent.

**Fix:** brought the lock-screen `<h1>` in line with the already-working topbar pattern instead of inventing a new one:
- Markup: `<h1 dir="auto"><span data-i18n="brand.word">המגרש</span> <b style="color:var(--acc)">PRO</b></h1>`.
- CSS: added `unicode-bidi:isolate;white-space:nowrap` to the existing `#lockOv h1` rule.

"PRO" is now a permanent, never-translated literal element (matching the topbar), and the Hebrew word is the only translated part — this is also what already made the topbar correctly show "Hamigresh PRO" in English/Arabic/Russian.

Not touched: the About-modal's `<b data-i18n="brand.full">` (a separate, not-reported location using the older fused pattern) — left alone per scope; noted as a non-blocking remaining item below.

## 2. Backup encryption clarity

Reviewed the full export/import/password flow. Most of it was **already clear** and was left unchanged:
- The checkbox hint already stated "no password recovery — lose it, lose the file" in Hebrew.
- The password modal already showed a different title/hint for "create" vs "open," already forced a confirmation field and an 8-character minimum, and already gave a clean, counted wrong-password message ("Wrong password — N attempts left" / "Wrong password. The file was not opened.").
- Post-export toasts already stated explicitly whether the file was encrypted.

Two concrete, real gaps were found and fixed:
1. **Decision after the action, not before it.** The export/import buttons appeared *above* the encryption checkbox, so a teacher scanning top-to-bottom could click "back up" before ever seeing the encryption choice. **Fix:** moved the checkbox + hint above the button row, and added one clarifying sentence for the unchecked case ("without this checkbox — a plain, unencrypted file..."). No logic changed.
2. **The password modal was Hebrew-only regardless of app language.** Its title, hint, both field labels (`bk.pass`, `bk.passAgain`), and its two validation/error messages were either raw hardcoded Hebrew strings in `hm-app.js` or markup with no i18n key at all — while the surrounding backup card (title, body, buttons) was already fully translated. **Fix:** routed all of it through the existing `t(key,def)` helper / `data-i18n`, and added the missing `bk.*` keys to en/ar/ru. No encryption logic, backup format, or security property changed.

## 3. Getting-started tip

The app already has a home-screen "Field tip" widget (`#fieldTip`, populated from a `TIPS` pool) — an existing help pattern, reused as instructed rather than building anything new. All six existing tips were mid-experience usage tricks; none addressed a brand-new teacher's first action.

**Fix:** on a device with no data at all (no students, roster, results, or records — the same signal already used elsewhere in the app to detect "not yet set up"), the widget shows one fixed onboarding line pointing at Demo mode instead of a random tip. The moment any real data exists, it reverts to the normal random pool. No new screen, no new storage key, no dismiss button needed — it simply stops applying once it's no longer true.

## 4. Language-switch consistency

Checked newly-added Phase 9/10 UI plus the areas touched by items 1–3 above.

- **Phase 10 coverage grid and Phase 9 rename button inside the fitness-tests module:** confirmed this whole module (`hm-tests.js`, `hm-tools.js`, `hm-new.js`) has **zero** i18n integration anywhere, including tab labels that predate both phases ("🏅 מבחנים", "📊 מדד הכושר"). The new additions are consistent with the module's existing, deliberate all-Hebrew convention — not a new inconsistency. Left untouched, matching "do not perform a full i18n migration."
- **Settings modal "🏷 שמות הכיתות" (rename) card, added in Phase 9:** this card sits inside the Settings screen, which the project's own stated policy calls part of the fully-translated "shell." Its static labels (title, hint, "כיתה"/"שם נוכחי"/"שם חדש", the save button, the placeholder) had no `data-i18n` at all — a real inconsistency next to sibling fields in the same modal that are translated. **Fixed:** added `data-i18n`/`data-i18n-placeholder` and the matching `set.cls*` translations for en/ar/ru. The dynamically-built `<option>` list and the confirm()/toast text inside `renameClassFromUi()` were left as-is, consistent with how every other toast and confirm() in the app already behaves (toasts are the one established, accepted exception to "shell is translated").
- **Bonus find:** `set.saved` ("Settings saved") already existed as a translated key in all three locales but was never used — the settings-save toast called a raw Hebrew string instead. Wired it up; zero new copy needed since the translation was already correct.
- **Lock-screen title:** covered under item 1.

## Files changed

| File | What |
|---|---|
| `index.html` | Lock-screen `<h1>` restructured; backup card reordered + one clarifying sentence; rename card gets `data-i18n`. |
| `hm-styles.css` | `unicode-bidi:isolate;white-space:nowrap` added to `#lockOv h1`. |
| `hm-app.js` | Password-modal title/hint/warnings/wrong-password toast routed through `t()`; `set.saved` toast now translated; `homeInit()` shows a one-time onboarding tip on an empty device. |
| `hm-i18n.js` | Added `bk.encrypt`, `bk.encryptHint`, `bk.pass`, `bk.passAgain`, `bk.passTitleNew/Open`, `bk.passHintNew/Open`, `bk.passShort`, `bk.passMismatch`, `bk.passWrongLeft/Final`, `set.clsTitle/Hint/Pick/CurLbl/NewLbl/NewPh/SaveBtn` for en/ar/ru. |
| `tests/e2e/polish10_5.e2e.js` | New, 9 tests. |
| `tests/e2e/run.js` | Registered the suite. |
| `Hamegrash.html`, `index.html` (stamps), `sw.js` | Build output. |

Not touched: `hm-data.js`, `hm-tests.js`, `hm-tools.js`, `hm-new.js`, `hm-lesson.js`, `hm-build.js`, cid/registry/rename logic, the coverage grid, backup format, encryption implementation.

## Tests before/after

| | Unit | Browser | Total |
|---|---|---|---|
| Before | 325 | 133 | 458 |
| After | 325 | **142** | **467** |
| Failures / skipped | 0 / 0 | 0 / 0 | 0 / 0 |

No existing assertion was modified. No unit tests were needed — this phase is UI/markup/i18n only, with no new pure logic.

## Build verification

`node build-standalone.js` → 940KB. Rebuilt again → identical hashes (idempotent). `git status` shows only the files listed above.

## Remaining issues (non-blocking)

- The About-modal brand mark still uses the older fused `brand.full` string (same class of bug in theory, never reported as broken, out of this phase's named scope).
- `hm-lesson.js` "התחל שיעור" caption and the CSV importer's free-text class names remain from the Phase 9 backlog, explicitly out of scope here.
- Toasts and `confirm()` dialogs across the whole app remain Hebrew-only by long-standing, consistent convention — not touched, per "no full i18n migration."

## Final verdict

**COMPLETE**
