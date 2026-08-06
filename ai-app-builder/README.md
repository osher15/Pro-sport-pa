# Madaf (מדף) — ready-made business tools

A single-page React app that turns a plain-language description into a **working** business
tool: say what you need, watch the pipeline run, then interact with a live preview sitting next
to its syntax-highlighted source — and keep refining it in any of eight languages.

**Positioning note.** This is deliberately *not* an open-ended app generator. The funded field
(Lovable, Replit, Bolt, v0, Base44/Wix, ChatGPT Sites) owns open-ended generation and cannot be
beaten on it by a small team. What they structurally cannot do — because their valuations
require unlimited scope — is build a *small* number of archetypes all the way to the last 5%,
in correct Hebrew RTL, and keep them maintained. That is what this is. The name says it: a
shelf of finished tools, not an empty prompt box.

**One legal constraint is baked into the product.** In Israel, software that issues tax invoices
must be entered in the Tax Authority's software registry (מרשם התוכנות), which requires a
uniform-file export module and certification. The billing archetype is therefore a **price
quote** builder, not an invoice one, and says so on the document itself. Do not relabel it back.

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
| **A · Landing** | Hero, freeform textarea (⌘/Ctrl+Enter to submit), eight preset quick-cards, four output-style chips, "Surprise me" |
| **B · Generating** | Four-step animated pipeline — architecture → components → state & mock data → preview canvas — with a live terminal log and progress bar |
| **C · Workspace** | Preview / Code / Split toggle, Copy · Download .JSX · Share, device-width switcher, code inspector with version history and a natural-language refinement bar |

## How it actually works

**Blueprint matching.** `resolveSpec()` runs the prompt through an ordered list of
`BLUEPRINTS` regexes (invoice → budget → banking → landing → booking → kanban → roi → rate →
tracker fallback) and derives a product title from the prompt itself. Each blueprint matches English *and* Hebrew keywords.
Preset cards short-circuit the matcher.

**Reviewed.** The three newest archetypes went through a three-way review — RTL/Hebrew, money
and date correctness, and landing-page output quality. Every finding that survived checking was
fixed: the card-freeze switch now actually blocks transfers, the card has a credit limit,
amounts settle to whole agorot and reject malformed input, booking keys use the local calendar
date instead of `toISOString()` (which files bookings a day early east of Greenwich), direction
arrows mirror under RTL, opening-hour ranges are bidi-isolated so `09:00–19:00` cannot render
reversed, and the exported page's previously invisible bottom button is fixed.

**Eight languages, two surfaces.** English, Hebrew, Arabic, Chinese, Russian, Hindi, Spanish
and French, held in `i18n.js` and keyed by the English source string so a missing entry ships
as readable English rather than a blank or a raw identifier.

The two surfaces are deliberately separate. *Madaf's own interface* follows the switcher in the
header, remembered in `localStorage` and seeded from the browser's `navigator.languages`;
`UI[lang]` resolves it through `t()`. *Generated apps* follow *the prompt*: `detectLang()` reads
the script — one Hebrew, Arabic, CJK, Cyrillic or Devanagari character decides it — and falls
back to the interface language when the script is Latin and ambiguous. So a Chinese prompt
typed against an English interface returns a Chinese app.

Every renderer still resolves labels through `L("עברית", "English")`; the second argument is now
the lookup key, which is why all 300-odd call sites were left untouched. `F(he, en, vars)` is its
twin for strings that carry a value inside them, because word order around an interpolated
number differs per language and cannot be concatenated.

Direction is a property of the language, not of Hebrew: `dirOf()` drives `dir`, chevrons and
arrows mirror under any RTL language, and Hebrew, Arabic, Chinese and Devanagari bring their own
font stacks since the theme fonts cover Latin and Cyrillic only. Numbers and currency sit in
`<bdi>` so bidi never scrambles them. Source code is pinned `dir="ltr"` — it reads
left-to-right whatever the interface is doing. Component and file names stay Latin
(`PersonalFinanceManager.jsx`), and refinement phrases are parsed in English and Hebrew, so the
suggestion chips display translated but submit English.

