# AI App Builder — Micro-SaaS Generator

A single-page React app that turns a plain-English idea into a **working** app: describe it,
watch the generation pipeline run, then interact with a live preview sitting next to its
syntax-highlighted source — and keep refining it in natural language.

```
ai-app-builder/
├── AIAppBuilder.jsx   ← the deliverable: one self-contained React component
├── main.jsx           ← mounts it with createRoot
├── styles.css         ← Tailwind entry + range-input theming
├── tailwind.config.js
├── build.js           ← bundles everything into one offline HTML file
└── index.html         ← built artifact (open it, no server needed)
```

## Run it

**Fastest:** open `index.html` — React, lucide-react and the compiled Tailwind stylesheet are
all inlined, so it works offline, from `file://`, with no CDN.

**Rebuild after editing the JSX:**

```bash
npm install
npm run build     # → regenerates index.html
```

**Drop it into an existing app instead:** copy `AIAppBuilder.jsx` into any React + Tailwind
project that has `lucide-react` installed and render `<AIAppBuilder />`. It has no other
dependencies, no props and no global state.

## The three states

| State | What happens |
| --- | --- |
| **A · Landing** | Hero, freeform textarea (⌘/Ctrl+Enter to submit), four preset quick-cards, four output-style chips, "Surprise me" |
| **B · Generating** | Four-step animated pipeline — architecture → components → state & mock data → preview canvas — with a live terminal log and progress bar |
| **C · Workspace** | Preview / Code / Split toggle, Copy · Download .JSX · Share, device-width switcher, code inspector with version history and a natural-language refinement bar |

## How it actually works

**Blueprint matching.** `resolveSpec()` runs the prompt through an ordered list of
`BLUEPRINTS` regexes (invoice → budget → kanban → roi → rate → tracker fallback) and derives a
product title from the prompt itself. Each blueprint matches English *and* Hebrew keywords.
Preset cards short-circuit the matcher.

**Hebrew and RTL.** `detectLang()` looks for a single character in the Hebrew Unicode block;
one is enough to set `spec.lang = "he"`. From there the preview root gets `dir="rtl"`,
`lang="he"` and a web-safe Hebrew font stack (David/Narkisim are Office fonts and unreliable in
browsers), every renderer resolves its labels through `L("עברית", "English")`, directional
chevrons flip, numbers and currency sit in `<bdi>` so bidi never scrambles them, and the
generated source carries the Hebrew strings and `dir="rtl"` too. Component and file names stay
Latin (`PersonalFinanceManager.jsx`). Refinements are bilingual — "שנה את צבע הדגש לירוק"
works exactly like "change the accent to green".

**Six interactive renderers.** Every archetype is a real, stateful component — not a
mockup:

- **Personal Finance Manager** — income vs. expenses, six spend categories, live balance, budget-usage bar and a six-month trend chart.
- **Freelance Rate Calculator** — seven inputs → hourly / day / project rate, a where-the-money-goes bar, and a rate-sensitivity chart.
- **Task Kanban Board** — HTML5 drag & drop between columns, keyboard-free move buttons, priority cycling, live WIP counts.
- **Invoice Generator** — editable line items, four currencies, tax + discount, paid toggle, and a real file export.
- **SaaS ROI Calculator** — MRR/ARR/LTV/CAC modelling with a 12-month projection chart and a unit-economics verdict.
- **Idea & Habit Tracker** — the fallback for freeform prompts: add/complete/filter with an animated SVG progress ring.

**Styling engine.** The four output styles (Modern Dark, Minimalist, Corporate, Cyberpunk)
are complete Tailwind class strings in `STYLES`, handed to renderers through a React context.
The accent colour rides on a `--a` CSS variable set on the preview root, so "make the accent
cyan" is a one-field state change that repaints the whole app — and the exported code gets the
resolved hex written in literally.

**Refinement engine.** `interpretRefinement()` parses the request into a spec patch: accent
colours (named or `#hex`), style switches, dark-mode toggle, density, analytics panels, header
visibility, renaming, even converting one archetype into another. Unrecognised requests are
recorded honestly rather than silently ignored. Every refinement pushes a restorable version
(`v1`, `v2`, …) and the code panel green-flags the lines that changed.

**Code generation.** `CODE_BUILDERS` emit genuinely runnable React for the current spec —
imports, state, derived `useMemo` values, the JSX, and any refinement-driven blocks. What you
copy or download is what the preview is doing.

**Sharing.** Share encodes the spec into the URL fragment; loading that link rehydrates
straight into the workspace.

## State management

One `useReducer` owns the machine — `phase`, `prompt`, `styleId`, `spec`, `code`,
`changedLines`, `view`, `stepIndex`, `versions`, `activeVersion`. The generation pipeline is a
single self-cancelling `useEffect` that advances `stepIndex` and commits on the last step.
Generated apps keep their own local `useState`, remounted via `key` when the archetype or theme
changes.

## Adding a seventh archetype

1. Add an entry to `BLUEPRINTS` — id, `name`/`nameHe`, `subtitle`/`subtitleHe`, icon, tags, a match regex covering both languages, and an example prompt.
2. Write the renderer with the themed primitives (`Card`, `Slider`, `Stat`, `MiniBars`, `PreviewButton`), wrap every visible string in `L(he, en)`, and register it in `APP_RENDERERS`.
3. Add a matching entry to `CODE_BUILDERS`, using `qOf(spec)` and `rootDiv(spec)` so the emitted code follows the same language and direction.

Nothing else needs to change — presets, refinements, versioning, sharing and export all key
off the spec.