**Nine interactive renderers.** Every archetype is a real, stateful component — not a
mockup:

- **Business Landing Page** — fill in name, tagline, services, hours and contact details; a finished page renders live in a sandboxed iframe and downloads as one standalone HTML file (no host, no builder account, no external requests). The exported page carries Open Graph tags, `LocalBusiness` JSON-LD, an inline SVG favicon, a print stylesheet, focus-visible styles and a sticky mobile action bar (WhatsApp with a prefilled message, tap-to-call, Waze). Ink on the accent is computed for contrast rather than assumed, so a light accent does not produce white-on-white. Empty fields are omitted instead of emitting dead `tel:`/`mailto:` links, and nothing is claimed on the business's behalf that they did not type.
- **Banking Dashboard** — three accounts, transfers that validate the source balance and refuse same-account moves, a searchable and filterable transaction feed, a card-freeze switch, and a money-in vs money-out chart.
- **Appointment Booking** — selectable services with duration and price, a rolling seven-day strip with closed days, a slot grid that disables what is taken, confirmed bookings with cancel, and expected revenue.
- **Personal Finance Manager** — income vs. expenses, six spend categories, live balance, budget-usage bar and a six-month trend chart.
- **Freelance Rate Calculator** — seven inputs → hourly / day / project rate, a where-the-money-goes bar, and a rate-sensitivity chart.
- **Task Kanban Board** — HTML5 drag & drop between columns, keyboard-free move buttons, priority cycling, live WIP counts.
- **Quote & Estimate Builder** — editable line items, four currencies, VAT + discount, accepted/pending toggle, a real file export, and a visible "not a tax invoice" notice (see the legal note above).
- **SaaS ROI Calculator** — MRR/ARR/LTV/CAC modelling with a 12-month projection chart and a unit-economics verdict.
- **Idea & Habit Tracker** — the fallback for freeform prompts: add/complete/filter with an animated SVG progress ring.

**Chart colour.** Categorical hues come from a fixed eight-slot order (`SERIES_LIGHT` /
`SERIES_DARK`) chosen for whichever surface the preview is on, and validated with the data-viz
palette validator against this app's own surfaces — lightness band, chroma floor,
colour-blind separation, normal-vision separation and contrast. Slots are assigned in fixed
order and never cycled, so a category keeps its hue when the set is filtered. Status colours
(good / warning / serious / critical) are reserved, never reused as a series, and always ship
with an icon or a label so meaning never rests on colour alone.

**Styling engine.** The four output styles (Nebula, Minimalist, Corporate, Cyberpunk)
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

## Adding a tenth archetype

1. Add an entry to `BLUEPRINTS` — id, `name`/`nameHe`, `subtitle`/`subtitleHe`, icon, tags, a match regex covering both languages, and an example prompt.
2. Write the renderer with the themed primitives (`Card`, `Slider`, `Stat`, `MiniBars`, `PreviewButton`), wrap every visible string in `L(he, en)` — or `F(he, en, vars)` when a value sits inside the sentence — and register it in `APP_RENDERERS`.
3. Add a matching entry to `CODE_BUILDERS`, using `qOf(spec)` and `rootDiv(spec)` so the emitted code follows the same language and direction.
4. Add the new English strings to each block of `GEN` in `i18n.js`, and the blueprint's name and subtitle to each block of `UI`. Anything you skip falls back to English.

Adding a ninth *language* is three edits in `i18n.js` — one row in `LANGUAGES`, one block in
`UI`, one in `GEN` — plus a script range in `SCRIPT_TESTS` if it needs one. Nothing outside that
file has to know the list grew.

Nothing else needs to change — presets, refinements, versioning, sharing and export all key
off the spec.
