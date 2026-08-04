/**
 * AI App Builder — Micro-SaaS Generator
 * ------------------------------------------------------------------
 * A single-file, production-ready React SPA that simulates an AI app
 * generator: describe an idea, watch it "build", then interact with a
 * fully working preview next to its (syntax highlighted) source code.
 *
 * Stack:  React 18 · Tailwind CSS · lucide-react · CSS keyframe motion
 * States: A) Landing & prompt  B) Generation  C) Live workspace
 *
 * Everything below is self-contained: no external state store, no data
 * fetching, no placeholder components.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useDeferredValue,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import {
  Activity,
  ArrowDownLeft,
  ArrowDownRight,
  ArrowUpLeft,
  ArrowUpRight,
  BarChart3,
  Blocks,
  Boxes,
  Braces,
  Calculator,
  CalendarClock,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Code2,
  Columns2,
  Command,
  Copy,
  CornerDownLeft,
  Cpu,
  DollarSign,
  Download,
  Eye,
  FileText,
  Flame,
  Gauge,
  GripVertical,
  History,
  KanbanSquare,
  Landmark,
  Languages,
  Lightbulb,
  ListChecks,
  Loader2,
  Monitor,
  Moon,
  MousePointerClick,
  Palette,
  PanelsTopLeft,
  Plus,
  Printer,
  RefreshCw,
  Rocket,
  Send,
  Share2,
  ShieldCheck,
  Shuffle,
  Smartphone,
  Sparkles,
  Sun,
  Tablet,
  Target,
  Terminal,
  Trash2,
  TrendingUp,
  Users,
  Wallet,
  Wand2,
  X,
  Zap,
} from "lucide-react";

/* ==================================================================
   0. Tiny utilities
   ================================================================== */

const cx = (...parts) => parts.filter(Boolean).join(" ");

/** Hebrew block (U+0590–U+05FF). One strong character is enough to switch the app to RTL. */
const HEBREW_RE = /[֐-׿]/;
const detectLang = (text) => (HEBREW_RE.test(text || "") ? "he" : "en");

let _seq = 0;
const uid = (prefix = "id") => `${prefix}_${Date.now().toString(36)}_${(_seq++).toString(36)}`;

const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

const num = (value, fallback = 0) => {
  // Strict: a value that is not a well-formed number becomes the fallback rather
  // than being salvaged character-by-character ("1.2.3" must not read as 1.2).
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
  const text = String(value).trim();
  if (text === "") return fallback;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const money = (value, symbol = "$", digits = 0) => {
  const amount = Number.isFinite(value) ? value : 0;
  // "-₪3,820.40", never "₪-3,820.40".
  return (
    (amount < 0 ? "-" : "") +
    symbol +
    Math.abs(amount).toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })
  );
};

const titleCase = (text) =>
  text
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const pascal = (text) => {
  const cleaned = text.replace(/[^a-zA-Z0-9 ]/g, " ");
  const joined = titleCase(cleaned).replace(/\s+/g, "");
  return /^[A-Za-z]/.test(joined) ? joined : "GeneratedApp";
};

const slugify = (text) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 42) || "generated-app";

const copyText = async (text) => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (error) {
    /* falls through to the legacy path below */
  }
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(area);
    return ok;
  } catch (error) {
    return false;
  }
};

const downloadFile = (filename, contents, mime = "text/plain;charset=utf-8") => {
  const blob = new Blob([contents], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
};

/* ==================================================================
   1. Design tokens — the four selectable output styles
   ==================================================================
   Every token is a *complete* Tailwind class string so the compiler can
   statically see it. Colours that need to be dynamic (the accent) ride
   on CSS variables applied to the preview root, which keeps refinement
   ("change accent to cyan") a one-line state change.
   ================================================================== */

/**
 * Categorical chart slots. Assigned in fixed order, never cycled — a series
 * keeps its hue when the set is filtered. Both columns were checked with the
 * data-viz palette validator against this app's real surfaces (light #fbfbfa,
 * dark #0a0a12): lightness band, chroma floor, CVD separation, normal-vision
 * floor and contrast all pass. Three light slots sit below 3:1, so every chart
 * that uses them ships direct labels (the relief rule).
 */
const SERIES_LIGHT = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#4a3aa7", "#e34948"];
const SERIES_DARK = ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#008300", "#9085e9", "#e66767"];

/** Status colours are reserved: never reused as a categorical slot, always paired with an icon or label. */
const STATUS = { good: "#0ca30c", warning: "#fab219", serious: "#ec835a", critical: "#d03b3b" };

const STYLES = [
  {
    id: "modern-dark",
    name: "Modern Dark",
    blurb: "Glass panels, violet glow",
    accent: "#8b5cf6",
    accent2: "#22d3ee",
    dark: true,
    canvas: "bg-[#0a0a12] text-slate-100",
    surface: "bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-2xl shadow-[0_20px_60px_-30px_rgba(0,0,0,0.9)]",
    surfaceAlt: "bg-white/[0.02] border border-white/[0.07] rounded-xl",
    heading: "text-white",
    muted: "text-slate-400",
    faint: "text-slate-500",
    input:
      "w-full rounded-xl bg-white/[0.05] border border-white/10 px-3 py-2 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-[var(--a)] focus:ring-2 focus:ring-[var(--a)]/25",
    btn: "rounded-xl bg-[var(--a)] text-white shadow-[0_10px_30px_-10px_var(--a)] hover:brightness-110",
    btnGhost: "rounded-xl border border-white/10 bg-white/[0.03] text-slate-200 hover:bg-white/[0.08]",
    chip: "rounded-full border border-white/10 bg-white/[0.05] text-slate-300",
    divider: "border-white/10",
    track: "bg-white/10",
    font: "",
    radius: "rounded-2xl",
  },
  {
    id: "minimalist",
    name: "Minimalist",
    blurb: "Paper white, hairline rules",
    accent: "#111827",
    accent2: "#6b7280",
    dark: false,
    canvas: "bg-[#fbfbfa] text-neutral-900",
    surface: "bg-white border border-neutral-200/90 rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.04)]",
    surfaceAlt: "bg-neutral-50 border border-neutral-200/80 rounded-lg",
    heading: "text-neutral-900",
    muted: "text-neutral-500",
    faint: "text-neutral-400",
    input:
      "w-full rounded-lg bg-white border border-neutral-300 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 outline-none transition focus:border-[var(--a)] focus:ring-2 focus:ring-[var(--a)]/15",
    btn: "rounded-lg bg-[var(--a)] text-white hover:opacity-90",
    btnGhost: "rounded-lg border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100",
    chip: "rounded-full border border-neutral-300 bg-white text-neutral-600",
    divider: "border-neutral-200",
    track: "bg-neutral-200",
    font: "",
    radius: "rounded-xl",
  },
  {
    id: "corporate",
    name: "Corporate",
    blurb: "Trustworthy blue, dense data",
    accent: "#2563eb",
    accent2: "#0ea5e9",
    dark: false,
    canvas: "bg-[#f2f5fb] text-slate-800",
    surface: "bg-white border border-slate-200 rounded-lg shadow-[0_2px_8px_rgba(15,23,42,0.06)]",
    surfaceAlt: "bg-slate-50 border border-slate-200 rounded-md",
    heading: "text-slate-900",
    muted: "text-slate-500",
    faint: "text-slate-400",
    input:
      "w-full rounded-md bg-white border border-slate-300 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-[var(--a)] focus:ring-2 focus:ring-[var(--a)]/20",
    btn: "rounded-md bg-[var(--a)] text-white shadow-sm hover:brightness-110",
    btnGhost: "rounded-md border border-slate-300 bg-white text-slate-600 hover:bg-slate-50",
    chip: "rounded-md border border-slate-300 bg-slate-50 text-slate-600",
    divider: "border-slate-200",
    track: "bg-slate-200",
    font: "",
    radius: "rounded-lg",
  },
  {
    id: "cyberpunk",
    name: "Cyberpunk",
    blurb: "Neon wireframe, mono type",
    accent: "#00ffd5",
    accent2: "#ff2bd1",
    dark: true,
    canvas: "bg-black text-[#b8ffef] font-mono",
    surface: "bg-[#040b0a] border border-[var(--a)]/35 rounded-none shadow-[0_0_28px_-10px_var(--a)]",
    surfaceAlt: "bg-[#050f0d] border border-[var(--a)]/20 rounded-none",
    heading: "text-white",
    muted: "text-[#5fbfae]",
    faint: "text-[#3d8a7d]",
    input:
      "w-full rounded-none bg-black border border-[var(--a)]/40 px-3 py-2 text-sm text-[#b8ffef] placeholder:text-[#3d8a7d] outline-none transition focus:border-[var(--a)] focus:ring-2 focus:ring-[var(--a)]/30",
    btn: "rounded-none bg-[var(--a)] text-black font-semibold shadow-[0_0_24px_-6px_var(--a)] hover:brightness-125",
    btnGhost: "rounded-none border border-[var(--a)]/40 bg-black text-[#b8ffef] hover:bg-[var(--a)]/10",
    chip: "rounded-none border border-[var(--a)]/40 bg-black text-[#b8ffef]",
    divider: "border-[var(--a)]/20",
    track: "bg-[var(--a)]/15",
    font: "font-mono",
    radius: "rounded-none",
  },
];

const STYLE_BY_ID = STYLES.reduce((acc, style) => {
  acc[style.id] = style;
  return acc;
}, {});

/** Light/dark counterparts used by the "add a dark mode toggle" refinement. */
const DARK_TWIN = { minimalist: "modern-dark", corporate: "cyberpunk", "modern-dark": "modern-dark", cyberpunk: "cyberpunk" };
const LIGHT_TWIN = { "modern-dark": "minimalist", cyberpunk: "corporate", minimalist: "minimalist", corporate: "corporate" };

/* ==================================================================
   2. Blueprints — how a prompt becomes an app
   ================================================================== */

const BLUEPRINTS = [
  {
    id: "invoice",
    name: "Invoice Generator",
    nameHe: "מחולל חשבוניות",
    subtitle: "Line items, tax, totals — exportable",
    subtitleHe: "שורות חיוב, מע״מ, סיכומים — ניתן לייצוא",
    icon: FileText,
    tags: ["Billing", "PDF export"],
    match: /invoice|billing|bill\b|receipt|quote|estimate|freelance paperwork|חשבונית|חשבוניות|קבלה|קבלות|הצעת מחיר|חיוב לקוח/i,
    prompt: "An invoice generator with editable line items, tax and discount handling, multi-currency totals and an export button.",
  },
  {
    id: "budget",
    name: "Personal Finance Manager",
    nameHe: "ניהול כספים אישי",
    subtitle: "Income, expenses, balance and budgets",
    subtitleHe: "הכנסות, הוצאות, יתרה ותקציב חודשי",
    icon: Wallet,
    tags: ["Finance", "Charts"],
    match:
      /budget|expenses?|spending|personal financ|financ(e|ial) (manage|track)|money manage|money manager|manag\w* (my |the |our )?(money|finances?|budget)|where (my|the) money|cash ?flow|savings?|bank account|ניהול כספים|כספים|תקציב|הוצאות|הכנסות|פיננס|כסף|חסכון|חיסכון|תזרים|חשבון בנק|מעקב כספי/i,
    prompt: "A personal finance manager that tracks income and expenses by category, shows the monthly balance and a budget progress bar.",
  },
  {
    id: "banking",
    name: "Banking Dashboard",
    nameHe: "דשבורד בנקאי",
    subtitle: "Accounts, transfers and a live transaction feed",
    subtitleHe: "חשבונות, העברות ותנועות בזמן אמת",
    icon: Landmark,
    tags: ["Banking", "Transfers"],
    match:
      /bank(ing|ers)?\b|checking account|current account|savings account|iban|wire|transfer money|money transfer|debit card|credit card|statement|overdraft|בנק|בנקאות|עו"?ש|עובר ושב|העבר(ה|ות) כספ|חשבון עו|כרטיס אשראי|יתרה בחשבון|תנועות בחשבון|משיכת יתר/i,
    prompt:
      "A digital banking dashboard with multiple accounts, transfers between them, a searchable transaction feed and a monthly money-in vs money-out chart.",
  },
  {
    id: "landing",
    name: "Business Landing Page",
    nameHe: "דף נחיתה לעסק",
    subtitle: "Fill in your details, get a ready page",
    subtitleHe: "ממלאים פרטים ומקבלים דף מוכן",
    icon: PanelsTopLeft,
    tags: ["Marketing", "HTML export"],
    match:
      /landing ?page|website for (my|a) business|business (site|page|website)|one ?pager|marketing page|sales page|micro ?site|homepage for|דף נחיתה|דפי נחיתה|אתר תדמית|אתר לעסק|עמוד מכירה|אתר בשניות|נוכחות דיגיטלית/i,
    prompt:
      "A landing page builder for small businesses: fill in the business details and instantly get a finished page with hero, services, testimonial and contact section, exportable as HTML.",
  },
  {
    id: "booking",
    name: "Appointment Booking",
    nameHe: "מערכת זימון תורים",
    subtitle: "Services, day strip, slots and bookings",
    subtitleHe: "שירותים, ימים, שעות פנויות וזימון",
    icon: CalendarClock,
    tags: ["Scheduling", "Slots"],
    match:
      /appointment|booking|schedul(e|ing) (system|app|tool)|reservation|calendar app|time ?slots?|barber|salon|clinic|תורים|זימון תור|קביעת תור|יומן פגישות|הזמנת מקום|מספרה|קליניקה|תיאום פגישות/i,
    prompt: "An appointment booking system with selectable services, a seven day strip, available time slots and a list of confirmed bookings.",
  },
  {
    id: "kanban",
    name: "Task Kanban Board",
    nameHe: "לוח משימות קנבן",
    subtitle: "Drag & drop columns with WIP counts",
    subtitleHe: "עמודות עם גרירה ומונה משימות",
    icon: KanbanSquare,
    tags: ["Productivity", "Drag & drop"],
    match: /kanban|task|board|to-?do|backlog|sprint|ticket|project manage|workflow|קנבן|משימ|מטלות|לוח משימות|פרויקט|ניהול משימות/i,
    prompt: "A kanban task board with three columns, drag and drop cards, priorities and a live progress bar.",
  },
  {
    id: "roi",
    name: "SaaS ROI Calculator",
    nameHe: "מחשבון ROI ל-SaaS",
    subtitle: "MRR, LTV:CAC and payback modelling",
    subtitleHe: "מודל הכנסות חוזרות, LTV:CAC והחזר השקעה",
    icon: TrendingUp,
    tags: ["Analytics", "Charts"],
    match: /roi|saas metric|mrr|arr|churn|ltv|cac|payback|retention|subscription revenue|unit econ|נטישה|החזר השקעה|הכנסה חוזרת|מנויים/i,
    prompt: "A SaaS ROI calculator that models MRR, ARR, LTV:CAC ratio, payback period and a 12 month revenue projection.",
  },
  {
    id: "rate",
    name: "Freelance Rate Calculator",
    nameHe: "מחשבון תעריף לפרילנסר",
    subtitle: "Turn a salary goal into an hourly rate",
    subtitleHe: "ממטרת הכנסה שנתית לתעריף שעתי",
    icon: Calculator,
    tags: ["Finance", "Sliders"],
    match: /rate|freelanc|hourly|day rate|pricing|price my|how much (should|to) charge|salary|תעריף|פרילנס|עצמאי|שכר שעתי|תמחור|כמה לגבות|מחיר לשעה/i,
    prompt: "A freelance rate calculator that turns a target income, expenses and billable hours into an hourly, daily and project rate.",
  },
  {
    id: "tracker",
    name: "Idea & Habit Tracker",
    nameHe: "מעקב הרגלים ורעיונות",
    subtitle: "Checklist with progress ring and filters",
    subtitleHe: "רשימת מעקב עם טבעת התקדמות וסינון",
    icon: ListChecks,
    tags: ["Tracking", "Filters"],
    match: /.*/,
    prompt: "A tracker app for logging items, marking them complete and watching a progress ring fill up.",
  },
];

const BLUEPRINT_BY_ID = BLUEPRINTS.reduce((acc, bp) => {
  acc[bp.id] = bp;
  return acc;
}, {});

const PRESETS = ["landing", "banking", "budget", "booking", "invoice", "kanban", "roi", "rate"].map((id) => BLUEPRINT_BY_ID[id]);

const SURPRISE_IDEAS = [
  "A pricing calculator for a design studio that quotes projects by scope and rush fee",
  "A kanban board for tracking podcast episodes from idea to published",
  "An invoice builder for photographers with per-image licensing rows",
  "A churn dashboard that shows whether my SaaS unit economics actually work",
  "A weekly habit tracker with streaks and a completion ring",
  "תכין לי אפליקציה לניהול כספים עם הוצאות לפי קטגוריה",
  "לוח משימות קנבן לניהול הפרויקטים שלי",
];

/** Strips the imperative wrapper off a prompt so titles read like product names. */
const STOP_WORDS = new Set(["for", "with", "that", "which", "and", "to", "of", "my", "in", "on", "a", "an", "the", "so", "it"]);
const STOP_WORDS_HE = new Set(["של", "עם", "לפי", "כדי", "שלי", "בשביל", "על", "את", "אני", "לי", "עבור", "כמו"]);

/** Hebrew imperatives that open a request: "תכין לי אפליקציה ל…", "בנה לי…". */
const HE_LEAD_RE = /^\s*(בבקשה\s+)?(תכין|תבנה|בנה|תיצור|צור|תעשה|עשה|אני רוצה|אני צריך|אני צריכה|תפתח|פתח|הכן)\s*(לי\s+)?(את\s+)?/;
// The preposition is required: "אפליקציה לניהול כספים" drops the noun, but
// "דף נחיתה לעסק" keeps it — there the noun is part of the product name.
const HE_NOUN_RE = /^\s*(אפליקציה|אפליקציית|אפליקצייה|מערכת|כלי|תוכנה|אתר|מסך)\s*(ל|של|בשביל|עבור)\s*/;

const deriveTitle = (prompt, blueprint) => {
  if (detectLang(prompt) === "he") {
    const cleaned = prompt
      .replace(HE_LEAD_RE, "")
      .replace(HE_NOUN_RE, "")
      .replace(/[.,!?].*$/, "")
      .trim();
    const words = cleaned.split(/\s+/).filter(Boolean).slice(0, 5);
    while (words.length && STOP_WORDS_HE.has(words[words.length - 1])) words.pop();
    // Hebrew has no title case — the words are used exactly as written.
    return words.length >= 1 ? words.join(" ") : blueprint.nameHe;
  }
  const cleaned = prompt
    .replace(/^\s*(please\s+)?(build|create|make|generate|design|give me|i want|i need)\s+(me\s+)?/i, "")
    .replace(/^\s*(an?|the)\s+/i, "")
    .replace(/\b(app|application|tool|that|which|for me)\b.*$/i, "")
    .replace(/[.,!?].*$/, "")
    .trim();
  const words = cleaned.split(/\s+/).filter(Boolean).slice(0, 5);
  while (words.length && STOP_WORDS.has(words[words.length - 1].toLowerCase())) words.pop();
  if (words.length < 2) return blueprint.name;
  return titleCase(words.join(" "));
};

/** Component/file names stay Latin even when the UI is Hebrew. */
const componentName = (spec) => {
  const latin = (spec.title || "").replace(/[^\x20-\x7E]/g, " ").trim();
  const fromTitle = latin.length > 2 ? pascal(latin) : "";
  return fromTitle && fromTitle !== "GeneratedApp" ? fromTitle : pascal(BLUEPRINT_BY_ID[spec.appId].name);
};

/**
 * The generation engine: maps freeform text onto a blueprint plus a full
 * render spec. Presets short-circuit the matcher by passing `forcedId`.
 * Hebrew prompts produce a Hebrew, right-to-left app.
 */
const resolveSpec = (prompt, styleId, forcedId) => {
  const blueprint =
    (forcedId && BLUEPRINT_BY_ID[forcedId]) ||
    BLUEPRINTS.find((bp) => bp.id !== "tracker" && bp.match.test(prompt)) ||
    BLUEPRINT_BY_ID.tracker;
  const style = STYLE_BY_ID[styleId] || STYLES[0];
  const lang = detectLang(prompt);
  const defaultTitle = lang === "he" ? blueprint.nameHe : blueprint.name;
  return {
    appId: blueprint.id,
    lang,
    title: forcedId ? defaultTitle : deriveTitle(prompt, blueprint),
    subtitle: lang === "he" ? blueprint.subtitleHe : blueprint.subtitle,
    prompt: prompt.trim(),
    styleId: style.id,
    accent: style.accent,
    accent2: style.accent2,
    density: "comfortable",
    showChart: ["roi", "budget", "banking", "booking"].includes(blueprint.id),
    showHeader: true,
    darkToggle: false,
  };
};

/* ==================================================================
   3. Refinement engine — natural language → spec patch
   ================================================================== */

const NAMED_COLORS = {
  cyan: "#22d3ee",
  teal: "#14b8a6",
  emerald: "#10b981",
  green: "#22c55e",
  lime: "#84cc16",
  amber: "#f59e0b",
  orange: "#f97316",
  yellow: "#eab308",
  red: "#ef4444",
  rose: "#f43f5e",
  pink: "#ec4899",
  fuchsia: "#d946ef",
  purple: "#a855f7",
  violet: "#8b5cf6",
  indigo: "#6366f1",
  blue: "#3b82f6",
  sky: "#0ea5e9",
  slate: "#64748b",
  black: "#111827",
  white: "#e2e8f0",
};

/** Hebrew colour words map onto the same palette. */
const NAMED_COLORS_HE = {
  תכלת: "#22d3ee",
  טורקיז: "#14b8a6",
  ירוק: "#22c55e",
  זית: "#84cc16",
  כתום: "#f97316",
  צהוב: "#eab308",
  אדום: "#ef4444",
  ורוד: "#ec4899",
  סגול: "#a855f7",
  כחול: "#3b82f6",
  אפור: "#64748b",
  שחור: "#111827",
  לבן: "#e2e8f0",
};

/**
 * Interprets a refinement request and returns `{ patch, notes }`.
 * Unrecognised requests still produce a version — annotated honestly —
 * so the history never lies about what changed.
 */
const interpretRefinement = (text, spec) => {
  const request = text.trim();
  const lower = request.toLowerCase();
  const patch = {};
  const notes = [];

  const hex = lower.match(/#([0-9a-f]{6}|[0-9a-f]{3})\b/);
  const colorWord = Object.keys(NAMED_COLORS).find((name) => new RegExp(`\\b${name}\\b`).test(lower));
  const colorWordHe = Object.keys(NAMED_COLORS_HE).find((name) => lower.includes(name));
  if (/colou?r|accent|theme colou?r|primary|brand|צבע|גוון/.test(lower) || hex) {
    if (hex) {
      patch.accent = `#${hex[1]}`;
      notes.push(`accent → ${patch.accent}`);
    } else if (colorWordHe) {
      patch.accent = NAMED_COLORS_HE[colorWordHe];
      notes.push(`accent → ${colorWordHe}`);
    } else if (colorWord) {
      patch.accent = NAMED_COLORS[colorWord];
      notes.push(`accent → ${colorWord}`);
    }
  } else if (colorWordHe) {
    patch.accent = NAMED_COLORS_HE[colorWordHe];
    notes.push(`accent → ${colorWordHe}`);
  } else if (colorWord && /\bmake it|\bswitch|\bturn\b/.test(lower)) {
    patch.accent = NAMED_COLORS[colorWord];
    notes.push(`accent → ${colorWord}`);
  }

  const styleHit = STYLES.find((style) => lower.includes(style.id.replace("-", " ")) || lower.includes(style.name.toLowerCase()));
  if (styleHit && styleHit.id !== spec.styleId) {
    patch.styleId = styleHit.id;
    if (!patch.accent) patch.accent = styleHit.accent;
    patch.accent2 = styleHit.accent2;
    notes.push(`style → ${styleHit.name}`);
  }

  const removeWord = /remove|without|drop|no more|hide|תוריד|הסר|בלי|תסיר/;

  if (/dark ?mode|light ?mode|theme (toggle|switch)|day.?night|מצב לילה|מצב כהה|מצב בהיר|כפתור תאורה/.test(lower)) {
    patch.darkToggle = !removeWord.test(lower);
    notes.push(patch.darkToggle ? "added dark mode toggle" : "removed dark mode toggle");
  }

  if (/compact|dense|tighter|smaller padding|condense|צפוף|קומפקטי|יותר קטן|צמצם/.test(lower)) {
    patch.density = "compact";
    notes.push("density → compact");
  } else if (/spacious|roomier|more (padding|space)|comfortable|breathing|מרווח|יותר מקום|אוורירי/.test(lower)) {
    patch.density = "comfortable";
    notes.push("density → comfortable");
  }

  if (/chart|graph|visual|analytics|sparkline|breakdown|גרף|תרשים|סטטיסטיק|אנליטיק|ויזואל/.test(lower)) {
    patch.showChart = !/remove|hide|without|no chart|תוריד|הסר|בלי/.test(lower);
    notes.push(patch.showChart ? "added analytics panel" : "removed analytics panel");
  }

  if (/(remove|hide|drop) (the )?(header|title bar|top bar)|(תוריד|הסר|בלי) (את )?(הכותרת|כותרת)/.test(lower)) {
    patch.showHeader = false;
    notes.push("removed header");
  } else if (/(add|show|bring back) (the )?(header|title bar)|(תחזיר|הוסף) (את )?(הכותרת|כותרת)/.test(lower)) {
    patch.showHeader = true;
    notes.push("restored header");
  }

  const renameHe = request.match(/(?:תקרא ל(?:זה|ו)|קרא ל(?:זה|ו)|שנה את השם ל|תשנה את השם ל|שם חדש)\s*[:"“']?\s*([^"”'.!?\n]{2,42})/);
  if (renameHe) {
    patch.title = renameHe[1].trim();
    notes.push(`renamed → ${patch.title}`);
  }

  const rename = request.match(/(?:call it|rename (?:it )?to|name it|title it)\s+["“']?([^"”'.!?]{2,42})/i);
  if (rename) {
    patch.title = titleCase(rename[1].trim());
    notes.push(`renamed → ${patch.title}`);
  }

  const swap = BLUEPRINTS.find((bp) => bp.id !== "tracker" && bp.id !== spec.appId && bp.match.test(lower));
  if (swap && /(turn|convert|switch|make) (it|this)? ?(into|to)|תהפוך|הפוך את זה|תשנה ל|שנה ל|תעשה מזה|במקום זה/.test(lower)) {
    const previous = BLUEPRINT_BY_ID[spec.appId];
    patch.appId = swap.id;
    patch.subtitle = spec.lang === "he" ? swap.subtitleHe : swap.subtitle;
    // Keep a custom title, but retire a default one that no longer describes the app.
    if (spec.title === previous.name || spec.title === previous.nameHe) {
      patch.title = spec.lang === "he" ? swap.nameHe : swap.name;
    }
    notes.push(`rebuilt as ${swap.name}`);
  }

  if (notes.length === 0) {
    notes.push("noted as a design intent — layout regenerated");
  }
  return { patch, notes };
};

/* ==================================================================
   4. Code generation — every spec produces real, runnable source
   ================================================================== */

const codeHeader = (spec, meta) => {
  const style = STYLE_BY_ID[spec.styleId];
  return [
    "// " + spec.title,
    "// Generated by AI App Builder · style: " + style.name + " · density: " + spec.density,
    "// Prompt: " + (spec.prompt || spec.title),
    "",
    'import React, { useMemo, useState } from "react";',
    'import { ' + meta.icons.join(", ") + ' } from "lucide-react";',
    "",
    "const ACCENT = \"" + spec.accent + "\";",
    "const PAD = \"" + (spec.density === "compact" ? "p-3" : "p-5") + "\";",
    "",
  ];
};

const themeLine = (spec) => {
  const style = STYLE_BY_ID[spec.styleId];
  // The preview drives its accent through a CSS variable; exported code is
  // standalone, so the resolved hex is written straight into the classes.
  const literal = (value) => value.replace(/var\(--a\)/g, spec.accent);
  return [
    "const shell = \"" + literal(style.canvas) + "\";",
    "const card = \"" + literal(style.surface) + " \" + PAD;",
    "const input = \"" + literal(style.input) + "\";",
    "",
  ];
};

const headerBlock = (spec, indent = "      ") => {
  if (!spec.showHeader) return [];
  const lines = [
    indent + "<header className=\"mb-5 flex items-center justify-between\">",
    indent + "  <div>",
    indent + "    <h1 className=\"text-xl font-semibold tracking-tight\">" + spec.title + "</h1>",
    indent + "    <p className=\"text-sm opacity-60\">" + spec.subtitle + "</p>",
    indent + "  </div>",
  ];
  if (spec.darkToggle) {
    lines.push(
      indent + "  <button",
      indent + "    onClick={() => setDark((value) => !value)}",
      indent + "    className=\"grid h-9 w-9 place-items-center rounded-lg border border-current/20\"",
      indent + "    aria-label=\"Toggle dark mode\"",
      indent + "  >",
      indent + "    {dark ? <Sun size={16} /> : <Moon size={16} />}",
      indent + "  </button>"
    );
  }
  lines.push(indent + "</header>");
  return lines;
};

const chartBlock = (spec, title, indent = "      ") =>
  spec.showChart
    ? [
        indent + "<section className={card + \" mt-4\"}>",
        indent + "  <div className=\"mb-3 flex items-center gap-2 text-sm font-medium\">",
        indent + "    <BarChart3 size={15} style={{ color: ACCENT }} /> " + title,
        indent + "  </div>",
        indent + "  <div className=\"flex h-24 items-end gap-1.5\">",
        indent + "    {series.map((value, index) => (",
        indent + "      <div",
        indent + "        key={index}",
        indent + "        className=\"flex-1 rounded-t transition-all duration-500\"",
        indent + "        style={{ height: Math.max(6, (value / peak) * 100) + \"%\", background: ACCENT, opacity: 0.35 + (index / series.length) * 0.65 }}",
        indent + "      />",
        indent + "    ))}",
        indent + "  </div>",
        indent + "</section>",
      ]
    : [];

const darkStateLine = (spec) =>
  spec.darkToggle ? ["  const [dark, setDark] = useState(" + String(!!STYLE_BY_ID[spec.styleId].dark) + ");", ""] : [];

/** Emitted code carries the same language as the preview it describes. */
const qOf = (spec) => (hebrew, english) => (spec.lang === "he" ? hebrew : english);

/** Root element of a generated app — RTL apps declare it in the source too. */
const rootDiv = (spec, extra) =>
  '    <div className={shell + " min-h-full p-6"}' + (spec.lang === "he" ? ' dir="rtl" lang="he"' : "") + (extra || "") + ">";

const CODE_BUILDERS = {
  rate: (spec) => {
    const name = componentName(spec);
    const q = qOf(spec);
    return [
      ...codeHeader(spec, { icons: ["Calculator", "DollarSign", "TrendingUp", "BarChart3", "Moon", "Sun"] }),
      ...themeLine(spec),
      "export default function " + name + "() {",
      "  const [income, setIncome] = useState(120000);",
      "  const [expenses, setExpenses] = useState(18000);",
      "  const [hoursPerWeek, setHoursPerWeek] = useState(25);",
      "  const [weeksOff, setWeeksOff] = useState(6);",
      "  const [taxRate, setTaxRate] = useState(28);",
      "  const [margin, setMargin] = useState(15);",
      "  const [projectHours, setProjectHours] = useState(40);",
      ...darkStateLine(spec),
      "  const result = useMemo(() => {",
      "    const billableHours = Math.max(1, (52 - weeksOff) * hoursPerWeek);",
      "    const preTax = income / Math.max(0.05, 1 - taxRate / 100);",
      "    const revenue = (preTax + expenses) * (1 + margin / 100);",
      "    const hourly = revenue / billableHours;",
      "    return {",
      "      billableHours,",
      "      revenue,",
      "      hourly,",
      "      daily: hourly * 8,",
      "      project: hourly * projectHours,",
      "      taxShare: preTax - income,",
      "    };",
      "  }, [income, expenses, hoursPerWeek, weeksOff, taxRate, margin, projectHours]);",
      "",
      "  const series = [result.hourly * 0.7, result.hourly * 0.85, result.hourly, result.hourly * 1.1, result.hourly * 1.25];",
      "  const peak = Math.max(...series);",
      "",
      "  return (",
      rootDiv(spec),
      ...headerBlock(spec),
      "      <div className=\"grid gap-4 md:grid-cols-2\">",
      "        <section className={card}>",
      '          <Slider label="' + q("הכנסה שנתית רצויה", "Target take-home") + '" value={income} min={20000} max={400000} step={5000} onChange={setIncome} format={(v) => "$" + v.toLocaleString()} />',
      '          <Slider label="' + q("הוצאות עסקיות", "Business expenses") + '" value={expenses} min={0} max={80000} step={1000} onChange={setExpenses} format={(v) => "$" + v.toLocaleString()} />',
      '          <Slider label="' + q("שעות חיוב בשבוע", "Billable hours / week") + '" value={hoursPerWeek} min={5} max={50} step={1} onChange={setHoursPerWeek} />',
      '          <Slider label="' + q("שבועות חופשה בשנה", "Weeks off per year") + '" value={weeksOff} min={0} max={16} step={1} onChange={setWeeksOff} />',
      '          <Slider label="' + q("שיעור מס אפקטיבי", "Effective tax rate") + '" value={taxRate} min={0} max={55} step={1} onChange={setTaxRate} format={(v) => v + "%"} />',
      '          <Slider label="' + q("שולי רווח", "Profit margin") + '" value={margin} min={0} max={60} step={1} onChange={setMargin} format={(v) => v + "%"} />',
      "        </section>",
      "",
      "        <section className=\"grid gap-4\">",
      "          <div className={card}>",
      '            <p className="text-xs uppercase tracking-widest opacity-60">' + q("התעריף שלך לשעה", "Your hourly rate") + "</p>",
      "            <p className=\"mt-1 text-5xl font-semibold\" style={{ color: ACCENT }}>",
      "              ${Math.round(result.hourly)}",
      "            </p>",
      "            <p className=\"mt-2 text-sm opacity-60\">",
      "              {Math.round(result.billableHours)} billable hours · {\"$\" + Math.round(result.revenue).toLocaleString()} revenue target",
      "            </p>",
      "          </div>",
      "          <div className=\"grid grid-cols-2 gap-4\">",
      "            <div className={card}>",
      '              <p className="text-xs opacity-60">' + q("תעריף יומי (8 ש׳)", "Day rate (8h)") + "</p>",
      "              <p className=\"text-2xl font-semibold\">${Math.round(result.daily)}</p>",
      "            </div>",
      "            <div className={card}>",
      "              <p className=\"text-xs opacity-60\">{projectHours}h project</p>",
      "              <p className=\"text-2xl font-semibold\">${Math.round(result.project)}</p>",
      "            </div>",
      "          </div>",
      "        </section>",
      "      </div>",
      ...chartBlock(spec, "Rate sensitivity"),
      "    </div>",
      "  );",
      "}",
      "",
      "function Slider({ label, value, min, max, step, onChange, format }) {",
      "  return (",
      "    <label className=\"mb-4 block last:mb-0\">",
      "      <span className=\"mb-1 flex items-center justify-between text-sm\">",
      "        <span className=\"opacity-70\">{label}</span>",
      "        <span className=\"font-medium\">{format ? format(value) : value}</span>",
      "      </span>",
      "      <input",
      "        type=\"range\"",
      "        min={min}",
      "        max={max}",
      "        step={step}",
      "        value={value}",
      "        onChange={(event) => onChange(Number(event.target.value))}",
      "        className=\"w-full accent-current\"",
      "        style={{ accentColor: ACCENT }}",
      "      />",
      "    </label>",
      "  );",
      "}",
    ].join("\n");
  },

  kanban: (spec) => {
    const name = componentName(spec);
    const q = qOf(spec);
    return [
      ...codeHeader(spec, { icons: ["KanbanSquare", "Plus", "Trash2", "ChevronLeft", "ChevronRight", "BarChart3", "Moon", "Sun"] }),
      ...themeLine(spec),
      "const COLUMNS = [",
      '  { id: "backlog", name: "' + q("ממתין", "Backlog") + '" },',
      '  { id: "doing", name: "' + q("בביצוע", "In Progress") + '" },',
      '  { id: "done", name: "' + q("הושלם", "Done") + '" },',
      "];",
      "",
      "const PRIORITIES = [" + q('"נמוכה", "בינונית", "גבוהה"', '"low", "medium", "high"') + "];",
      "",
      "export default function " + name + "() {",
      "  const [cards, setCards] = useState([",
      '    { id: 1, title: "' + q("לכתוב רצף מיילים למשתמש חדש", "Draft onboarding copy") + '", column: "backlog", priority: PRIORITIES[1] },',
      '    { id: 2, title: "' + q("לחבר webhook לחיובים", "Ship billing webhook") + '", column: "doing", priority: PRIORITIES[2] },',
      '    { id: 3, title: "' + q("לתקן גלישה בתפריט במובייל", "Fix mobile nav overflow") + '", column: "done", priority: PRIORITIES[0] },',
      "  ]);",
      '  const [draft, setDraft] = useState("");',
      "  const [dragId, setDragId] = useState(null);",
      ...darkStateLine(spec),
      "  const done = cards.filter((card) => card.column === \"done\").length;",
      "  const progress = cards.length ? Math.round((done / cards.length) * 100) : 0;",
      "  const series = COLUMNS.map((column) => cards.filter((card) => card.column === column.id).length);",
      "  const peak = Math.max(1, ...series);",
      "",
      "  const addCard = () => {",
      "    const title = draft.trim();",
      "    if (!title) return;",
      '    setCards((list) => [...list, { id: Date.now(), title, column: "backlog", priority: PRIORITIES[1] }]);',
      '    setDraft("");',
      "  };",
      "",
      "  const move = (id, direction) =>",
      "    setCards((list) =>",
      "      list.map((card) => {",
      "        if (card.id !== id) return card;",
      "        const index = COLUMNS.findIndex((column) => column.id === card.column);",
      "        const next = Math.min(COLUMNS.length - 1, Math.max(0, index + direction));",
      "        return { ...card, column: COLUMNS[next].id };",
      "      })",
      "    );",
      "",
      "  const drop = (columnId) => {",
      "    if (dragId == null) return;",
      "    setCards((list) => list.map((card) => (card.id === dragId ? { ...card, column: columnId } : card)));",
      "    setDragId(null);",
      "  };",
      "",
      "  return (",
      rootDiv(spec),
      ...headerBlock(spec),
      "      <div className=\"mb-4 flex gap-2\">",
      "        <input",
      "          className={input}",
      "          value={draft}",
      '          placeholder="' + q("הוסף משימה ולחץ Enter", "Add a task and press Enter") + '"',
      "          onChange={(event) => setDraft(event.target.value)}",
      "          onKeyDown={(event) => event.key === \"Enter\" && addCard()}",
      "        />",
      "        <button onClick={addCard} className=\"shrink-0 px-4 py-2 text-sm\" style={{ background: ACCENT, color: \"#fff\" }}>",
      "          <Plus size={16} />",
      "        </button>",
      "      </div>",
      "",
      "      <div className=\"mb-4 h-1.5 w-full overflow-hidden rounded-full bg-current/10\">",
      "        <div className=\"h-full rounded-full transition-all duration-500\" style={{ width: progress + \"%\", background: ACCENT }} />",
      "      </div>",
      "",
      "      <div className=\"grid gap-4 md:grid-cols-3\">",
      "        {COLUMNS.map((column) => (",
      "          <div",
      "            key={column.id}",
      "            onDragOver={(event) => event.preventDefault()}",
      "            onDrop={() => drop(column.id)}",
      "            className={card + \" min-h-[220px]\"}",
      "          >",
      "            <div className=\"mb-3 flex items-center justify-between text-sm font-medium\">",
      "              <span>{column.name}</span>",
      "              <span className=\"opacity-50\">{cards.filter((card) => card.column === column.id).length}</span>",
      "            </div>",
      "            <div className=\"space-y-2\">",
      "              {cards",
      "                .filter((card) => card.column === column.id)",
      "                .map((card) => (",
      "                  <article",
      "                    key={card.id}",
      "                    draggable",
      "                    onDragStart={() => setDragId(card.id)}",
      "                    className=\"group cursor-grab rounded-lg border border-current/10 p-3 text-sm active:cursor-grabbing\"",
      "                  >",
      "                    <p>{card.title}</p>",
      "                    <div className=\"mt-2 flex items-center justify-between\">",
      "                      <button",
      "                        onClick={() =>",
      "                          setCards((list) =>",
      "                            list.map((item) =>",
      "                              item.id === card.id",
      "                                ? { ...item, priority: PRIORITIES[(PRIORITIES.indexOf(item.priority) + 1) % PRIORITIES.length] }",
      "                                : item",
      "                            )",
      "                          )",
      "                        }",
      "                        className=\"rounded-full border border-current/20 px-2 py-0.5 text-[10px] uppercase tracking-wider\"",
      "                      >",
      "                        {card.priority}",
      "                      </button>",
      "                      <span className=\"flex gap-1 opacity-0 transition group-hover:opacity-100\">",
      "                        <button onClick={() => move(card.id, -1)}><ChevronLeft size={14} /></button>",
      "                        <button onClick={() => move(card.id, 1)}><ChevronRight size={14} /></button>",
      "                        <button onClick={() => setCards((list) => list.filter((item) => item.id !== card.id))}>",
      "                          <Trash2 size={14} />",
      "                        </button>",
      "                      </span>",
      "                    </div>",
      "                  </article>",
      "                ))}",
      "            </div>",
      "          </div>",
      "        ))}",
      "      </div>",
      ...chartBlock(spec, "Cards per column"),
      "    </div>",
      "  );",
      "}",
    ].join("\n");
  },

  invoice: (spec) => {
    const name = componentName(spec);
    const q = qOf(spec);
    return [
      ...codeHeader(spec, { icons: ["FileText", "Plus", "Trash2", "Printer", "BarChart3", "Moon", "Sun"] }),
      ...themeLine(spec),
      "const CURRENCIES = [\"$\", \"€\", \"£\", \"₪\"];",
      "",
      "export default function " + name + "() {",
      "  const [currency, setCurrency] = useState(\"$\");",
      "  const [client, setClient] = useState({ name: \"Northwind Studio\", email: \"ap@northwind.co\" });",
      "  const [meta, setMeta] = useState({ number: \"INV-0042\", issued: \"2026-08-03\", due: \"2026-08-17\" });",
      "  const [items, setItems] = useState([",
      "    { id: 1, description: \"Product design sprint\", qty: 1, rate: 4800 },",
      "    { id: 2, description: \"Front-end implementation\", qty: 32, rate: 145 },",
      "  ]);",
      "  const [taxRate, setTaxRate] = useState(17);",
      "  const [discount, setDiscount] = useState(0);",
      "  const [paid, setPaid] = useState(false);",
      ...darkStateLine(spec),
      "  const totals = useMemo(() => {",
      "    const subtotal = items.reduce((sum, item) => sum + item.qty * item.rate, 0);",
      "    const discounted = subtotal * (1 - discount / 100);",
      "    const tax = discounted * (taxRate / 100);",
      "    return { subtotal, discounted, tax, total: discounted + tax };",
      "  }, [items, taxRate, discount]);",
      "",
      "  const series = items.map((item) => item.qty * item.rate);",
      "  const peak = Math.max(1, ...series);",
      "",
      "  const update = (id, key, value) =>",
      "    setItems((list) => list.map((item) => (item.id === id ? { ...item, [key]: value } : item)));",
      "",
      "  return (",
      rootDiv(spec),
      ...headerBlock(spec),
      "      <div className={card}>",
      "        <div className=\"grid gap-3 md:grid-cols-3\">",
      "          <input className={input} value={client.name} onChange={(event) => setClient({ ...client, name: event.target.value })} />",
      "          <input className={input} value={client.email} onChange={(event) => setClient({ ...client, email: event.target.value })} />",
      "          <input className={input} value={meta.number} onChange={(event) => setMeta({ ...meta, number: event.target.value })} />",
      "        </div>",
      "",
      "        <table className=\"mt-5 w-full text-sm\">",
      "          <thead>",
      "            <tr className=\"text-left opacity-60\">",
      '              <th className="pb-2">' + q("תיאור", "Description") + "</th>",
      '              <th className="w-20 pb-2">' + q("כמות", "Qty") + "</th>",
      '              <th className="w-28 pb-2">' + q("מחיר", "Rate") + "</th>",
      '              <th className="w-28 pb-2 text-end">' + q("סה״כ", "Amount") + "</th>",
      "              <th className=\"w-8\" />",
      "            </tr>",
      "          </thead>",
      "          <tbody>",
      "            {items.map((item) => (",
      "              <tr key={item.id} className=\"border-t border-current/10\">",
      "                <td className=\"py-2 pr-2\">",
      "                  <input className={input} value={item.description} onChange={(event) => update(item.id, \"description\", event.target.value)} />",
      "                </td>",
      "                <td className=\"py-2 pr-2\">",
      "                  <input type=\"number\" className={input} value={item.qty} onChange={(event) => update(item.id, \"qty\", Number(event.target.value))} />",
      "                </td>",
      "                <td className=\"py-2 pr-2\">",
      "                  <input type=\"number\" className={input} value={item.rate} onChange={(event) => update(item.id, \"rate\", Number(event.target.value))} />",
      "                </td>",
      "                <td className=\"py-2 text-right font-medium\">{currency + (item.qty * item.rate).toLocaleString()}</td>",
      "                <td className=\"py-2 text-right\">",
      "                  <button onClick={() => setItems((list) => list.filter((row) => row.id !== item.id))}>",
      "                    <Trash2 size={14} />",
      "                  </button>",
      "                </td>",
      "              </tr>",
      "            ))}",
      "          </tbody>",
      "        </table>",
      "",
      "        <button",
      "          onClick={() => setItems((list) => [...list, { id: Date.now(), description: \"New line item\", qty: 1, rate: 0 }])}",
      "          className=\"mt-3 flex items-center gap-1 text-sm\"",
      "          style={{ color: ACCENT }}",
      "        >",
      '          <Plus size={14} /> ' + q("הוסף שורה", "Add line"),
      "        </button>",
      "",
      "        <div className=\"mt-5 flex justify-end\">",
      "          <dl className=\"w-64 space-y-1 text-sm\">",
      "            <div className=\"flex justify-between opacity-70\">",
      '              <dt>' + q("ביניים", "Subtotal") + "</dt>",
      "              <dd>{currency + totals.subtotal.toLocaleString()}</dd>",
      "            </div>",
      "            <div className=\"flex justify-between opacity-70\">",
      "              <dt>VAT {taxRate}%</dt>",
      "              <dd>{currency + Math.round(totals.tax).toLocaleString()}</dd>",
      "            </div>",
      "            <div className=\"flex justify-between border-t border-current/10 pt-2 text-lg font-semibold\">",
      '              <dt>' + q("סה״כ לתשלום", "Total") + "</dt>",
      "              <dd style={{ color: ACCENT }}>{currency + Math.round(totals.total).toLocaleString()}</dd>",
      "            </div>",
      "          </dl>",
      "        </div>",
      "      </div>",
      ...chartBlock(spec, "Revenue by line item"),
      "    </div>",
      "  );",
      "}",
    ].join("\n");
  },

  roi: (spec) => {
    const name = componentName(spec);
    const q = qOf(spec);
    return [
      ...codeHeader(spec, { icons: ["TrendingUp", "Users", "Target", "BarChart3", "Moon", "Sun"] }),
      ...themeLine(spec),
      "export default function " + name + "() {",
      "  const [seats, setSeats] = useState(180);",
      "  const [price, setPrice] = useState(39);",
      "  const [churn, setChurn] = useState(3.5);",
      "  const [cac, setCac] = useState(420);",
      "  const [growth, setGrowth] = useState(7);",
      "  const [grossMargin, setGrossMargin] = useState(82);",
      ...darkStateLine(spec),
      "  const model = useMemo(() => {",
      "    const mrr = seats * price;",
      "    const lifetimeMonths = 100 / Math.max(0.2, churn);",
      "    const ltv = price * (grossMargin / 100) * lifetimeMonths;",
      "    const payback = cac / Math.max(1, price * (grossMargin / 100));",
      "    const projection = [];",
      "    let running = mrr;",
      "    for (let month = 0; month < 12; month += 1) {",
      "      running = running * (1 + growth / 100) * (1 - churn / 100);",
      "      projection.push(running);",
      "    }",
      "    return { mrr, arr: mrr * 12, ltv, ratio: ltv / Math.max(1, cac), payback, projection };",
      "  }, [seats, price, churn, cac, growth, grossMargin]);",
      "",
      "  const series = model.projection;",
      "  const peak = Math.max(...series);",
      "  const healthy = model.ratio >= 3;",
      "",
      "  return (",
      rootDiv(spec),
      ...headerBlock(spec),
      "      <div className=\"grid gap-4 md:grid-cols-4\">",
      "        <Stat label=\"MRR\" value={\"$\" + Math.round(model.mrr).toLocaleString()} />",
      "        <Stat label=\"ARR\" value={\"$\" + Math.round(model.arr).toLocaleString()} />",
      "        <Stat label=\"LTV\" value={\"$\" + Math.round(model.ltv).toLocaleString()} />",
      "        <Stat label=\"LTV : CAC\" value={model.ratio.toFixed(1) + \"x\"} tone={healthy ? \"good\" : \"warn\"} />",
      "      </div>",
      "",
      "      <div className=\"mt-4 grid gap-4 md:grid-cols-2\">",
      "        <section className={card}>",
      '          <Slider label="' + q("מנויים משלמים", "Paying seats") + '" value={seats} min={10} max={2000} step={10} onChange={setSeats} />',
      '          <Slider label="' + q("מחיר למנוי", "Price per seat") + '" value={price} min={5} max={400} step={1} onChange={setPrice} format={(v) => \"$\" + v} />',
      '          <Slider label="' + q("נטישה חודשית", "Monthly churn") + '" value={churn} min={0.5} max={12} step={0.1} onChange={setChurn} format={(v) => v.toFixed(1) + \"%\"} />',
      '          <Slider label="' + q("עלות גיוס לקוח", "CAC") + '" value={cac} min={50} max={3000} step={10} onChange={setCac} format={(v) => \"$\" + v} />',
      '          <Slider label="' + q("צמיחה חודשית", "Monthly growth") + '" value={growth} min={0} max={25} step={0.5} onChange={setGrowth} format={(v) => v + \"%\"} />',
      '          <Slider label="' + q("רווח גולמי", "Gross margin") + '" value={grossMargin} min={40} max={95} step={1} onChange={setGrossMargin} format={(v) => v + \"%\"} />',
      "        </section>",
      "",
      "        <section className={card}>",
      '          <p className="mb-3 text-sm font-medium">' + q("תחזית הכנסות ל-12 חודשים", "12 month MRR projection") + "</p>",
      "          <div className=\"flex h-40 items-end gap-1.5\">",
      "            {series.map((value, index) => (",
      "              <div",
      "                key={index}",
      "                title={\"Month \" + (index + 1) + \": $\" + Math.round(value).toLocaleString()}",
      "                className=\"flex-1 rounded-t transition-all duration-500\"",
      "                style={{ height: Math.max(6, (value / peak) * 100) + \"%\", background: ACCENT, opacity: 0.4 + (index / series.length) * 0.6 }}",
      "              />",
      "            ))}",
      "          </div>",
      "          <p className=\"mt-3 text-sm opacity-70\">",
      "            Payback in {model.payback.toFixed(1)} months · {healthy ? \"unit economics look healthy\" : \"CAC is too high for this price point\"}",
      "          </p>",
      "        </section>",
      "      </div>",
      "    </div>",
      "  );",
      "}",
      "",
      "function Stat({ label, value, tone }) {",
      "  return (",
      "    <div className={card}>",
      "      <p className=\"text-xs uppercase tracking-widest opacity-60\">{label}</p>",
      "      <p className=\"mt-1 text-2xl font-semibold\" style={{ color: tone === \"warn\" ? \"#f59e0b\" : ACCENT }}>",
      "        {value}",
      "      </p>",
      "    </div>",
      "  );",
      "}",
      "",
      "function Slider({ label, value, min, max, step, onChange, format }) {",
      "  return (",
      "    <label className=\"mb-4 block last:mb-0\">",
      "      <span className=\"mb-1 flex items-center justify-between text-sm\">",
      "        <span className=\"opacity-70\">{label}</span>",
      "        <span className=\"font-medium\">{format ? format(value) : value}</span>",
      "      </span>",
      "      <input",
      "        type=\"range\"",
      "        min={min}",
      "        max={max}",
      "        step={step}",
      "        value={value}",
      "        onChange={(event) => onChange(Number(event.target.value))}",
      "        className=\"w-full\"",
      "        style={{ accentColor: ACCENT }}",
      "      />",
      "    </label>",
      "  );",
      "}",
    ].join("\n");
  },

  banking: (spec) => {
    const name = componentName(spec);
    const q = qOf(spec);
    return [
      ...codeHeader(spec, { icons: ["Landmark", "Send", "ArrowDownLeft", "ArrowUpRight", "BarChart3", "Moon", "Sun"] }),
      ...themeLine(spec),
      "const SEED_ACCOUNTS = [",
      '  { id: "checking", name: "' + q("עובר ושב", "Checking") + '", number: "12-441-88210", balance: 18430.5, kind: "cash" },',
      '  { id: "savings", name: "' + q("חיסכון", "Savings") + '", number: "12-441-90077", balance: 62150, kind: "cash" },',
      '  { id: "card", name: "' + q("כרטיס אשראי", "Credit card") + '", number: "•••• 4417", balance: -3820.4, kind: "card" },',
      "];",
      "",
      "const shekel = (value) =>",
      '  (value < 0 ? "-" : "") +',
      '  "₪" +',
      '  Math.abs(Number(value)).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });',
      "",
      "export default function " + name + "() {",
      "  const [accounts, setAccounts] = useState(SEED_ACCOUNTS);",
      '  const [active, setActive] = useState("checking");',
      '  const [flow, setFlow] = useState("all");',
      '  const [query, setQuery] = useState("");',
      '  const [transfer, setTransfer] = useState({ from: "checking", to: "savings", amount: "" });',
      "  const [notice, setNotice] = useState(null);",
      "  const [txs, setTxs] = useState([",
      '    { id: 1, account: "checking", label: "' + q("משכורת חודשית", "Monthly salary") + '", amount: 16200, date: "01/08", kind: "in" },',
      '    { id: 2, account: "checking", label: "' + q("שכר דירה", "Rent") + '", amount: -4200, date: "02/08", kind: "out" },',
      '    { id: 3, account: "card", label: "' + q("תדלוק", "Fuel") + '", amount: -310, date: "03/08", kind: "out" },',
      "  ]);",
      ...darkStateLine(spec),
      "  const byId = (id) => accounts.find((account) => account.id === id);",
      "  const netWorth = accounts.reduce((sum, account) => sum + account.balance, 0);",
      "",
      "  const visible = useMemo(",
      "    () =>",
      "      txs",
      "        .filter((tx) => tx.account === active)",
      '        .filter((tx) => (flow === "all" ? true : tx.kind === flow))',
      "        .filter((tx) => tx.label.toLowerCase().includes(query.trim().toLowerCase())),",
      "    [txs, active, flow, query]",
      "  );",
      "",
      "  const series = [14200, 14840, 15480, 16120, 16760, 17400];",
      "  const peak = Math.max(...series);",
      "",
      "  const send = () => {",
      "    const amount = Number(transfer.amount);",
      "    const from = byId(transfer.from);",
      "    const to = byId(transfer.to);",
      "    if (!from || !to || from.id === to.id) {",
      '      setNotice({ ok: false, text: "' + q("בחרו שני חשבונות שונים", "Pick two different accounts") + '" });',
      "      return;",
      "    }",
      "    if (!(amount > 0)) {",
      '      setNotice({ ok: false, text: "' + q("הזינו סכום גדול מאפס", "Enter an amount above zero") + '" });',
      "      return;",
      "    }",
      '    if (from.kind === "cash" && from.balance < amount) {',
      '      setNotice({ ok: false, text: "' + q("אין מספיק יתרה", "Not enough balance") + '" });',
      "      return;",
      "    }",
      "    setAccounts((list) =>",
      "      list.map((account) => {",
      "        if (account.id === from.id) return { ...account, balance: account.balance - amount };",
      "        if (account.id === to.id) return { ...account, balance: account.balance + amount };",
      "        return account;",
      "      })",
      "    );",
      "    setTxs((list) => [",
      '      { id: Date.now(), account: to.id, label: "' + q("העברה נכנסת", "Incoming transfer") + '", amount, date: "04/08", kind: "in" },',
      '      { id: Date.now() + 1, account: from.id, label: "' + q("העברה יוצאת", "Outgoing transfer") + '", amount: -amount, date: "04/08", kind: "out" },',
      "      ...list,",
      "    ]);",
      '    setTransfer({ ...transfer, amount: "" });',
      '    setNotice({ ok: true, text: shekel(amount) + " ' + q("הועברו בהצלחה", "transferred") + '" });',
      "  };",
      "",
      "  return (",
      rootDiv(spec),
      ...headerBlock(spec),
      "      <section className={card}>",
      '        <p className="text-xs uppercase tracking-widest opacity-60">' + q("יתרה כוללת", "Total balance") + "</p>",
      '        <p className="mt-1 text-4xl font-semibold" style={{ color: ACCENT }}>',
      "          <bdi>{shekel(netWorth)}</bdi>",
      "        </p>",
      "      </section>",
      "",
      '      <div className="mt-4 grid gap-3 sm:grid-cols-3">',
      "        {accounts.map((account) => (",
      "          <button",
      "            key={account.id}",
      "            onClick={() => setActive(account.id)}",
      '            className={card + " text-start"}',
      "            style={active === account.id ? { outline: \"2px solid \" + ACCENT } : undefined}",
      "          >",
      '            <span className="text-sm font-medium">{account.name}</span>',
      '            <bdi className="mt-1 block text-lg font-semibold">{shekel(account.balance)}</bdi>',
      '            <bdi className="block font-mono text-[11px] opacity-60">{account.number}</bdi>',
      "          </button>",
      "        ))}",
      "      </div>",
      "",
      '      <section className={card + " mt-4"}>',
      "        <input",
      "          className={input}",
      "          value={query}",
      '          placeholder="' + q("חיפוש בתנועות…", "Search transactions…") + '"',
      "          onChange={(event) => setQuery(event.target.value)}",
      "        />",
      '        <ul className="mt-3 space-y-2">',
      "          {visible.map((tx) => (",
      '            <li key={tx.id} className="flex items-center gap-3 rounded-lg border border-current/10 p-3">',
      '              <span className="grid h-8 w-8 place-items-center rounded-full border border-current/15">',
      "                {tx.kind === \"in\" ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}",
      "              </span>",
      '              <span className="min-w-0 flex-1">',
      '                <span className="block truncate text-sm">{tx.label}</span>',
      '                <bdi className="block text-[11px] opacity-60">{tx.date}</bdi>',
      "              </span>",
      '              <bdi className="text-sm font-semibold tabular-nums">{shekel(tx.amount)}</bdi>',
      "            </li>",
      "          ))}",
      "        </ul>",
      "      </section>",
      "",
      '      <section className={card + " mt-4"}>',
      '        <p className="mb-3 text-sm font-medium">' + q("העברה בין חשבונות", "Transfer between accounts") + "</p>",
      "        <select className={input} value={transfer.from} onChange={(event) => setTransfer({ ...transfer, from: event.target.value })}>",
      "          {accounts.map((account) => (",
      "            <option key={account.id} value={account.id}>{account.name}</option>",
      "          ))}",
      "        </select>",
      "        <select",
      '          className={input + " mt-2"}',
      "          value={transfer.to}",
      "          onChange={(event) => setTransfer({ ...transfer, to: event.target.value })}",
      "        >",
      "          {accounts.map((account) => (",
      "            <option key={account.id} value={account.id}>{account.name}</option>",
      "          ))}",
      "        </select>",
      "        <input",
      '          type="number"',
      '          className={input + " mt-2"}',
      "          value={transfer.amount}",
      '          placeholder="0.00"',
      "          onChange={(event) => setTransfer({ ...transfer, amount: event.target.value })}",
      "        />",
      '        <button onClick={send} className="mt-3 w-full py-2" style={{ background: ACCENT, color: "#fff" }}>',
      "          <Send size={14} /> " + q("בצעו העברה", "Send transfer"),
      "        </button>",
      "        {notice ? (",
      '          <p className="mt-2 text-xs font-medium" role="status" style={{ color: notice.ok ? "#0ca30c" : "#d03b3b" }}>',
      "            {notice.text}",
      "          </p>",
      "        ) : null}",
      "      </section>",
      ...chartBlock(spec, q("תזרים חודשי", "Monthly cash flow")),
      "    </div>",
      "  );",
      "}",
    ].join("\n");
  },

  landing: (spec) => {
    const name = componentName(spec);
    const q = qOf(spec);
    return [
      ...codeHeader(spec, { icons: ["PanelsTopLeft", "Download", "Copy", "Moon", "Sun"] }),
      ...themeLine(spec),
      "// The generated page is a standalone HTML document — no framework, no host.",
      "const buildPage = (biz, accent) => `<!DOCTYPE html>",
      '<html lang="' + q("he", "en") + '" dir="' + q("rtl", "ltr") + '">',
      '<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">',
      "<title>${biz.name}</title>",
      "<style>",
      "  body { margin:0; font-family:" + q("'Noto Sans Hebrew',Arial,sans-serif", "Inter,system-ui,sans-serif") + "; color:#14161a; }",
      "  .hero { background:linear-gradient(160deg, ${accent}, #0b0c10 130%); color:#fff; padding:80px 20px; }",
      "  .wrap { max-width:1080px; margin:0 auto; }",
      "  .grid { display:grid; gap:18px; grid-template-columns:repeat(auto-fit,minmax(240px,1fr)); padding:56px 20px; }",
      "  .card { border:1px solid #e6e8ec; border-radius:16px; padding:24px; }",
      "  .cta { display:inline-block; background:#fff; color:${accent}; font-weight:700; padding:14px 30px; border-radius:999px; text-decoration:none; }",
      "</style></head>",
      "<body>",
      '  <header class="hero"><div class="wrap"><h1>${biz.name}</h1><p>${biz.tagline}</p>',
      '  <a class="cta" href="tel:${biz.phone}">${biz.cta}</a></div></header>',
      '  <main class="wrap grid">',
      "    ${biz.services",
      "      .filter((service) => service.name)",
      '      .map((service) => `<article class="card"><h3>${service.name}</h3><p>${service.detail}</p><p>${service.price}</p></article>`)',
      '      .join("")}',
      "  </main>",
      "  <footer><p><bdi>${biz.phone}</bdi> · <bdi>${biz.email}</bdi> · ${biz.address}</p></footer>",
      "</body></html>`;",
      "",
      "export default function " + name + "() {",
      "  const [biz, setBiz] = useState({",
      '    name: "' + q("מספרת אבי", "Avi's Barbershop") + '",',
      '    tagline: "' + q("תספורת מדויקת, בלי להמתין בתור", "A sharp cut, with no waiting around") + '",',
      '    phone: "' + q("052-1234567", "+1 555 0134") + '",',
      '    email: "hello@example.com",',
      '    address: "' + q("הרצל 24, תל אביב", "24 High Street, Bristol") + '",',
      '    cta: "' + q("קבעו תור עכשיו", "Book now") + '",',
      "    services: [",
      '      { name: "' + q("תספורת גברים", "Men\\u2019s cut") + '", detail: "' + q("כולל שטיפה", "Includes wash") + '", price: "' + q("₪80", "$28") + '" },',
      '      { name: "' + q("עיצוב זקן", "Beard trim") + '", detail: "' + q("קווים חדים", "Sharp lines") + '", price: "' + q("₪50", "$18") + '" },',
      "    ],",
      "  });",
      ...darkStateLine(spec),
      "  const html = useMemo(() => buildPage(biz, ACCENT), [biz]);",
      "  const set = (key, value) => setBiz((current) => ({ ...current, [key]: value }));",
      "",
      "  const download = () => {",
      '    const blob = new Blob([html], { type: "text/html;charset=utf-8" });',
      "    const url = URL.createObjectURL(blob);",
      '    const anchor = document.createElement("a");',
      "    anchor.href = url;",
      '    anchor.download = "landing.html";',
      "    anchor.click();",
      "    URL.revokeObjectURL(url);",
      "  };",
      "",
      "  return (",
      rootDiv(spec),
      ...headerBlock(spec),
      "      <section className={card}>",
      '        <div className="grid gap-3 sm:grid-cols-2">',
      '          {["name", "tagline", "phone", "email", "address", "cta"].map((key) => (',
      '            <label key={key} className="block">',
      '              <span className="mb-1 block text-[11px] uppercase tracking-wider opacity-60">{key}</span>',
      "              <input className={input} value={biz[key]} onChange={(event) => set(key, event.target.value)} />",
      "            </label>",
      "          ))}",
      "        </div>",
      '        <button onClick={download} className="mt-3 px-4 py-2" style={{ background: ACCENT, color: "#fff" }}>',
      "          <Download size={14} /> " + q("הורדת הדף", "Download page"),
      "        </button>",
      "      </section>",
      "",
      "      <iframe",
      '        title="' + q("תצוגת דף הנחיתה", "Landing page preview") + '"',
      "        srcDoc={html}",
      '        className="mt-4 h-[520px] w-full rounded-xl border-0 bg-white"',
      '        sandbox="allow-same-origin"',
      "      />",
      "    </div>",
      "  );",
      "}",
    ].join("\n");
  },

  booking: (spec) => {
    const name = componentName(spec);
    const q = qOf(spec);
    return [
      ...codeHeader(spec, { icons: ["CalendarClock", "Trash2", "BarChart3", "Moon", "Sun"] }),
      ...themeLine(spec),
      "const SERVICES = [",
      '  { id: "cut", name: "' + q("תספורת", "Haircut") + '", minutes: 30, price: 80 },',
      '  { id: "beard", name: "' + q("עיצוב זקן", "Beard trim") + '", minutes: 20, price: 50 },',
      '  { id: "combo", name: "' + q("תספורת + זקן", "Cut + beard") + '", minutes: 45, price: 120 },',
      "];",
      "",
      'const SLOTS = ["09:00", "09:45", "10:30", "11:15", "12:00", "13:30", "14:15", "15:00", "15:45", "16:30"];',
      "const DAY_NAMES = [" + q('"א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"', '"Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"') + "];",
      "",
      "// Local calendar date — toISOString() would shift the day east of Greenwich.",
      "const dayKey = (date) =>",
      '  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;',
      "",
      "export default function " + name + "() {",
      "  const days = useMemo(() => {",
      "    const today = new Date();",
      "    return Array.from({ length: 7 }, (_, offset) => {",
      "      const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset);",
      "      return {",
      "        key: dayKey(date),",
      "        dayName: DAY_NAMES[date.getDay()],",
      "        dayNum: date.getDate(),",
      "        closed: date.getDay() === 6,",
      "      };",
      "    });",
      "  }, []);",
      "",
      "  const [service, setService] = useState(SERVICES[0].id);",
      "  const [day, setDay] = useState(days[0].key);",
      '  const [customer, setCustomer] = useState("");',
      "  const [bookings, setBookings] = useState([]);",
      ...darkStateLine(spec),
      "  const selectedDay = days.find((item) => item.key === day) || days[0];",
      "  const dayBookings = bookings.filter((booking) => booking.day === day);",
      "  const taken = new Set(dayBookings.map((booking) => booking.time));",
      "  const revenue = dayBookings.reduce((sum, booking) => {",
      "    const found = SERVICES.find((item) => item.id === booking.service);",
      "    return sum + (found ? found.price : 0);",
      "  }, 0);",
      "",
      "  const series = days.map((item) => bookings.filter((booking) => booking.day === item.key).length);",
      "  const peak = Math.max(1, ...series);",
      "",
      "  const book = (time) => {",
      "    if (taken.has(time) || selectedDay.closed) return;",
      "    setBookings((list) => [",
      "      ...list,",
      '      { id: Date.now(), day, time, service, customer: customer.trim() || "' + q("לקוח חדש", "New customer") + '" },',
      "    ]);",
      '    setCustomer("");',
      "  };",
      "",
      "  return (",
      rootDiv(spec),
      ...headerBlock(spec),
      '      <div className="grid gap-4 sm:grid-cols-2">',
      "        <div className={card}>",
      '          <p className="text-xs uppercase tracking-widest opacity-60">' + q("תורים ביום הנבחר", "Bookings on this day") + "</p>",
      '          <p className="mt-1 text-2xl font-semibold" style={{ color: ACCENT }}>{dayBookings.length}</p>',
      "        </div>",
      "        <div className={card}>",
      '          <p className="text-xs uppercase tracking-widest opacity-60">' + q("הכנסה צפויה", "Expected revenue") + "</p>",
      '          <bdi className="mt-1 block text-2xl font-semibold" style={{ color: ACCENT }}>{"₪" + revenue}</bdi>',
      "        </div>",
      "      </div>",
      "",
      '      <section className={card + " mt-4"}>',
      '        <div className="flex flex-wrap gap-2">',
      "          {SERVICES.map((item) => (",
      "            <button",
      "              key={item.id}",
      "              onClick={() => setService(item.id)}",
      '              className="rounded-lg border border-current/15 px-3 py-2 text-start text-sm"',
      '              style={service === item.id ? { background: ACCENT, color: "#fff" } : undefined}',
      "            >",
      '              <span className="block font-medium">{item.name}</span>',
      '              <bdi className="block text-[11px] opacity-75">{item.minutes} ' + q("דק׳", "min") + ' · {"₪" + item.price}</bdi>',
      "            </button>",
      "          ))}",
      "        </div>",
      "",
      '        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">',
      "          {days.map((item) => (",
      "            <button",
      "              key={item.key}",
      "              onClick={() => setDay(item.key)}",
      '              className="min-w-[64px] shrink-0 rounded-lg border border-current/15 px-3 py-2 text-center"',
      '              style={day === item.key ? { background: ACCENT, color: "#fff" } : undefined}',
      "            >",
      '              <span className="block text-[11px]">{item.dayName}</span>',
      '              <bdi className="block text-lg font-semibold">{item.dayNum}</bdi>',
      "            </button>",
      "          ))}",
      "        </div>",
      "",
      "        {selectedDay.closed ? (",
      '          <p className="mt-4 border border-dashed border-current/20 p-6 text-center text-sm opacity-60">',
      "            " + q("העסק סגור ביום זה", "Closed on this day"),
      "          </p>",
      "        ) : (",
      '          <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5">',
      "            {SLOTS.map((time) => (",
      "              <button",
      "                key={time}",
      "                disabled={taken.has(time)}",
      "                onClick={() => book(time)}",
      '                className="rounded-lg border border-current/15 px-2 py-2 text-sm tabular-nums disabled:opacity-40 disabled:line-through"',
      "              >",
      "                <bdi>{time}</bdi>",
      "              </button>",
      "            ))}",
      "          </div>",
      "        )}",
      "",
      "        <input",
      '          className={input + " mt-3"}',
      "          value={customer}",
      '          placeholder="' + q("שם הלקוח", "Customer name") + '"',
      "          onChange={(event) => setCustomer(event.target.value)}",
      "        />",
      "      </section>",
      "",
      '      <section className={card + " mt-4"}>',
      '        <ul className="space-y-2">',
      "          {dayBookings",
      "            .slice()",
      "            .sort((a, b) => a.time.localeCompare(b.time))",
      "            .map((booking) => (",
      '              <li key={booking.id} className="flex items-center gap-3 rounded-lg border border-current/10 p-3">',
      '                <bdi className="text-sm font-semibold" style={{ color: ACCENT }}>{booking.time}</bdi>',
      '                <span className="flex-1 truncate text-sm">{booking.customer}</span>',
      "                <button onClick={() => setBookings((list) => list.filter((entry) => entry.id !== booking.id))}>",
      "                  <Trash2 size={14} />",
      "                </button>",
      "              </li>",
      "            ))}",
      "        </ul>",
      "      </section>",
      ...chartBlock(spec, q("תורים לפי יום", "Bookings per day")),
      "    </div>",
      "  );",
      "}",
    ].join("\n");
  },

  budget: (spec) => {
    const name = componentName(spec);
    const he = spec.lang === "he";
    const q = (hebrew, english) => (he ? hebrew : english);
    return [
      ...codeHeader(spec, { icons: ["Wallet", "Plus", "Trash2", "BarChart3", "Moon", "Sun"] }),
      ...themeLine(spec),
      "const CATEGORIES = [",
      '  { id: "housing", label: "' + q("דיור", "Housing") + '", color: "#8b5cf6" },',
      '  { id: "food", label: "' + q("מזון", "Food") + '", color: "#22c55e" },',
      '  { id: "transport", label: "' + q("תחבורה", "Transport") + '", color: "#0ea5e9" },',
      '  { id: "fun", label: "' + q("פנאי", "Leisure") + '", color: "#f59e0b" },',
      '  { id: "bills", label: "' + q("חשבונות", "Bills") + '", color: "#ef4444" },',
      "];",
      "",
      "export default function " + name + "() {",
      "  const [income, setIncome] = useState(14500);",
      "  const [budget, setBudget] = useState(9000);",
      "  const [entries, setEntries] = useState([",
      '    { id: 1, label: "' + q("שכר דירה", "Rent") + '", amount: 4200, category: "housing" },',
      '    { id: 2, label: "' + q("קניות בסופר", "Groceries") + '", amount: 1850, category: "food" },',
      '    { id: 3, label: "' + q("דלק וחניה", "Fuel & parking") + '", amount: 720, category: "transport" },',
      "  ]);",
      '  const [draft, setDraft] = useState({ label: "", amount: "", category: "food" });',
      ...darkStateLine(spec),
      "  const spent = entries.reduce((sum, entry) => sum + Number(entry.amount || 0), 0);",
      "  const balance = income - spent;",
      "  const budgetUsed = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;",
      "  const overBudget = spent > budget;",
      "",
      "  const byCategory = useMemo(",
      "    () =>",
      "      CATEGORIES.map((category) => ({",
      "        ...category,",
      "        total: entries",
      "          .filter((entry) => entry.category === category.id)",
      "          .reduce((sum, entry) => sum + Number(entry.amount || 0), 0),",
      "      })).filter((category) => category.total > 0),",
      "    [entries]",
      "  );",
      "",
      "  const series = byCategory.map((category) => category.total);",
      "  const peak = Math.max(1, ...series);",
      "",
      "  const addEntry = () => {",
      "    const label = draft.label.trim();",
      "    const amount = Number(draft.amount);",
      "    if (!label || !(amount > 0)) return;",
      "    setEntries((list) => [{ id: Date.now(), label, amount, category: draft.category }, ...list]);",
      '    setDraft({ label: "", amount: "", category: draft.category });',
      "  };",
      "",
      "  return (",
      '    <div className={shell + " min-h-full p-6"}' + (he ? ' dir="rtl" lang="he"' : "") + ">",
      ...headerBlock(spec),
      '      <div className="grid gap-4 sm:grid-cols-3">',
      '        <Stat label="' + q("הכנסה חודשית", "Monthly income") + '" value={"₪" + income.toLocaleString()} />',
      '        <Stat label="' + q("סך ההוצאות", "Total spent") + '" value={"₪" + spent.toLocaleString()} />',
      '        <Stat label="' + q("יתרה", "Balance") + '" value={"₪" + balance.toLocaleString()} tone={balance < 0 ? "warn" : undefined} />',
      "      </div>",
      "",
      '      <section className={card + " mt-4"}>',
      '        <div className="grid gap-2 sm:grid-cols-[1fr_120px_auto]">',
      "          <input",
      "            className={input}",
      "            value={draft.label}",
      '            placeholder="' + q("על מה הוצאת?", "What did you spend on?") + '"',
      "            onChange={(event) => setDraft({ ...draft, label: event.target.value })}",
      '            onKeyDown={(event) => event.key === "Enter" && addEntry()}',
      "          />",
      "          <input",
      '            type="number"',
      "            className={input}",
      "            value={draft.amount}",
      '            placeholder="' + q("סכום", "Amount") + '"',
      "            onChange={(event) => setDraft({ ...draft, amount: event.target.value })}",
      "          />",
      '          <button onClick={addEntry} className="px-4" style={{ background: ACCENT, color: "#fff" }}>',
      "            <Plus size={16} />",
      "          </button>",
      "        </div>",
      "",
      '        <div className="mt-2.5 flex flex-wrap gap-1.5">',
      "          {CATEGORIES.map((category) => (",
      "            <button",
      "              key={category.id}",
      "              onClick={() => setDraft({ ...draft, category: category.id })}",
      '              className="rounded-full border border-current/15 px-2.5 py-1 text-xs"',
      '              style={draft.category === category.id ? { background: hue(category), color: "#fff" } : undefined}',
      "            >",
      "              {category.label}",
      "            </button>",
      "          ))}",
      "        </div>",
      "",
      '        <ul className="mt-4 space-y-2">',
      "          {entries.map((entry) => {",
      "            const category = CATEGORIES.find((item) => item.id === entry.category) || CATEGORIES[4];",
      "            return (",
      '              <li key={entry.id} className="flex items-center gap-3 rounded-lg border border-current/10 p-3">',
      '                <span className="h-8 w-1 rounded-full" style={{ background: category.color }} />',
      '                <span className="min-w-0 flex-1">',
      '                  <span className="block truncate text-sm">{entry.label}</span>',
      '                  <span className="block text-[11px] opacity-60">{category.label}</span>',
      "                </span>",
      '                <bdi className="text-sm font-semibold tabular-nums">{"₪" + Number(entry.amount).toLocaleString()}</bdi>',
      "                <button onClick={() => setEntries((list) => list.filter((row) => row.id !== entry.id))}>",
      "                  <Trash2 size={14} />",
      "                </button>",
      "              </li>",
      "            );",
      "          })}",
      "        </ul>",
      "      </section>",
      "",
      '      <section className={card + " mt-4"}>',
      '        <p className="mb-1.5 flex items-center justify-between text-xs opacity-70">',
      "          <span>" + q("ניצול התקציב", "Budget used") + "</span>",
      "          <bdi>{Math.round(budgetUsed)}%</bdi>",
      "        </p>",
      '        <div className="h-2 w-full overflow-hidden rounded-full bg-current/10">',
      "          <div",
      '            className="h-full rounded-full transition-all duration-500"',
      '            style={{ width: budgetUsed + "%", background: overBudget ? "#ef4444" : ACCENT }}',
      "          />",
      "        </div>",
      "      </section>",
      ...chartBlock(spec, q("פילוח לפי קטגוריה", "Breakdown by category")),
      "    </div>",
      "  );",
      "}",
      "",
      "function Stat({ label, value, tone }) {",
      "  return (",
      "    <div className={card}>",
      '      <p className="text-xs uppercase tracking-widest opacity-60">{label}</p>',
      '      <p className="mt-1 text-2xl font-semibold" style={{ color: tone === "warn" ? "#f59e0b" : ACCENT }}>',
      "        <bdi>{value}</bdi>",
      "      </p>",
      "    </div>",
      "  );",
      "}",
    ].join("\n");
  },

  tracker: (spec) => {
    const name = componentName(spec);
    const q = qOf(spec);
    return [
      ...codeHeader(spec, { icons: ["ListChecks", "Plus", "Trash2", "BarChart3", "Moon", "Sun"] }),
      ...themeLine(spec),
      "const FILTERS = [" + q('"הכול", "פתוחות", "הושלמו"', '"all", "active", "done"') + "];",
      "",
      "export default function " + name + "() {",
      "  const [items, setItems] = useState([",
      '    { id: 1, label: "' + q("לאמת את הרעיון מול 5 משתמשים", "Validate the idea with 5 users") + '", done: true },',
      '    { id: 2, label: "' + q("לשרטט את הזרימה המרכזית", "Sketch the core flow") + '", done: false },',
      '    { id: 3, label: "' + q("להעלות דף נחיתה", "Ship the landing page") + '", done: false },',
      "  ]);",
      '  const [draft, setDraft] = useState("");',
      "  const [filter, setFilter] = useState(FILTERS[0]);",
      ...darkStateLine(spec),
      "  const done = items.filter((item) => item.done).length;",
      "  const percent = items.length ? Math.round((done / items.length) * 100) : 0;",
      "  const visible = items.filter((item) =>",
      "    filter === FILTERS[0] ? true : filter === FILTERS[2] ? item.done : !item.done",
      "  );",
      "  const series = [2, 4, 3, 5, done + 1, 6, done + 2];",
      "  const peak = Math.max(...series);",
      "",
      "  const add = () => {",
      "    const label = draft.trim();",
      "    if (!label) return;",
      "    setItems((list) => [{ id: Date.now(), label, done: false }, ...list]);",
      "    setDraft(\"\");",
      "  };",
      "",
      "  return (",
      rootDiv(spec),
      ...headerBlock(spec),
      "      <div className=\"grid gap-4 md:grid-cols-[1fr_220px]\">",
      "        <section className={card}>",
      "          <div className=\"flex gap-2\">",
      "            <input",
      "              className={input}",
      "              value={draft}",
      '              placeholder="' + q("מה צריך לעשות?", "What needs doing?") + '"',
      "              onChange={(event) => setDraft(event.target.value)}",
      "              onKeyDown={(event) => event.key === \"Enter\" && add()}",
      "            />",
      "            <button onClick={add} className=\"shrink-0 px-4\" style={{ background: ACCENT, color: \"#fff\" }}>",
      "              <Plus size={16} />",
      "            </button>",
      "          </div>",
      "",
      "          <div className=\"mt-3 flex gap-2\">",
      "            {FILTERS.map((value) => (",
      "              <button",
      "                key={value}",
      "                onClick={() => setFilter(value)}",
      "                className=\"rounded-full border border-current/15 px-3 py-1 text-xs capitalize\"",
      "                style={filter === value ? { background: ACCENT, color: \"#fff\", borderColor: ACCENT } : undefined}",
      "              >",
      "                {value}",
      "              </button>",
      "            ))}",
      "          </div>",
      "",
      "          <ul className=\"mt-4 space-y-2\">",
      "            {visible.map((item) => (",
      "              <li key={item.id} className=\"flex items-center gap-3 rounded-lg border border-current/10 p-3\">",
      "                <input",
      "                  type=\"checkbox\"",
      "                  checked={item.done}",
      "                  onChange={() => setItems((list) => list.map((row) => (row.id === item.id ? { ...row, done: !row.done } : row)))}",
      "                  style={{ accentColor: ACCENT }}",
      "                />",
      "                <span className={item.done ? \"flex-1 text-sm line-through opacity-50\" : \"flex-1 text-sm\"}>{item.label}</span>",
      "                <button onClick={() => setItems((list) => list.filter((row) => row.id !== item.id))}>",
      "                  <Trash2 size={14} />",
      "                </button>",
      "              </li>",
      "            ))}",
      "          </ul>",
      "        </section>",
      "",
      "        <aside className={card + \" grid place-items-center text-center\"}>",
      "          <svg viewBox=\"0 0 120 120\" className=\"h-32 w-32 -rotate-90\">",
      "            <circle cx=\"60\" cy=\"60\" r=\"52\" fill=\"none\" strokeWidth=\"10\" stroke=\"currentColor\" opacity=\"0.12\" />",
      "            <circle",
      "              cx=\"60\"",
      "              cy=\"60\"",
      "              r=\"52\"",
      "              fill=\"none\"",
      "              strokeWidth=\"10\"",
      "              strokeLinecap=\"round\"",
      "              stroke={ACCENT}",
      "              strokeDasharray={2 * Math.PI * 52}",
      "              strokeDashoffset={2 * Math.PI * 52 * (1 - percent / 100)}",
      "              className=\"transition-all duration-700\"",
      "            />",
      "          </svg>",
      "          <p className=\"text-3xl font-semibold\">{percent}%</p>",
      "          <p className=\"text-sm opacity-60\">{done} of {items.length} complete</p>",
      "        </aside>",
      "      </div>",
      ...chartBlock(spec, "Completions this week"),
      "    </div>",
      "  );",
      "}",
    ].join("\n");
  },
};

const buildCode = (spec) => (CODE_BUILDERS[spec.appId] || CODE_BUILDERS.tracker)(spec);

/* ==================================================================
   5. Syntax highlighter
   ==================================================================
   A deliberately small tokenizer: one alternation pass per line, each
   capture group mapped to a colour. Line-scoped so the gutter, the diff
   markers and virtual scrolling all stay trivial.
   ================================================================== */

const TOKEN_RE = new RegExp(
  [
    "(\\/\\/.*)", // 1 comment
    "(`[^`]*`|'(?:\\\\.|[^'\\\\])*'|\"(?:\\\\.|[^\"\\\\])*\")", // 2 string
    "\\b(import|from|export|default|const|let|var|function|return|if|else|for|while|new|await|async|class|extends|try|catch|typeof|instanceof|in|of|null|undefined|true|false)\\b", // 3 keyword
    "(<\\/?[A-Za-z][\\w.]*)", // 4 jsx tag
    "\\b(\\d[\\d_.]*)\\b", // 5 number
    "\\b([A-Z][A-Za-z0-9]*)\\b", // 6 constructor / component
  ].join("|"),
  "g"
);

const TOKEN_CLASS = [
  "text-slate-500 italic",
  "text-emerald-300",
  "text-fuchsia-300",
  "text-sky-300",
  "text-amber-300",
  "text-cyan-200",
];

const highlightLine = (line) => {
  const output = [];
  let cursor = 0;
  let match;
  TOKEN_RE.lastIndex = 0;
  while ((match = TOKEN_RE.exec(line)) !== null) {
    if (match.index > cursor) output.push({ text: line.slice(cursor, match.index), cls: "" });
    const groupIndex = match.slice(1).findIndex((value) => value !== undefined);
    output.push({ text: match[0], cls: TOKEN_CLASS[groupIndex] || "" });
    cursor = match.index + match[0].length;
    if (match[0].length === 0) TOKEN_RE.lastIndex += 1;
  }
  if (cursor < line.length) output.push({ text: line.slice(cursor), cls: "" });
  return output;
};

function CodeViewer({ code, changed }) {
  const lines = useMemo(() => code.split("\n"), [code]);
  const changedSet = useMemo(() => new Set(changed || []), [changed]);

  return (
    <pre className="min-h-full overflow-auto p-4 font-mono text-[12.5px] leading-[1.65] text-slate-300">
      <code className="block">
        {lines.map((line, index) => {
          const isChanged = line.trim().length > 0 && changedSet.has(line);
          return (
            <div
              key={index}
              className={cx(
                "group flex gap-4 whitespace-pre rounded px-2 -mx-2 transition-colors",
                isChanged ? "bg-emerald-400/10 shadow-[inset_2px_0_0_0_rgba(52,211,153,0.9)]" : "hover:bg-white/[0.03]"
              )}
            >
              <span className="w-8 shrink-0 select-none text-right text-slate-600 tabular-nums">{index + 1}</span>
              <span className="flex-1">
                {highlightLine(line).map((token, tokenIndex) => (
                  <span key={tokenIndex} className={token.cls}>
                    {token.text}
                  </span>
                ))}
                {line.length === 0 ? " " : null}
              </span>
            </div>
          );
        })}
      </code>
    </pre>
  );
}

/* ==================================================================
   6. Preview primitives — themed building blocks for generated apps
   ================================================================== */

const ThemeCtx = createContext(STYLES[0]);
const useT = () => useContext(ThemeCtx);

/**
 * Generated apps speak the language of the prompt. `L("עברית", "English")`
 * picks the right string; the preview root sets dir="rtl" so the bidi
 * algorithm — not manual alignment — lays Hebrew out correctly.
 */
const LangCtx = createContext("en");
const useL = () => {
  const lang = useContext(LangCtx);
  return (he, en) => (lang === "he" ? he : en);
};
const useIsHe = () => useContext(LangCtx) === "he";

/** Categorical slots stepped for whichever surface the preview is currently on. */
const useSeries = () => {
  const t = useT();
  return t.dark ? SERIES_DARK : SERIES_LIGHT;
};

function Card({ className, children, ...rest }) {
  const t = useT();
  return (
    <div className={cx(t.surface, "p-[var(--pad)]", className)} {...rest}>
      {children}
    </div>
  );
}

function Slider({ label, value, min, max, step = 1, onChange, format }) {
  const t = useT();
  return (
    <label className="mb-4 block last:mb-0">
      <span className="mb-1.5 flex items-center justify-between text-sm">
        <span className={t.muted}>{label}</span>
        <span className="font-semibold tabular-nums">{format ? format(value) : value}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full outline-none"
        style={{
          accentColor: "var(--a)",
          background: `linear-gradient(90deg, var(--a) ${((value - min) / (max - min)) * 100}%, currentColor ${
            ((value - min) / (max - min)) * 100
          }%)`,
          color: "rgba(128,128,128,0.25)",
        }}
      />
    </label>
  );
}

function Stat({ label, value, hint, tone }) {
  const t = useT();
  return (
    <Card>
      <p className={cx("text-[10px] font-semibold uppercase tracking-[0.14em]", t.faint)}>{label}</p>
      <p
        className="mt-1 text-2xl font-semibold tabular-nums"
        style={{ color: tone === "warn" ? STATUS.warning : tone === "plain" ? undefined : "var(--a)" }}
      >
        {value}
      </p>
      {hint ? <p className={cx("mt-1 text-xs", t.muted)}>{hint}</p> : null}
    </Card>
  );
}

function PreviewButton({ children, onClick, variant = "solid", className, title }) {
  const t = useT();
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cx(
        "inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium transition active:scale-[0.98]",
        variant === "solid" ? t.btn : t.btnGhost,
        className
      )}
    >
      {children}
    </button>
  );
}

function MiniBars({ data, label, caption }) {
  const t = useT();
  const peak = Math.max(1, ...data.map((point) => point.value));
  return (
    <Card className="mt-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-medium">
        <BarChart3 size={15} style={{ color: "var(--a)" }} />
        {label}
      </div>
      <div className="flex h-28 items-end gap-1.5">
        {data.map((point, index) => (
          <div key={index} className="group flex flex-1 flex-col items-center gap-1.5">
            <div
              className="w-full rounded-t transition-all duration-500 ease-out"
              style={{
                height: `${clamp((point.value / peak) * 100, 4, 100)}%`,
                background: "var(--a)",
                opacity: 0.35 + (index / Math.max(1, data.length - 1)) * 0.65,
              }}
              title={`${point.label}: ${point.display || Math.round(point.value)}`}
            />
            <span className={cx("text-[9px] tabular-nums", t.faint)}>{point.label}</span>
          </div>
        ))}
      </div>
      {caption ? <p className={cx("mt-3 text-xs", t.muted)}>{caption}</p> : null}
    </Card>
  );
}

function AppHeader({ spec, dark, onToggleDark }) {
  const t = useT();
  const L = useL();
  if (!spec.showHeader) return null;
  return (
    <header className="mb-5 flex items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className={cx("text-xl font-semibold tracking-tight", t.heading)}>{spec.title}</h1>
        <p className={cx("mt-0.5 text-sm", t.muted)}>{spec.subtitle}</p>
      </div>
      {spec.darkToggle ? (
        <button
          type="button"
          onClick={onToggleDark}
          aria-label={L("החלפת מצב כהה", "Toggle dark mode")}
          className={cx("grid h-9 w-9 shrink-0 place-items-center transition", t.btnGhost)}
        >
          {dark ? <Sun size={15} /> : <Moon size={15} />}
        </button>
      ) : null}
    </header>
  );
}

/* ==================================================================
   7. The generated apps — all fully interactive
   ================================================================== */

function RateCalculatorApp({ spec, dark, onToggleDark }) {
  const t = useT();
  const L = useL();
  const palette = useSeries();
  const [income, setIncome] = useState(120000);
  const [expenses, setExpenses] = useState(18000);
  const [hoursPerWeek, setHoursPerWeek] = useState(25);
  const [weeksOff, setWeeksOff] = useState(6);
  const [taxRate, setTaxRate] = useState(28);
  const [margin, setMargin] = useState(15);
  const [projectHours, setProjectHours] = useState(40);

  const result = useMemo(() => {
    const billableHours = Math.max(1, (52 - weeksOff) * hoursPerWeek);
    const preTax = income / Math.max(0.05, 1 - taxRate / 100);
    const revenue = (preTax + expenses) * (1 + margin / 100);
    const hourly = revenue / billableHours;
    return {
      billableHours,
      revenue,
      hourly,
      daily: hourly * 8,
      project: hourly * projectHours,
      tax: preTax - income,
      profit: revenue - preTax - expenses,
    };
  }, [income, expenses, hoursPerWeek, weeksOff, taxRate, margin, projectHours]);

  const breakdown = [
    { label: L("נטו לכיס", "Take-home"), value: income, color: palette[0] },
    { label: L("מס", "Tax"), value: result.tax, color: palette[1] },
    { label: L("הוצאות", "Expenses"), value: expenses, color: palette[2] },
    { label: L("רווח", "Profit"), value: Math.max(0, result.profit), color: palette[3] },
  ];
  const totalBreakdown = Math.max(1, breakdown.reduce((sum, part) => sum + part.value, 0));

  return (
    <div className="p-[var(--pad)] md:p-6">
      <AppHeader spec={spec} dark={dark} onToggleDark={onToggleDark} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <Slider label={L("הכנסה שנתית רצויה", "Target take-home")} value={income} min={20000} max={400000} step={5000} onChange={setIncome} format={(v) => money(v)} />
          <Slider label={L("הוצאות עסקיות", "Business expenses")} value={expenses} min={0} max={80000} step={1000} onChange={setExpenses} format={(v) => money(v)} />
          <Slider
            label={L("שעות חיוב בשבוע", "Billable hours / week")}
            value={hoursPerWeek}
            min={5}
            max={50}
            onChange={setHoursPerWeek}
            format={(v) => L(`${v} ש׳`, `${v} h`)}
          />
          <Slider
            label={L("שבועות חופשה בשנה", "Weeks off per year")}
            value={weeksOff}
            min={0}
            max={16}
            onChange={setWeeksOff}
            format={(v) => L(`${v} שב׳`, `${v} wk`)}
          />
          <Slider label={L("שיעור מס אפקטיבי", "Effective tax rate")} value={taxRate} min={0} max={55} onChange={setTaxRate} format={(v) => `${v}%`} />
          <Slider label={L("שולי רווח", "Profit margin")} value={margin} min={0} max={60} onChange={setMargin} format={(v) => `${v}%`} />
          <Slider
            label={L("גודל פרויקט לדוגמה", "Sample project size")}
            value={projectHours}
            min={4}
            max={200}
            step={2}
            onChange={setProjectHours}
            format={(v) => L(`${v} ש׳`, `${v} h`)}
          />
        </Card>

        <div className="grid content-start gap-4">
          <Card className="relative overflow-hidden">
            <div
              className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full blur-3xl"
              style={{ background: "var(--a)", opacity: 0.18 }}
            />
            <p className={cx("text-[10px] font-semibold uppercase tracking-[0.14em]", t.faint)}>{L("התעריף שלך לשעה", "Charge this per hour")}</p>
            <p className="mt-1 text-5xl font-semibold" style={{ color: "var(--a)" }}>
              <bdi className="tabular-nums">{money(result.hourly)}</bdi>
            </p>
            <p className={cx("mt-2 text-sm", t.muted)}>
              <bdi className="tabular-nums">{Math.round(result.billableHours).toLocaleString()}</bdi> {L("שעות חיוב בשנה", "billable hours")} ·{" "}
              <bdi className="tabular-nums">{money(result.revenue)}</bdi> {L("יעד הכנסות", "revenue target")}
            </p>
            <div className="mt-4 flex gap-2">
              <PreviewButton onClick={() => copyText(L(`${money(result.hourly)} לשעה`, `${money(result.hourly)}/hour`))}>
                <Copy size={14} /> {L("העתק תעריף", "Copy rate")}
              </PreviewButton>
              <PreviewButton
                variant="ghost"
                onClick={() => {
                  setIncome(120000);
                  setExpenses(18000);
                  setHoursPerWeek(25);
                  setWeeksOff(6);
                  setTaxRate(28);
                  setMargin(15);
                }}
              >
                <RefreshCw size={14} /> {L("איפוס", "Reset")}
              </PreviewButton>
            </div>
          </Card>

          <div className="grid grid-cols-2 gap-4">
            <Stat label={L("תעריף יומי (8 ש׳)", "Day rate (8h)")} value={money(result.daily)} hint={L("יום עבודה מלא", "Standard working day")} />
            <Stat
              label={L(`פרויקט ${projectHours} שעות`, `${projectHours}h project`)}
              value={money(result.project)}
              hint={L("להצעת מחיר קבועה", "Fixed-bid guidance")}
            />
          </div>

          <Card>
            <p className={cx("mb-3 text-sm font-medium", t.heading)}>{L("לאן הולך כל שקל שחויב", "Where every invoiced dollar goes")}</p>
            <div className={cx("flex h-3 w-full overflow-hidden rounded-full", t.track)}>
              {breakdown.map((part) => (
                <div
                  key={part.label}
                  style={{ width: `${(part.value / totalBreakdown) * 100}%`, background: part.color }}
                  title={`${part.label}: ${money(part.value)}`}
                />
              ))}
            </div>
            <ul className="mt-3 grid grid-cols-2 gap-2 text-xs">
              {breakdown.map((part) => (
                <li key={part.label} className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: part.color }} />
                  <span className={cx("flex-1", t.muted)}>{part.label}</span>
                  <bdi className="font-medium tabular-nums">{money(part.value)}</bdi>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      {spec.showChart ? (
        <MiniBars
          label={L("רגישות התעריף לשעות החיוב", "Rate sensitivity to billable hours")}
          caption={L(
            "פחות שעות חיוב מחייבות תעריף גבוה יותר כדי להגיע לאותה הכנסה נטו.",
            "Fewer billable hours means a higher rate is required to hit the same take-home."
          )}
          data={[15, 20, 25, 30, 35, 40].map((hours) => {
            const billable = Math.max(1, (52 - weeksOff) * hours);
            const value = ((income / Math.max(0.05, 1 - taxRate / 100)) + expenses) * (1 + margin / 100) / billable;
            return { label: L(`${hours} ש׳`, `${hours}h`), value, display: money(value) };
          })}
        />
      ) : null}
    </div>
  );
}

/* --------------------------------------------------- Business landing page */

/* Contrast helpers — the accent is user-chosen, so ink on top of it has to be
   computed rather than assumed. A cyan accent with white text is 1.29:1. */
const hexToRgb = (hex) => {
  const clean = String(hex).replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  return { r: parseInt(full.slice(0, 2), 16) || 0, g: parseInt(full.slice(2, 4), 16) || 0, b: parseInt(full.slice(4, 6), 16) || 0 };
};
const toLinear = (channel) => (channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4));
const luminance = ({ r, g, b }) => 0.2126 * toLinear(r / 255) + 0.7152 * toLinear(g / 255) + 0.0722 * toLinear(b / 255);
const contrastRatio = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
const rgbToHex = ({ r, g, b }) => `#${[r, g, b].map((c) => clamp(Math.round(c), 0, 255).toString(16).padStart(2, "0")).join("")}`;

/** Ink that stays legible on the accent — white on dark accents, near-black on light ones. */
const inkOn = (hex) => (contrastRatio(hexToRgb(hex), { r: 255, g: 255, b: 255 }) >= 3.5 ? "#ffffff" : "#10131a");

/** A darkened accent for text on white, stepped down until it clears 4.5:1. */
const accentForText = (hex) => {
  let rgb = hexToRgb(hex);
  for (let step = 0; step < 24 && contrastRatio(rgb, { r: 255, g: 255, b: 255 }) < 4.5; step += 1) {
    rgb = { r: rgb.r * 0.88, g: rgb.g * 0.88, b: rgb.b * 0.88 };
  }
  return rgbToHex(rgb);
};

/** First phone number in a field that may hold several, normalised for wa.me. */
const waNumber = (raw, isHe) => {
  const first = String(raw || "").split(/[,;/]|\sאו\s|\sor\s/)[0];
  let digits = first.replace(/[^0-9]/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  else if (isHe && digits.startsWith("0")) digits = `972${digits.slice(1)}`;
  return digits;
};

/**
 * Builds a complete, standalone landing page document from the form values.
 * Everything is inline: no fonts, no scripts, no images, no analytics — the
 * file works from a USB stick. Empty fields are omitted rather than emitted as
 * dead links, and nothing is claimed on the business's behalf that they did not
 * type themselves.
 */
const buildLandingHtml = (biz, accent, isHe) => {
  const dir = isHe ? "rtl" : "ltr";
  const lang = isHe ? "he" : "en";
  const font = isHe
    ? "'Noto Sans Hebrew','Arial Hebrew',Arial,sans-serif"
    : "Inter,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
  const esc = (value) =>
    String(value === 0 ? "0" : value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  const t = (he, en) => (isHe ? he : en);
  const has = (value) => String(value || "").trim().length > 0;
  // "09:00–19:00" unisolated in an RTL document renders as "19:00–09:00".
  const isolateRanges = (value) =>
    String(value).replace(/\d{1,2}:\d{2}\s*[–—-]\s*\d{1,2}:\d{2}/g, (range) => `<bdi dir="ltr">${range}</bdi>`);

  const name = has(biz.name) ? biz.name : t("העסק שלי", "My business");
  const onAccent = inkOn(accent);
  const accentInk = accentForText(accent);
  const telDigits = String(biz.phone || "").split(/[,;/]|\sאו\s|\sor\s/)[0].replace(/[^0-9+]/g, "");
  const wa = waNumber(biz.phone, isHe);
  const waText = encodeURIComponent(t(`היי, הגעתי מהאתר של ${name}`, `Hi, I found you through the ${name} page`));
  const mapQuery = encodeURIComponent(biz.address || "");

  const services = biz.services
    .filter((service) => has(service.name))
    .map(
      (service) => `        <article class="card">
          <h3>${esc(service.name)}</h3>
          ${has(service.detail) ? `<p>${esc(service.detail)}</p>` : ""}
          ${has(service.price) ? `<p class="price">${esc(service.price)}</p>` : ""}
        </article>`
    )
    .join("\n");

  // Chips carry facts the owner actually entered — never invented claims.
  const chips = [
    has(biz.hours) ? `<span class="chip">${isolateRanges(esc(biz.hours))}</span>` : "",
    has(biz.address) ? `<span class="chip">${esc(biz.address)}</span>` : "",
    has(biz.phone) ? `<span class="chip"><bdi>${esc(biz.phone)}</bdi></span>` : "",
  ]
    .filter(Boolean)
    .join("\n        ");

  const contactRows = [
    has(biz.phone) ? `<li><span class="k">${t("טלפון", "Phone")}</span> <a href="tel:${esc(telDigits)}"><bdi>${esc(biz.phone)}</bdi></a></li>` : "",
    has(biz.email) ? `<li><span class="k">${t("אימייל", "Email")}</span> <a href="mailto:${esc(biz.email)}"><bdi>${esc(biz.email)}</bdi></a></li>` : "",
    has(biz.address)
      ? `<li><span class="k">${t("כתובת", "Address")}</span> <a href="https://waze.com/ul?q=${mapQuery}" target="_blank" rel="noopener">${esc(biz.address)}</a></li>`
      : "",
    has(biz.hours) ? `<li><span class="k">${t("שעות פעילות", "Hours")}</span> ${isolateRanges(esc(biz.hours))}</li>` : "",
  ]
    .filter(Boolean)
    .join("\n        ");

  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name,
    description: biz.tagline || undefined,
    telephone: telDigits || undefined,
    email: has(biz.email) ? biz.email : undefined,
    address: has(biz.address) ? { "@type": "PostalAddress", streetAddress: biz.address } : undefined,
  });

  const initial = esc(String(name).trim().charAt(0) || "•");
  const favicon =
    `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='${encodeURIComponent(accent)}'/%3E%3Ctext x='32' y='45' font-size='34' font-family='Arial' font-weight='bold' fill='${encodeURIComponent(onAccent)}' text-anchor='middle'%3E${encodeURIComponent(initial)}%3C/text%3E%3C/svg%3E`;

  return `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(name)}${has(biz.tagline) ? ` — ${esc(biz.tagline)}` : ""}</title>
<meta name="description" content="${esc(biz.tagline)}">
<meta name="theme-color" content="${esc(accent)}">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(name)}">
<meta property="og:description" content="${esc(biz.tagline)}">
<meta property="og:locale" content="${isHe ? "he_IL" : "en_US"}">
<meta property="og:site_name" content="${esc(name)}">
<meta name="twitter:card" content="summary">
<link rel="icon" href="${favicon}">
<script type="application/ld+json">${jsonLd}</script>
<style>
  :root { --accent: ${accent}; --on-accent: ${onAccent}; --accent-ink: ${accentInk};
          --ink: #14161a; --muted: #5b6472; --line: #e6e8ec; --surface: #fff; --sunken: #f6f7f9; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: ${font}; color: var(--ink); background: var(--surface); line-height: 1.6;
         overflow-wrap: anywhere; }
  .wrap { max-width: 1080px; margin: 0 auto; padding: 0 20px; }
  header.hero { background: linear-gradient(160deg, var(--accent) 0%, #0b0c10 165%); color: var(--on-accent); padding: 84px 0 68px; }
  header.hero h1 { font-size: clamp(30px, 6vw, 52px); margin: 0 0 12px; letter-spacing: ${isHe ? "normal" : "-0.02em"}; }
  header.hero p.tagline { font-size: clamp(16px, 2.4vw, 20px); opacity: .93; margin: 0 0 28px; max-width: 46ch; }
  .cta { display: inline-block; background: var(--surface); color: var(--accent-ink); font-weight: 700;
         padding: 14px 30px; border-radius: 999px; text-decoration: none; border: 2px solid transparent; }
  .cta.ghost { background: transparent; color: var(--on-accent); border-color: currentColor; margin-inline-start: 10px; }
  main { display: block; }
  section { padding: 56px 0; }
  section + section { padding-top: 0; }
  h2 { font-size: clamp(22px, 3.4vw, 32px); margin: 0 0 8px; }
  .sub { color: var(--muted); margin: 0 0 28px; }
  .grid { display: grid; gap: 18px; grid-template-columns: repeat(auto-fit, minmax(min(100%, 260px), 1fr)); }
  .card { border: 1px solid var(--line); border-radius: 16px; padding: 24px; }
  .card h3 { margin: 0 0 6px; font-size: 18px; }
  .card p { margin: 0; color: var(--muted); }
  .card .price { margin-top: 12px; color: var(--accent-ink); font-weight: 700; font-size: 18px; }
  .chips { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 22px; }
  .chip { border: 1px solid var(--line); border-radius: 999px; padding: 8px 16px; font-size: 14px; color: var(--muted); }
  blockquote { margin: 0; background: var(--sunken); border-radius: 18px; padding: 32px; font-size: 19px; }
  blockquote footer { margin-top: 12px; font-size: 14px; color: var(--muted); }
  .contact { background: #0f1116; color: #fff; }
  .contact a { color: #fff; }
  .contact .cta { color: var(--accent-ink); background: #fff; }
  .rows { display: grid; gap: 10px; margin: 0; padding: 0; list-style: none; }
  .rows .k { color: #b9c0cc; }
  footer.foot { padding: 26px 0; font-size: 13px; color: var(--muted); text-align: center; border-top: 1px solid var(--line); }
  :where(a, button):focus-visible { outline: 3px solid currentColor; outline-offset: 3px; border-radius: 6px; }
  .actionbar { position: fixed; inset-inline: 0; bottom: 0; z-index: 50; display: none;
               grid-auto-flow: column; grid-auto-columns: 1fr; gap: 1px; background: var(--line);
               padding-bottom: env(safe-area-inset-bottom); }
  .actionbar a { background: var(--surface); color: var(--ink); text-align: center; padding: 14px 8px;
                 min-height: 48px; font-weight: 700; text-decoration: none; font-size: 15px; }
  .actionbar a.wa { background: #25d366; color: #05230f; }
  @media (max-width: 720px) { .actionbar { display: grid; } body { padding-bottom: 68px; } }
  @media (prefers-color-scheme: dark) {
    :root { --ink: #eef1f6; --muted: #9aa4b2; --line: #232833; --surface: #0d0f13; --sunken: #161a21; }
    .card { background: #12151b; }
    .card .price { color: #fff; }
    .contact { background: #171b23; }
    .actionbar a { background: #12151b; color: #eef1f6; }
  }
  @media print {
    .actionbar, .cta { display: none !important; }
    header.hero, .contact { background: #fff !important; color: #000 !important; }
    header.hero *, .contact *, .contact a, .contact .k { color: #000 !important; }
    section { padding: 16px 0 !important; break-inside: avoid; }
    .card { border: 1px solid #999; }
    .rows li { display: block; }
  }
</style>
</head>
<body>
<header class="hero">
  <div class="wrap">
    <h1>${esc(name)}</h1>
    ${has(biz.tagline) ? `<p class="tagline">${esc(biz.tagline)}</p>` : ""}
    ${has(telDigits) ? `<a class="cta" href="tel:${esc(telDigits)}">${esc(has(biz.cta) ? biz.cta : t("התקשרו אלינו", "Call us"))}</a>` : ""}
    ${wa ? `<a class="cta ghost" href="https://wa.me/${wa}?text=${waText}">${t("וואטסאפ", "WhatsApp")}</a>` : ""}
  </div>
</header>

<main>
${
  services
    ? `  <section aria-labelledby="services">
    <div class="wrap">
      <h2 id="services">${t("השירותים שלנו", "What we do")}</h2>
      ${has(biz.about) ? `<p class="sub">${esc(biz.about)}</p>` : ""}
      <div class="grid">
${services}
      </div>
      ${chips ? `<div class="chips">\n        ${chips}\n      </div>` : ""}
    </div>
  </section>`
    : ""
}
${
  has(biz.testimonial)
    ? `  <section>
    <div class="wrap">
      <blockquote>
        ${t("״", "“")}${esc(biz.testimonial)}${t("״", "”")}
        ${has(biz.testimonialBy) ? `<footer>— ${esc(biz.testimonialBy)}</footer>` : ""}
      </blockquote>
    </div>
  </section>`
    : ""
}
${
  contactRows
    ? `  <section class="contact" aria-labelledby="contact">
    <div class="wrap">
      <h2 id="contact">${t("דברו איתנו", "Get in touch")}</h2>
      <ul class="rows">
        ${contactRows}
      </ul>
      ${has(telDigits) ? `<p style="margin-top:26px"><a class="cta" href="tel:${esc(telDigits)}">${esc(has(biz.cta) ? biz.cta : t("התקשרו אלינו", "Call us"))}</a></p>` : ""}
    </div>
  </section>`
    : ""
}
</main>

<footer class="foot">© ${new Date().getFullYear()} ${esc(name)}</footer>

${
  wa || telDigits || has(biz.address)
    ? `<nav class="actionbar" aria-label="${t("צרו קשר", "Contact")}">
  ${wa ? `<a class="wa" href="https://wa.me/${wa}?text=${waText}" aria-label="${t("שליחת הודעה בוואטסאפ", "Message on WhatsApp")}">${t("וואטסאפ", "WhatsApp")}</a>` : ""}
  ${has(telDigits) ? `<a href="tel:${esc(telDigits)}" aria-label="${t("חיוג לעסק", "Call the business")}">${t("חיוג", "Call")}</a>` : ""}
  ${has(biz.address) ? `<a href="https://waze.com/ul?q=${mapQuery}" target="_blank" rel="noopener" aria-label="${t("ניווט בוויז", "Navigate with Waze")}">${t("ניווט", "Directions")}</a>` : ""}
</nav>`
    : ""
}
</body>
</html>
`;
};

function LandingApp({ spec, dark, onToggleDark }) {
  const t = useT();
  const L = useL();
  const isHe = useIsHe();
  const [biz, setBiz] = useState({
    name: L("מספרת אבי", "Avi's Barbershop"),
    tagline: L("תספורת מדויקת, בלי להמתין בתור", "A sharp cut, with no waiting around"),
    about: L("עשרים שנה של מקצועיות, בלב העיר.", "Twenty years of craft, right in the town centre."),
    services: [
      { name: L("תספורת גברים", "Men's cut"), detail: L("כולל שטיפה וסידור", "Includes wash and styling"), price: L("₪80", "$28") },
      { name: L("עיצוב זקן", "Beard trim"), detail: L("קווים חדים ושמן טיפוח", "Sharp lines and beard oil"), price: L("₪50", "$18") },
      { name: L("חבילת חתן", "Groom package"), detail: L("תספורת, זקן וטיפוח פנים", "Cut, beard and facial"), price: L("₪240", "$85") },
    ],
    testimonial: L("נכנסתי בלי תור ויצאתי אחרי עשרים דקות מסופר. שירות אלוף.", "Walked in with no appointment and left twenty minutes later. Brilliant service."),
    testimonialBy: L("דני כ׳, לקוח קבוע", "Danny K., regular"),
    phone: L("052-1234567", "+1 555 0134"),
    email: "hello@avi.co.il",
    address: L("הרצל 24, תל אביב", "24 High Street, Bristol"),
    hours: L("א׳–ה׳ 09:00–19:00, ו׳ 08:00–14:00", "Mon–Fri 9am–7pm, Sat 8am–2pm"),
    cta: L("קבעו תור עכשיו", "Book now"),
  });

  const set = (key, value) => setBiz((current) => ({ ...current, [key]: value }));
  const setService = (index, key, value) =>
    setBiz((current) => ({
      ...current,
      services: current.services.map((service, i) => (i === index ? { ...service, [key]: value } : service)),
    }));

  // Without this the iframe reparses a full document on every keystroke, which
  // blanks the preview and throws away its scroll position.
  const deferredBiz = useDeferredValue(biz);
  const html = useMemo(() => buildLandingHtml(deferredBiz, spec.accent, isHe), [deferredBiz, spec.accent, isHe]);

  return (
    <div className="p-[var(--pad)] md:p-6">
      <AppHeader spec={spec} dark={dark} onToggleDark={onToggleDark} />

      <Card>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <p className={cx("me-auto flex items-center gap-2 text-sm font-medium", t.heading)}>
            <PanelsTopLeft size={15} className={isHe ? "-scale-x-100" : undefined} style={{ color: "var(--a)" }} /> {L("פרטי העסק", "Your business details")}
          </p>
          <PreviewButton onClick={() => {
              const slug = slugify(biz.name);
              downloadFile(`${slug === "generated-app" ? "landing-page" : slug}.html`, html, "text/html;charset=utf-8");
            }}>
            <Download size={14} /> {L("הורדת הדף", "Download page")}
          </PreviewButton>
          <PreviewButton variant="ghost" onClick={() => copyText(html)}>
            <Copy size={14} /> {L("העתקת HTML", "Copy HTML")}
          </PreviewButton>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <LabeledInput label={L("שם העסק", "Business name")} value={biz.name} onChange={(value) => set("name", value)} />
          <LabeledInput label={L("סלוגן", "Tagline")} value={biz.tagline} onChange={(value) => set("tagline", value)} />
          <LabeledInput label={L("טלפון", "Phone")} value={biz.phone} onChange={(value) => set("phone", value)} />
          <LabeledInput label={L("אימייל", "Email")} value={biz.email} onChange={(value) => set("email", value)} />
          <LabeledInput label={L("כתובת", "Address")} value={biz.address} onChange={(value) => set("address", value)} />
          <LabeledInput label={L("שעות פעילות", "Opening hours")} value={biz.hours} onChange={(value) => set("hours", value)} />
          <LabeledInput label={L("טקסט הכפתור", "Button text")} value={biz.cta} onChange={(value) => set("cta", value)} />
          <LabeledInput label={L("תיאור קצר", "Short description")} value={biz.about} onChange={(value) => set("about", value)} />
        </div>

        <p className={cx("mb-2 mt-4 text-[11px] font-medium uppercase tracking-wider", t.faint)}>{L("שירותים", "Services")}</p>
        <div className="space-y-2">
          {biz.services.map((service, index) => (
            <div key={index} className="grid gap-2 sm:grid-cols-[1fr_1fr_110px]">
              <input
                className={t.input}
                value={service.name}
                placeholder={L("שם השירות", "Service name")}
                onChange={(event) => setService(index, "name", event.target.value)}
              />
              <input
                className={t.input}
                value={service.detail}
                placeholder={L("פירוט קצר", "Short detail")}
                onChange={(event) => setService(index, "detail", event.target.value)}
              />
              <input
                className={t.input}
                value={service.price}
                placeholder={L("מחיר", "Price")}
                onChange={(event) => setService(index, "price", event.target.value)}
              />
            </div>
          ))}
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <LabeledInput label={L("המלצת לקוח", "Testimonial")} value={biz.testimonial} onChange={(value) => set("testimonial", value)} />
          <LabeledInput label={L("שם הממליץ", "Testimonial by")} value={biz.testimonialBy} onChange={(value) => set("testimonialBy", value)} />
        </div>
      </Card>

      <div className="mt-4">
        <p className={cx("mb-2 flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider", t.faint)}>
          <Eye size={12} /> {L("תצוגה חיה של הדף", "Live page preview")}
        </p>
        <div className={cx("overflow-hidden", t.surface)} style={{ padding: 0 }}>
          <iframe
            title={L("תצוגת דף הנחיתה", "Landing page preview")}
            srcDoc={html}
            className="h-[520px] w-full border-0 bg-white"
            sandbox="allow-same-origin"
          />
        </div>
        <p className={cx("mt-2 text-xs", t.muted)}>
          {L(
            "הדף שלמעלה הוא קובץ HTML עצמאי — הורידו אותו והעלו לכל אחסון, בלי תלות בשום שירות.",
            "The page above is a standalone HTML file — download it and host it anywhere, with no service to depend on."
          )}
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------- Appointment booking */

const BOOKING_SERVICES = [
  { id: "cut", he: "תספורת", en: "Haircut", minutes: 30, price: 80 },
  { id: "beard", he: "עיצוב זקן", en: "Beard trim", minutes: 20, price: 50 },
  { id: "combo", he: "תספורת + זקן", en: "Cut + beard", minutes: 45, price: 120 },
];
/** Local calendar date as YYYY-MM-DD — never via toISOString(). */
const localDayKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const SLOT_TIMES = ["09:00", "09:45", "10:30", "11:15", "12:00", "13:30", "14:15", "15:00", "15:45", "16:30", "17:15", "18:00"];
const DAY_NAMES_HE = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];
const DAY_NAMES_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function BookingApp({ spec, dark, onToggleDark }) {
  const t = useT();
  const L = useL();
  const palette = useSeries();

  // toISOString() converts local midnight to UTC and files every booking under
  // the wrong date east of Greenwich — Israel included. Key on the local
  // calendar date, and re-derive the strip when the day rolls over.
  const [todayKey, setTodayKey] = useState(() => localDayKey(new Date()));
  const days = useMemo(() => {
    const base = new Date();
    return Array.from({ length: 7 }, (_, offset) => {
      const date = new Date(base.getFullYear(), base.getMonth(), base.getDate() + offset);
      return {
        key: localDayKey(date),
        dayName: L(DAY_NAMES_HE[date.getDay()], DAY_NAMES_EN[date.getDay()]),
        dayNum: date.getDate(),
        closed: date.getDay() === 6,
      };
    });
  }, [todayKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const timer = window.setInterval(() => setTodayKey(localDayKey(new Date())), 60000);
    return () => window.clearInterval(timer);
  }, []);

  // Seeding onto a closed day would show a confirmed booking beside "Closed".
  const firstOpen = (days.find((item) => !item.closed) || days[0]).key;
  const [service, setService] = useState(BOOKING_SERVICES[0].id);
  const [day, setDay] = useState(firstOpen);
  const [customer, setCustomer] = useState("");
  const [bookings, setBookings] = useState([{ id: uid("bk"), day: firstOpen, time: "10:30", service: "combo", customer: L("רונית ל׳", "Ronit L.") }]);

  const selectedDay = days.find((item) => item.key === day) || days[0];
  const selectedService = BOOKING_SERVICES.find((item) => item.id === service) || BOOKING_SERVICES[0];
  const taken = new Set(bookings.filter((booking) => booking.day === day).map((booking) => booking.time));

  const dayBookings = bookings.filter((booking) => booking.day === day);
  const revenue = dayBookings.reduce((sum, booking) => {
    const found = BOOKING_SERVICES.find((item) => item.id === booking.service);
    return sum + (found ? found.price : 0);
  }, 0);

  const book = (time) => {
    if (taken.has(time) || selectedDay.closed) return;
    setBookings((list) =>
      // Re-checked inside the updater so a double click cannot double-book.
      list.some((entry) => entry.day === day && entry.time === time)
        ? list
        : [...list, { id: uid("bk"), day, time, service, customer: customer.trim() || L("לקוח חדש", "New customer") }]
    );
    setCustomer("");
  };

  const perDay = days.map((item) => ({
    label: `${item.dayName} ${item.dayNum}`,
    value: bookings.filter((booking) => booking.day === item.key).length,
  }));

  return (
    <div className="p-[var(--pad)] md:p-6">
      <AppHeader spec={spec} dark={dark} onToggleDark={onToggleDark} />

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label={L("תורים ביום הנבחר", "Bookings on this day")} value={String(dayBookings.length)} />
        <Stat label={L("הכנסה צפויה", "Expected revenue")} value={money(revenue, "₪")} />
        <Stat label={L("תורים פנויים", "Free slots")} value={String(selectedDay.closed ? 0 : SLOT_TIMES.length - taken.size)} tone="plain" />
      </div>

      <Card className="mt-4">
        <p className={cx("mb-2 text-[11px] font-medium uppercase tracking-wider", t.faint)}>{L("בחרו שירות", "Pick a service")}</p>
        <div className="flex flex-wrap gap-2">
          {BOOKING_SERVICES.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setService(item.id)}
              className={cx("px-3 py-2 text-start text-sm transition", service === item.id ? t.btn : t.chip)}
              style={service === item.id ? { background: palette[index], color: "#fff" } : undefined}
            >
              <span className="block font-medium">{L(item.he, item.en)}</span>
              <bdi className="block text-[11px] opacity-75">
                {item.minutes} {L("דק׳", "min")} · {money(item.price, "₪")}
              </bdi>
            </button>
          ))}
        </div>

        <p className={cx("mb-2 mt-4 text-[11px] font-medium uppercase tracking-wider", t.faint)}>{L("בחרו יום", "Pick a day")}</p>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {days.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setDay(item.key)}
              className={cx(
                "min-w-[64px] shrink-0 px-3 py-2 text-center transition",
                day === item.key ? t.btn : t.chip,
                item.closed ? "opacity-45" : ""
              )}
            >
              <span className="block text-[11px]">{item.dayName}</span>
              <bdi className="block text-lg font-semibold tabular-nums">{item.dayNum}</bdi>
            </button>
          ))}
        </div>

        <p className={cx("mb-2 mt-4 text-[11px] font-medium uppercase tracking-wider", t.faint)}>{L("שעות פנויות", "Available times")}</p>
        {selectedDay.closed ? (
          <p className={cx("border border-dashed p-6 text-center text-sm", t.divider, t.faint)}>{L("העסק סגור ביום זה", "Closed on this day")}</p>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
            {SLOT_TIMES.map((time) => {
              const isTaken = taken.has(time);
              return (
                <button
                  key={time}
                  type="button"
                  disabled={isTaken}
                  onClick={() => book(time)}
                  className={cx("px-2 py-2 text-sm font-medium tabular-nums transition", isTaken ? t.chip : t.btnGhost, isTaken ? "opacity-40 line-through" : "hover:-translate-y-0.5")}
                >
                  <bdi>{time}</bdi>
                </button>
              );
            })}
          </div>
        )}

        <div className="mt-3 flex gap-2">
          <input
            className={t.input}
            value={customer}
            placeholder={L("שם הלקוח (לא חובה)", "Customer name (optional)")}
            onChange={(event) => setCustomer(event.target.value)}
          />
        </div>
      </Card>

      <Card className="mt-4">
        <p className={cx("mb-3 text-sm font-medium", t.heading)}>{L("תורים מאושרים", "Confirmed bookings")}</p>
        <ul className="space-y-2">
          {dayBookings
            .slice()
            .sort((a, b) => a.time.localeCompare(b.time))
            .map((booking) => {
              const item = BOOKING_SERVICES.find((entry) => entry.id === booking.service) || BOOKING_SERVICES[0];
              return (
                <li key={booking.id} className={cx(t.surfaceAlt, "flex items-center gap-3 p-3")}>
                  <bdi className="shrink-0 text-sm font-semibold tabular-nums" style={{ color: "var(--a)" }}>
                    {booking.time}
                  </bdi>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{booking.customer}</span>
                    <span className={cx("block text-[11px]", t.faint)}>
                      {L(item.he, item.en)} · <bdi>{item.minutes} {L("דק׳", "min")}</bdi>
                    </span>
                  </span>
                  <IconAction label={L("ביטול תור", "Cancel booking")} onClick={() => setBookings((list) => list.filter((entry) => entry.id !== booking.id))}>
                    <Trash2 size={13} />
                  </IconAction>
                </li>
              );
            })}
          {dayBookings.length === 0 ? (
            <li className={cx("border border-dashed p-6 text-center text-sm", t.divider, t.faint)}>
              {L("אין עדיין תורים ליום זה", "Nothing booked for this day yet")}
            </li>
          ) : null}
        </ul>
      </Card>

      {spec.showChart ? <MiniBars label={L("תורים לפי יום", "Bookings per day")} data={perDay} /> : null}
    </div>
  );
}

/* ---------------------------------------------------------------- Banking */

const CARD_LIMIT = 20000;
const MONTHS_SHORT_HE = ["ינו׳", "פבר׳", "מרץ", "אפר׳", "מאי", "יוני"];
const MONTHS_SHORT_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];

function BankingApp({ spec, dark, onToggleDark }) {
  const t = useT();
  const L = useL();
  const isHe = useIsHe();
  const series = useSeries();
  // Under RTL, money arriving points down-right and leaving points up-left.
  const InIcon = isHe ? ArrowDownRight : ArrowDownLeft;
  const OutIcon = isHe ? ArrowUpLeft : ArrowUpRight;
  const mirror = isHe ? "-scale-x-100" : undefined;

  const [accounts, setAccounts] = useState([
    { id: "checking", he: "עובר ושב", en: "Checking", number: "12-441-88210", balance: 18430.5, kind: "cash" },
    { id: "savings", he: "חיסכון", en: "Savings", number: "12-441-90077", balance: 62150, kind: "cash" },
    { id: "card", he: "כרטיס אשראי", en: "Credit card", number: "•••• 4417", balance: -3820.4, kind: "card" },
  ]);
  const [active, setActive] = useState("checking");
  const [frozen, setFrozen] = useState(false);
  const [query, setQuery] = useState("");
  const [flow, setFlow] = useState("all");
  const [transfer, setTransfer] = useState({ from: "checking", to: "savings", amount: "" });
  const [notice, setNotice] = useState(null);
  const [txs, setTxs] = useState([
    { id: uid("tx"), account: "checking", label: L("משכורת חודשית", "Monthly salary"), amount: 16200, date: "01/08", kind: "in" },
    { id: uid("tx"), account: "checking", label: L("שכר דירה", "Rent"), amount: -4200, date: "02/08", kind: "out" },
    { id: uid("tx"), account: "checking", label: L("סופרמרקט", "Supermarket"), amount: -612.9, date: "03/08", kind: "out" },
    { id: uid("tx"), account: "card", label: L("תדלוק", "Fuel"), amount: -310, date: "03/08", kind: "out" },
    { id: uid("tx"), account: "savings", label: L("הפקדה חודשית", "Monthly deposit"), amount: 1500, date: "01/08", kind: "in" },
    { id: uid("tx"), account: "card", label: L("בית קפה", "Coffee shop"), amount: -48.5, date: "04/08", kind: "out" },
  ]);

  const shekel = (value) => money(value, "₪", 2);
  const accountName = (account) => L(account.he, account.en);
  const byId = (id) => accounts.find((account) => account.id === id);
  const netWorth = accounts.reduce((sum, account) => sum + account.balance, 0);
  const activeAccount = byId(active) || accounts[0];

  const visibleTxs = txs
    .filter((tx) => tx.account === active)
    .filter((tx) => (flow === "all" ? true : tx.kind === flow))
    .filter((tx) => tx.label.toLowerCase().includes(query.trim().toLowerCase()));

  const monthlyFlow = MONTHS_SHORT_EN.map((_, index) => ({
    label: L(MONTHS_SHORT_HE[index], MONTHS_SHORT_EN[index]),
    in: Math.round(14200 + index * 640),
    out: Math.round(11800 + (index % 3) * 900 + index * 320),
  }));
  const flowPeak = Math.max(...monthlyFlow.map((month) => Math.max(month.in, month.out)));

  const doTransfer = () => {
    // Money is settled in whole agorot — a sub-cent amount would move a balance
    // by less than the tiles can display and desync them from the header total.
    const amount = Math.round(num(transfer.amount) * 100) / 100;
    const from = byId(transfer.from);
    const to = byId(transfer.to);
    if (!from || !to || from.id === to.id) {
      setNotice({ tone: "critical", text: L("בחרו שני חשבונות שונים", "Pick two different accounts") });
      return;
    }
    if (!(amount > 0)) {
      setNotice({ tone: "critical", text: L("הזינו סכום גדול מאפס", "Enter an amount above zero") });
      return;
    }
    if (frozen && (from.kind === "card" || to.kind === "card")) {
      setNotice({ tone: "critical", text: L("הכרטיס מוקפא — בטלו את ההקפאה כדי להעביר", "The card is frozen — unfreeze it to transfer") });
      return;
    }
    // A card may run negative, but only down to its credit limit.
    const floor = from.kind === "card" ? -CARD_LIMIT : 0;
    if (from.balance - amount < floor) {
      setNotice({
        tone: "critical",
        text:
          from.kind === "card"
            ? L(`חריגה ממסגרת האשראי (${money(CARD_LIMIT, "₪")})`, `Over the card limit (${money(CARD_LIMIT, "₪")})`)
            : L("אין מספיק יתרה בחשבון המקור", "Not enough balance in the source account"),
      });
      return;
    }
    setAccounts((list) =>
      list.map((account) => {
        if (account.id === from.id) return { ...account, balance: account.balance - amount };
        if (account.id === to.id) return { ...account, balance: account.balance + amount };
        return account;
      })
    );
    const stamp = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit" });
    setTxs((list) => [
      { id: uid("tx"), account: to.id, label: L(`העברה מ${accountName(from)}`, `Transfer from ${accountName(from)}`), amount, date: stamp, kind: "in" },
      { id: uid("tx"), account: from.id, label: L(`העברה ל${accountName(to)}`, `Transfer to ${accountName(to)}`), amount: -amount, date: stamp, kind: "out" },
      ...list,
    ]);
    setTransfer({ ...transfer, amount: "" });
    setNotice({ tone: "good", text: L(`הועברו ${shekel(amount)} בהצלחה`, `${shekel(amount)} transferred`) });
  };

  return (
    <div className="p-[var(--pad)] md:p-6">
      <AppHeader spec={spec} dark={dark} onToggleDark={onToggleDark} />

      <Card className="relative overflow-hidden">
        <div className="pointer-events-none absolute -inset-x-10 -top-24 h-48 rounded-full blur-3xl" style={{ background: "var(--a)", opacity: 0.16 }} />
        <p className={cx("text-[10px] font-semibold uppercase tracking-[0.14em]", t.faint)}>{L("יתרה כוללת", "Total balance")}</p>
        <p className="mt-1 text-4xl font-semibold" style={{ color: "var(--a)" }}>
          <bdi className="tabular-nums">{shekel(netWorth)}</bdi>
        </p>
        <p className={cx("mt-1 text-xs", t.muted)}>
          {L(`${accounts.length} חשבונות מקושרים`, `${accounts.length} linked accounts`)}
        </p>
      </Card>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {accounts.map((account, index) => {
          const selected = account.id === active;
          return (
            <button
              key={account.id}
              type="button"
              onClick={() => setActive(account.id)}
              className={cx(t.surface, "p-[var(--pad)] text-start transition", selected ? "ring-2 ring-[var(--a)]" : "hover:-translate-y-0.5")}
            >
              <span className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: series[index] }} />
                <span className={cx("text-sm font-medium", t.heading)}>{accountName(account)}</span>
              </span>
              <bdi className="mt-1.5 block text-lg font-semibold tabular-nums" style={account.balance < 0 ? { color: STATUS.critical } : undefined}>
                {shekel(account.balance)}
              </bdi>
              <bdi className={cx("block font-mono text-[11px]", t.faint)}>{account.number}</bdi>
              {account.kind === "card" && frozen ? (
                <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium" style={{ color: STATUS.serious }}>
                  <ShieldCheck size={11} /> {L("הכרטיס מוקפא", "Card frozen")}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <p className={cx("me-auto text-sm font-medium", t.heading)}>
              {L("תנועות · ", "Transactions · ")}
              {accountName(activeAccount)}
            </p>
            {["all", "in", "out"].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setFlow(value)}
                className={cx("px-2.5 py-1 text-xs font-medium transition", flow === value ? t.btn : t.chip)}
              >
                {L({ all: "הכול", in: "זיכויים", out: "חיובים" }[value], { all: "All", in: "In", out: "Out" }[value])}
              </button>
            ))}
          </div>

          <input
            className={t.input}
            value={query}
            placeholder={L("חיפוש בתנועות…", "Search transactions…")}
            onChange={(event) => setQuery(event.target.value)}
          />

          <ul className="mt-3 space-y-2">
            {visibleTxs.map((tx) => (
              <li key={tx.id} className={cx(t.surfaceAlt, "flex items-center gap-3 p-3")}>
                <span
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full"
                  style={{ background: `${tx.kind === "in" ? STATUS.good : series[1]}22`, color: tx.kind === "in" ? STATUS.good : series[1] }}
                >
                  {tx.kind === "in" ? <InIcon size={14} /> : <OutIcon size={14} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{tx.label}</span>
                  <bdi className={cx("block text-[11px]", t.faint)}>{tx.date}</bdi>
                </span>
                <bdi className="shrink-0 text-sm font-semibold tabular-nums" style={{ color: tx.amount > 0 ? STATUS.good : undefined }}>
                  {tx.amount > 0 ? "+" : ""}
                  {shekel(tx.amount)}
                </bdi>
              </li>
            ))}
            {visibleTxs.length === 0 ? (
              <li className={cx("border border-dashed p-6 text-center text-sm", t.divider, t.faint)}>
                {L("לא נמצאו תנועות", "No transactions found")}
              </li>
            ) : null}
          </ul>
        </Card>

        <div className="grid content-start gap-4">
          <Card>
            <p className={cx("mb-3 flex items-center gap-2 text-sm font-medium", t.heading)}>
              <Send size={14} className={mirror} style={{ color: "var(--a)" }} /> {L("העברה בין חשבונות", "Transfer between accounts")}
            </p>
            <label className="mb-2 block">
              <span className={cx("mb-1 block text-[11px] uppercase tracking-wider", t.faint)}>{L("מחשבון", "From")}</span>
              <select className={t.input} value={transfer.from} onChange={(event) => setTransfer({ ...transfer, from: event.target.value })}>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {accountName(account)}
                  </option>
                ))}
              </select>
            </label>
            <label className="mb-2 block">
              <span className={cx("mb-1 block text-[11px] uppercase tracking-wider", t.faint)}>{L("לחשבון", "To")}</span>
              <select className={t.input} value={transfer.to} onChange={(event) => setTransfer({ ...transfer, to: event.target.value })}>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {accountName(account)}
                  </option>
                ))}
              </select>
            </label>
            <label className="mb-3 block">
              <span className={cx("mb-1 block text-[11px] uppercase tracking-wider", t.faint)}>{L("סכום", "Amount")}</span>
              <input
                type="number"
                min="0"
                className={t.input}
                value={transfer.amount}
                placeholder="0.00"
                onChange={(event) => setTransfer({ ...transfer, amount: event.target.value })}
                onKeyDown={(event) => {
                  if (event.key === "Enter") doTransfer();
                }}
              />
            </label>
            <PreviewButton onClick={doTransfer} className="w-full">
              <Send size={14} className={mirror} /> {L("בצעו העברה", "Send transfer")}
            </PreviewButton>

            {notice ? (
              <p
                className="mt-2.5 flex items-start gap-1.5 text-xs font-medium"
                style={{ color: notice.tone === "good" ? STATUS.good : STATUS.critical }}
                role="status"
              >
                {notice.tone === "good" ? <Check size={13} className="mt-px shrink-0" /> : <X size={13} className="mt-px shrink-0" />}
                <span>{notice.text}</span>
              </p>
            ) : null}
          </Card>

          <Card>
            <p className={cx("mb-2 text-sm font-medium", t.heading)}>{L("אבטחת כרטיס", "Card security")}</p>
            <label className="flex items-center justify-between gap-3">
              <span className={cx("text-sm", t.muted)}>{L("הקפאת כרטיס האשראי", "Freeze the credit card")}</span>
              <button
                type="button"
                role="switch"
                aria-checked={frozen}
                onClick={() => setFrozen((value) => !value)}
                className="relative h-6 w-11 shrink-0 rounded-full transition"
                style={{ background: frozen ? STATUS.serious : "rgba(128,128,128,0.35)" }}
              >
                <span
                  className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all"
                  style={frozen ? { insetInlineEnd: "0.125rem" } : { insetInlineStart: "0.125rem" }}
                />
              </button>
            </label>
          </Card>
        </div>
      </div>

      {spec.showChart ? (
        <Card className="mt-4">
          <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
            <p className={cx("text-sm font-medium", t.heading)}>{L("הכנסות מול הוצאות לפי חודש", "Money in vs money out by month")}</p>
            <span className="flex items-center gap-3 text-[11px]">
              <span className={cx("flex items-center gap-1.5", t.muted)}>
                <span className="h-2 w-2 rounded-full" style={{ background: series[0] }} /> {L("הכנסות", "In")}
              </span>
              <span className={cx("flex items-center gap-1.5", t.muted)}>
                <span className="h-2 w-2 rounded-full" style={{ background: series[1] }} /> {L("הוצאות", "Out")}
              </span>
            </span>
          </div>
          <div className="mt-3 flex h-32 items-end gap-3">
            {monthlyFlow.map((month) => (
              <div key={month.label} className="flex flex-1 flex-col items-center gap-1.5">
                <div className="flex h-full w-full items-end justify-center gap-[2px]">
                  <div
                    className="w-1/2 rounded-t-[4px] transition-all duration-500"
                    style={{ height: `${(month.in / flowPeak) * 100}%`, background: series[0] }}
                    title={`${month.label} · ${L("הכנסות", "In")} ${money(month.in, "₪")}`}
                  />
                  <div
                    className="w-1/2 rounded-t-[4px] transition-all duration-500"
                    style={{ height: `${(month.out / flowPeak) * 100}%`, background: series[1] }}
                    title={`${month.label} · ${L("הוצאות", "Out")} ${money(month.out, "₪")}`}
                  />
                </div>
                <span className={cx("text-[10px]", t.faint)}>{month.label}</span>
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}

// Categorical identity — slot order is fixed so a category keeps its hue even
// when the filtered set changes size.
const BUDGET_CATEGORIES = [
  { id: "housing", he: "דיור", en: "Housing", slot: 0 },
  { id: "food", he: "מזון", en: "Food", slot: 1 },
  { id: "transport", he: "תחבורה", en: "Transport", slot: 2 },
  { id: "fun", he: "פנאי", en: "Leisure", slot: 3 },
  { id: "bills", he: "חשבונות", en: "Bills", slot: 4 },
  { id: "other", he: "אחר", en: "Other", slot: 5 },
];

const MONTHS_HE = ["ינו", "פבר", "מרץ", "אפר", "מאי", "יונ"];
const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];

function BudgetApp({ spec, dark, onToggleDark }) {
  const t = useT();
  const L = useL();
  const palette = useSeries();
  const hue = (category) => palette[category.slot];
  const [income, setIncome] = useState(14500);
  const [budget, setBudget] = useState(9000);
  const [entries, setEntries] = useState([
    { id: uid("tx"), label: L("שכר דירה", "Rent"), amount: 4200, category: "housing" },
    { id: uid("tx"), label: L("קניות בסופר", "Groceries"), amount: 1850, category: "food" },
    { id: uid("tx"), label: L("דלק וחניה", "Fuel & parking"), amount: 720, category: "transport" },
    { id: uid("tx"), label: L("מנוי חדר כושר", "Gym membership"), amount: 249, category: "fun" },
    { id: uid("tx"), label: L("חשמל ומים", "Utilities"), amount: 610, category: "bills" },
  ]);
  const [draft, setDraft] = useState({ label: "", amount: "", category: "food" });

  const spent = entries.reduce((sum, entry) => sum + num(entry.amount), 0);
  const balance = income - spent;
  const budgetUsed = budget > 0 ? clamp((spent / budget) * 100, 0, 100) : 0;
  const overBudget = spent > budget;

  const byCategory = BUDGET_CATEGORIES.map((category) => ({
    ...category,
    total: entries.filter((entry) => entry.category === category.id).reduce((sum, entry) => sum + num(entry.amount), 0),
  })).filter((category) => category.total > 0);

  const addEntry = () => {
    const label = draft.label.trim();
    const amount = num(draft.amount);
    if (!label || amount <= 0) return;
    setEntries((list) => [{ id: uid("tx"), label, amount, category: draft.category }, ...list]);
    setDraft({ label: "", amount: "", category: draft.category });
  };

  const shekel = (value) => money(value, "₪");

  return (
    <div className="p-[var(--pad)] md:p-6">
      <AppHeader spec={spec} dark={dark} onToggleDark={onToggleDark} />

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label={L("הכנסה חודשית", "Monthly income")} value={shekel(income)} hint={L("נטו לחודש", "Net per month")} />
        <Stat label={L("סך ההוצאות", "Total spent")} value={shekel(spent)} tone="warn" hint={`${entries.length} ${L("תנועות", "transactions")}`} />
        <Stat
          label={L("יתרה", "Balance")}
          value={shekel(balance)}
          tone={balance < 0 ? "warn" : undefined}
          hint={balance < 0 ? L("חריגה מההכנסה", "Over your income") : L("נשאר החודש", "Left this month")}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_300px]">
        <Card>
          <div className="grid gap-2 sm:grid-cols-[1fr_120px_auto]">
            <input
              className={t.input}
              value={draft.label}
              placeholder={L("על מה הוצאת?", "What did you spend on?")}
              onChange={(event) => setDraft({ ...draft, label: event.target.value })}
              onKeyDown={(event) => {
                if (event.key === "Enter") addEntry();
              }}
            />
            <input
              type="number"
              min="0"
              className={t.input}
              value={draft.amount}
              placeholder={L("סכום", "Amount")}
              onChange={(event) => setDraft({ ...draft, amount: event.target.value })}
              onKeyDown={(event) => {
                if (event.key === "Enter") addEntry();
              }}
            />
            <PreviewButton onClick={addEntry} className="shrink-0">
              <Plus size={15} /> {L("הוסף", "Add")}
            </PreviewButton>
          </div>

          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {BUDGET_CATEGORIES.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => setDraft({ ...draft, category: category.id })}
                className={cx("px-2.5 py-1 text-xs font-medium transition", draft.category === category.id ? t.btn : t.chip)}
                style={draft.category === category.id ? { background: category.color, color: "#fff" } : undefined}
              >
                {L(category.he, category.en)}
              </button>
            ))}
          </div>

          <ul className="mt-4 space-y-2">
            {entries.map((entry) => {
              const category = BUDGET_CATEGORIES.find((item) => item.id === entry.category) || BUDGET_CATEGORIES[5];
              return (
                <li key={entry.id} className={cx(t.surfaceAlt, "flex items-center gap-3 p-3")}>
                  <span className="h-8 w-1 shrink-0 rounded-full" style={{ background: hue(category) }} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{entry.label}</span>
                    <span className={cx("block text-[11px]", t.faint)}>{L(category.he, category.en)}</span>
                  </span>
                  <bdi className="shrink-0 text-sm font-semibold tabular-nums">{shekel(entry.amount)}</bdi>
                  <IconAction label={L("מחיקה", "Delete")} onClick={() => setEntries((list) => list.filter((row) => row.id !== entry.id))}>
                    <Trash2 size={13} />
                  </IconAction>
                </li>
              );
            })}
            {entries.length === 0 ? (
              <li className={cx("border border-dashed p-6 text-center text-sm", t.divider, t.faint)}>
                {L("אין עדיין הוצאות החודש", "No expenses logged yet")}
              </li>
            ) : null}
          </ul>
        </Card>

        <div className="grid content-start gap-4">
          <Card>
            <Slider
              label={L("הכנסה חודשית", "Monthly income")}
              value={income}
              min={0}
              max={60000}
              step={250}
              onChange={setIncome}
              format={shekel}
            />
            <Slider label={L("תקציב הוצאות", "Spending budget")} value={budget} min={0} max={60000} step={250} onChange={setBudget} format={shekel} />

            <p className={cx("mb-1.5 mt-4 flex items-center justify-between text-xs", t.muted)}>
              <span>{L("ניצול התקציב", "Budget used")}</span>
              <bdi className="font-semibold" style={{ color: overBudget ? STATUS.critical : "var(--a)" }}>
                {Math.round(budgetUsed)}%
              </bdi>
            </p>
            <div className={cx("h-2 w-full overflow-hidden rounded-full", t.track)}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${budgetUsed}%`, background: overBudget ? STATUS.critical : "var(--a)" }}
              />
            </div>
            <p className={cx("mt-2 text-xs", t.muted)}>
              {overBudget
                ? L(`חרגת ב-${shekel(spent - budget)}`, `Over budget by ${shekel(spent - budget)}`)
                : L(`נותרו ${shekel(budget - spent)} בתקציב`, `${shekel(budget - spent)} left in budget`)}
            </p>
          </Card>

          <Card>
            <p className={cx("mb-3 text-sm font-medium", t.heading)}>{L("פילוח לפי קטגוריה", "Breakdown by category")}</p>
            <div className={cx("flex h-3 w-full overflow-hidden rounded-full", t.track)}>
              {byCategory.map((category) => (
                <div
                  key={category.id}
                  style={{ width: `${(category.total / Math.max(1, spent)) * 100}%`, background: hue(category), outline: "2px solid var(--surface-gap, transparent)" }}
                  title={`${L(category.he, category.en)}: ${shekel(category.total)}`}
                />
              ))}
            </div>
            <ul className="mt-3 space-y-1.5 text-xs">
              {byCategory.map((category) => (
                <li key={category.id} className="flex items-center gap-2">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: hue(category) }} />
                  <span className={cx("flex-1", t.muted)}>{L(category.he, category.en)}</span>
                  <bdi className="font-medium tabular-nums">{shekel(category.total)}</bdi>
                </li>
              ))}
              {byCategory.length === 0 ? <li className={t.faint}>{L("אין נתונים להצגה", "Nothing to show yet")}</li> : null}
            </ul>
          </Card>
        </div>
      </div>

      {spec.showChart ? (
        <MiniBars
          label={L("מגמת הוצאות בחצי השנה האחרונה", "Spending over the last six months")}
          caption={L("ההוצאה של החודש הנוכחי מחושבת מהתנועות שהזנת.", "The final bar is calculated from the transactions you entered.")}
          data={L(MONTHS_HE, MONTHS_EN).map((month, index) => ({
            label: month,
            value: index === 5 ? spent : Math.round(spent * (0.72 + index * 0.06)),
            display: shekel(index === 5 ? spent : Math.round(spent * (0.72 + index * 0.06))),
          }))}
        />
      ) : null}
    </div>
  );
}

const KANBAN_COLUMNS = [
  { id: "backlog", name: "Backlog", nameHe: "ממתין" },
  { id: "doing", name: "In Progress", nameHe: "בביצוע" },
  { id: "done", name: "Done", nameHe: "הושלם" },
];
const PRIORITIES = ["low", "medium", "high"];
// Priority is a state, so it takes the reserved status palette (never a series slot)
const PRIORITY_COLOR = { low: "#7c7c76", medium: STATUS.warning, high: STATUS.critical };
const PRIORITY_HE = { low: "נמוכה", medium: "בינונית", high: "גבוהה" };

function KanbanApp({ spec, dark, onToggleDark }) {
  const t = useT();
  const L = useL();
  const [cards, setCards] = useState([
    { id: uid("card"), title: L("לכתוב רצף מיילים למשתמש חדש", "Draft onboarding email sequence"), column: "backlog", priority: "medium" },
    { id: uid("card"), title: L("לחבר webhook לחיובים", "Ship Stripe billing webhook"), column: "doing", priority: "high" },
    { id: uid("card"), title: L("לתקן גלישה בתפריט במובייל", "Fix mobile nav overflow"), column: "doing", priority: "low" },
    { id: uid("card"), title: L("לפרסם יומן שינויים 2.4", "Publish changelog v2.4"), column: "done", priority: "medium" },
  ]);
  const [draft, setDraft] = useState("");
  const [dragId, setDragId] = useState(null);
  const [overColumn, setOverColumn] = useState(null);
  // Under dir="rtl" the board flows right-to-left, so the chevrons swap too.
  const isHe = useIsHe();
  const BackIcon = isHe ? ChevronRight : ChevronLeft;
  const ForwardIcon = isHe ? ChevronLeft : ChevronRight;

  const done = cards.filter((card) => card.column === "done").length;
  const progress = cards.length ? Math.round((done / cards.length) * 100) : 0;

  const addCard = () => {
    const title = draft.trim();
    if (!title) return;
    setCards((list) => [...list, { id: uid("card"), title, column: "backlog", priority: "medium" }]);
    setDraft("");
  };

  const move = (id, direction) =>
    setCards((list) =>
      list.map((card) => {
        if (card.id !== id) return card;
        const index = KANBAN_COLUMNS.findIndex((column) => column.id === card.column);
        const next = clamp(index + direction, 0, KANBAN_COLUMNS.length - 1);
        return { ...card, column: KANBAN_COLUMNS[next].id };
      })
    );

  const cyclePriority = (id) =>
    setCards((list) =>
      list.map((card) =>
        card.id === id ? { ...card, priority: PRIORITIES[(PRIORITIES.indexOf(card.priority) + 1) % PRIORITIES.length] } : card
      )
    );

  const drop = (columnId) => {
    setOverColumn(null);
    if (!dragId) return;
    setCards((list) => list.map((card) => (card.id === dragId ? { ...card, column: columnId } : card)));
    setDragId(null);
  };

  return (
    <div className="p-[var(--pad)] md:p-6">
      <AppHeader spec={spec} dark={dark} onToggleDark={onToggleDark} />

      <div className="mb-4 flex gap-2">
        <input
          className={t.input}
          value={draft}
          placeholder={L("הוסף משימה ולחץ Enter…", "Add a task and press Enter…")}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") addCard();
          }}
        />
        <PreviewButton onClick={addCard} className="shrink-0">
          <Plus size={15} /> {L("הוסף", "Add")}
        </PreviewButton>
      </div>

      <div className="mb-5 flex items-center gap-3">
        <div className={cx("h-1.5 flex-1 overflow-hidden rounded-full", t.track)}>
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, background: "var(--a)" }} />
        </div>
        <span className={cx("shrink-0 text-xs", t.muted)}>
          <bdi className="tabular-nums">
            {done}/{cards.length}
          </bdi>{" "}
          {L("הושלמו", "done")}
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {KANBAN_COLUMNS.map((column) => {
          const columnCards = cards.filter((card) => card.column === column.id);
          return (
            <div
              key={column.id}
              onDragOver={(event) => {
                event.preventDefault();
                setOverColumn(column.id);
              }}
              onDragLeave={() => setOverColumn((current) => (current === column.id ? null : current))}
              onDrop={() => drop(column.id)}
              className={cx(
                t.surface,
                "p-[var(--pad)] min-h-[240px] transition",
                overColumn === column.id ? "ring-2 ring-[var(--a)] ring-offset-0" : ""
              )}
            >
              <div className="mb-3 flex items-center justify-between">
                <span className={cx("text-sm font-medium", t.heading)}>{L(column.nameHe, column.name)}</span>
                <span className={cx("rounded-full px-2 py-0.5 text-[11px] tabular-nums", t.chip)}>{columnCards.length}</span>
              </div>

              <div className="space-y-2">
                {columnCards.map((card) => (
                  <article
                    key={card.id}
                    draggable
                    onDragStart={() => setDragId(card.id)}
                    onDragEnd={() => setDragId(null)}
                    className={cx(
                      t.surfaceAlt,
                      "group cursor-grab p-3 transition active:cursor-grabbing",
                      dragId === card.id ? "opacity-40" : "hover:-translate-y-0.5"
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <GripVertical size={13} className={cx("mt-0.5 shrink-0", t.faint)} />
                      <p className="flex-1 text-sm leading-snug">{card.title}</p>
                    </div>
                    <div className="mt-2.5 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => cyclePriority(card.id)}
                        className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider transition"
                        style={{ color: PRIORITY_COLOR[card.priority], background: `${PRIORITY_COLOR[card.priority]}1f` }}
                        title={L("לחץ לשינוי עדיפות", "Click to change priority")}
                      >
                        {L(PRIORITY_HE[card.priority], card.priority)}
                      </button>
                      <span className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                        <IconAction
                          disabled={column.id === KANBAN_COLUMNS[0].id}
                          onClick={() => move(card.id, -1)}
                          label={L("העבר אחורה", "Move back")}
                        >
                          <BackIcon size={13} />
                        </IconAction>
                        <IconAction
                          disabled={column.id === KANBAN_COLUMNS[KANBAN_COLUMNS.length - 1].id}
                          onClick={() => move(card.id, 1)}
                          label={L("העבר קדימה", "Move forward")}
                        >
                          <ForwardIcon size={13} />
                        </IconAction>
                        <IconAction onClick={() => setCards((list) => list.filter((item) => item.id !== card.id))} label={L("מחיקה", "Delete")}>
                          <Trash2 size={13} />
                        </IconAction>
                      </span>
                    </div>
                  </article>
                ))}
                {columnCards.length === 0 ? (
                  <p className={cx("rounded-lg border border-dashed p-4 text-center text-xs", t.divider, t.faint)}>
                    {L("גרור לכאן כרטיס", "Drop a card here")}
                  </p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {spec.showChart ? (
        <MiniBars
          label={L("עומס משימות לפי עמודה", "Work in progress by column")}
          caption={L(
            "כדאי לשמור על עמודת הביצוע רזה — זו תקרת התפוקה האמיתית.",
            "Keep the middle column lean — that is your true throughput limit."
          )}
          data={KANBAN_COLUMNS.map((column) => ({
            label: L(column.nameHe, column.name.split(" ")[0]),
            value: cards.filter((card) => card.column === column.id).length,
          }))}
        />
      ) : null}
    </div>
  );
}

function IconAction({ children, onClick, label, disabled }) {
  const t = useT();
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cx("grid h-6 w-6 place-items-center rounded transition hover:bg-current/10", disabled ? "opacity-25" : t.muted)}
    >
      {children}
    </button>
  );
}

const CURRENCIES = ["$", "€", "£", "₪"];

function InvoiceApp({ spec, dark, onToggleDark }) {
  const t = useT();
  const L = useL();
  const [currency, setCurrency] = useState(L("₪", "$"));
  const [client, setClient] = useState(
    L(
      { name: "סטודיו צפון רוח", email: "hanhala@studio.co.il", address: "הרצל 12, תל אביב" },
      { name: "Northwind Studio", email: "ap@northwind.co", address: "12 Harbour Rd, Lisbon" }
    )
  );
  const [meta, setMeta] = useState({ number: "INV-0042", issued: "2026-08-03", due: "2026-08-17" });
  const [items, setItems] = useState([
    { id: uid("row"), description: L("ספרינט עיצוב מוצר", "Product design sprint"), qty: 1, rate: 4800 },
    { id: uid("row"), description: L("פיתוח צד לקוח", "Front-end implementation"), qty: 32, rate: 145 },
    { id: uid("row"), description: L("הטמעת אנליטיקס", "Analytics instrumentation"), qty: 6, rate: 145 },
  ]);
  const [taxRate, setTaxRate] = useState(17);
  const [discount, setDiscount] = useState(0);
  const [paid, setPaid] = useState(false);

  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + num(item.qty) * num(item.rate), 0);
    const discountValue = subtotal * (discount / 100);
    const discounted = subtotal - discountValue;
    const tax = discounted * (taxRate / 100);
    return { subtotal, discountValue, discounted, tax, total: discounted + tax };
  }, [items, taxRate, discount]);

  const update = (id, key, value) => setItems((list) => list.map((item) => (item.id === id ? { ...item, [key]: value } : item)));

  const exportInvoice = () => {
    const rows = items
      .map((item) => `${item.description}\t${item.qty}\t${currency}${item.rate}\t${money(num(item.qty) * num(item.rate), currency, 2)}`)
      .join("\n");
    const doc = [
      L(`חשבונית ${meta.number}`, `INVOICE ${meta.number}`),
      L(`הופקה ${meta.issued} · לתשלום עד ${meta.due}`, `Issued ${meta.issued} · Due ${meta.due}`),
      "",
      L(`לכבוד: ${client.name} <${client.email}>`, `Bill to: ${client.name} <${client.email}>`),
      client.address,
      "",
      L("תיאור\tכמות\tמחיר\tסה״כ", "Description\tQty\tRate\tAmount"),
      rows,
      "",
      L("ביניים", "Subtotal") + `\t${money(totals.subtotal, currency, 2)}`,
      L(`הנחה ${discount}%`, `Discount ${discount}%`) + `\t-${money(totals.discountValue, currency, 2)}`,
      L(`מע״מ ${taxRate}%`, `Tax ${taxRate}%`) + `\t${money(totals.tax, currency, 2)}`,
      L("סה״כ לתשלום", "TOTAL") + `\t${money(totals.total, currency, 2)}`,
      paid ? L("\nסטטוס: שולם", "\nSTATUS: PAID") : L("\nסטטוס: ממתין לתשלום", "\nSTATUS: OUTSTANDING"),
    ].join("\n");
    downloadFile(`${meta.number}.txt`, doc);
  };

  return (
    <div className="p-[var(--pad)] md:p-6">
      <AppHeader spec={spec} dark={dark} onToggleDark={onToggleDark} />

      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span
              className={cx("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider")}
              style={{
                background: paid ? `${STATUS.good}22` : `${STATUS.warning}22`,
                color: paid ? STATUS.good : STATUS.warning,
              }}
            >
              {paid ? <Check size={12} /> : <Clock size={12} />}
              {paid ? L("שולם", "Paid") : L("ממתין לתשלום", "Outstanding")}
            </span>
            <button type="button" onClick={() => setPaid((value) => !value)} className={cx("text-xs underline-offset-2 hover:underline", t.muted)}>
              {L("שינוי", "toggle")}
            </button>
          </div>
          <div className="flex gap-1">
            {CURRENCIES.map((symbol) => (
              <button
                key={symbol}
                type="button"
                onClick={() => setCurrency(symbol)}
                className={cx("h-8 w-8 text-sm font-semibold transition", currency === symbol ? t.btn : t.btnGhost)}
              >
                {symbol}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <LabeledInput label={L("לכבוד", "Bill to")} value={client.name} onChange={(value) => setClient({ ...client, name: value })} />
          <LabeledInput label={L("דוא״ל", "Email")} value={client.email} onChange={(value) => setClient({ ...client, email: value })} />
          <LabeledInput label={L("מס׳ חשבונית", "Invoice #")} value={meta.number} onChange={(value) => setMeta({ ...meta, number: value })} />
          <LabeledInput label={L("כתובת", "Address")} value={client.address} onChange={(value) => setClient({ ...client, address: value })} />
          <LabeledInput label={L("תאריך הפקה", "Issued")} type="date" value={meta.issued} onChange={(value) => setMeta({ ...meta, issued: value })} />
          <LabeledInput label={L("לתשלום עד", "Due")} type="date" value={meta.due} onChange={(value) => setMeta({ ...meta, due: value })} />
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className={cx("text-start text-[11px] uppercase tracking-wider", t.faint)}>
                <th className="pb-2 font-medium">{L("תיאור", "Description")}</th>
                <th className="w-20 pb-2 font-medium">{L("כמות", "Qty")}</th>
                <th className="w-28 pb-2 font-medium">{L("מחיר", "Rate")}</th>
                <th className="w-28 pb-2 text-end font-medium">{L("סה״כ", "Amount")}</th>
                <th className="w-8 pb-2" />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className={cx("border-t", t.divider)}>
                  <td className="py-2 pr-2">
                    <input className={t.input} value={item.description} onChange={(event) => update(item.id, "description", event.target.value)} />
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      type="number"
                      min="0"
                      className={t.input}
                      value={item.qty}
                      onChange={(event) => update(item.id, "qty", event.target.value)}
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      type="number"
                      min="0"
                      className={t.input}
                      value={item.rate}
                      onChange={(event) => update(item.id, "rate", event.target.value)}
                    />
                  </td>
                  <td className="py-2 text-end font-semibold">
                    <bdi className="tabular-nums">{money(num(item.qty) * num(item.rate), currency, 2)}</bdi>
                  </td>
                  <td className="py-2 text-end">
                    <IconAction label={L("מחיקת שורה", "Remove line")} onClick={() => setItems((list) => list.filter((row) => row.id !== item.id))}>
                      <Trash2 size={13} />
                    </IconAction>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button
          type="button"
          onClick={() => setItems((list) => [...list, { id: uid("row"), description: L("שורה חדשה", "New line item"), qty: 1, rate: 0 }])}
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium"
          style={{ color: "var(--a)" }}
        >
          <Plus size={14} /> {L("הוסף שורה", "Add line item")}
        </button>

        <div className={cx("mt-5 flex flex-col gap-4 border-t pt-4 md:flex-row md:items-end md:justify-between", t.divider)}>
          <div className="flex gap-3">
            <LabeledInput label={L("מע״מ %", "Tax %")} type="number" value={taxRate} onChange={(value) => setTaxRate(num(value))} className="w-24" />
            <LabeledInput label={L("הנחה %", "Discount %")} type="number" value={discount} onChange={(value) => setDiscount(num(value))} className="w-28" />
          </div>

          <dl className="w-full space-y-1.5 text-sm md:w-72">
            <Row label={L("ביניים", "Subtotal")} value={money(totals.subtotal, currency, 2)} muted={t.muted} />
            {discount > 0 ? (
              <Row label={L(`הנחה ${discount}%`, `Discount ${discount}%`)} value={`-${money(totals.discountValue, currency, 2)}`} muted={t.muted} />
            ) : null}
            <Row label={L(`מע״מ ${taxRate}%`, `Tax ${taxRate}%`)} value={money(totals.tax, currency, 2)} muted={t.muted} />
            <div className={cx("flex items-center justify-between border-t pt-2", t.divider)}>
              <dt className="font-semibold">{L("סה״כ לתשלום", "Total due")}</dt>
              <dd className="text-xl font-semibold" style={{ color: "var(--a)" }}>
                <bdi className="tabular-nums">{money(totals.total, currency, 2)}</bdi>
              </dd>
            </div>
          </dl>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <PreviewButton onClick={exportInvoice}>
            <Download size={14} /> {L("ייצוא חשבונית", "Export invoice")}
          </PreviewButton>
          <PreviewButton variant="ghost" onClick={() => window.print()}>
            <Printer size={14} /> {L("הדפסה", "Print")}
          </PreviewButton>
        </div>
      </Card>

      {spec.showChart ? (
        <MiniBars
          label={L("הכנסה לפי שורת חיוב", "Revenue by line item")}
          data={items.map((item) => ({
            label: item.description.split(" ")[0].slice(0, 6),
            value: num(item.qty) * num(item.rate),
            display: money(num(item.qty) * num(item.rate), currency, 2),
          }))}
        />
      ) : null}
    </div>
  );
}

function Row({ label, value, muted }) {
  return (
    <div className="flex items-center justify-between">
      <dt className={muted}>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}

function LabeledInput({ label, value, onChange, type = "text", className }) {
  const t = useT();
  return (
    <label className={cx("block", className)}>
      <span className={cx("mb-1 block text-[11px] font-medium uppercase tracking-wider", t.faint)}>{label}</span>
      <input type={type} className={t.input} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function RoiApp({ spec, dark, onToggleDark }) {
  const t = useT();
  const L = useL();
  const [seats, setSeats] = useState(180);
  const [price, setPrice] = useState(39);
  const [churn, setChurn] = useState(3.5);
  const [cac, setCac] = useState(420);
  const [growth, setGrowth] = useState(7);
  const [grossMargin, setGrossMargin] = useState(82);

  const model = useMemo(() => {
    const mrr = seats * price;
    const lifetimeMonths = 100 / Math.max(0.2, churn);
    const contribution = price * (grossMargin / 100);
    const ltv = contribution * lifetimeMonths;
    const payback = cac / Math.max(0.01, contribution);
    const projection = [];
    let running = mrr;
    for (let month = 0; month < 12; month += 1) {
      running = running * (1 + growth / 100) * (1 - churn / 100);
      projection.push(running);
    }
    return {
      mrr,
      arr: mrr * 12,
      ltv,
      ratio: ltv / Math.max(1, cac),
      payback,
      projection,
      exitArr: projection[projection.length - 1] * 12,
      lifetimeMonths,
    };
  }, [seats, price, churn, cac, growth, grossMargin]);

  const healthy = model.ratio >= 3;

  return (
    <div className="p-[var(--pad)] md:p-6">
      <AppHeader spec={spec} dark={dark} onToggleDark={onToggleDark} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="MRR" value={money(model.mrr)} hint={L(`${seats} מנויים × ${money(price)}`, `${seats} seats × ${money(price)}`)} />
        <Stat label="ARR" value={money(model.arr)} hint={L("קצב שנתי נוכחי", "Current run rate")} />
        <Stat
          label="LTV"
          value={money(model.ltv)}
          hint={L(`${model.lifetimeMonths.toFixed(0)} חודשי חיים ממוצעים`, `${model.lifetimeMonths.toFixed(0)} month lifetime`)}
        />
        <Stat
          label="LTV : CAC"
          value={`${model.ratio.toFixed(1)}×`}
          tone={healthy ? undefined : "warn"}
          hint={healthy ? L("בריא — מעל 3×", "Healthy — above 3×") : L("מתחת ל-3× — עלות גיוס גבוהה", "Below 3× — CAC too high")}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <p className={cx("mb-4 flex items-center gap-2 text-sm font-medium", t.heading)}>
            <Gauge size={15} style={{ color: "var(--a)" }} /> {L("נתוני המודל", "Model inputs")}
          </p>
          <Slider label={L("מנויים משלמים", "Paying seats")} value={seats} min={10} max={2000} step={10} onChange={setSeats} />
          <Slider label={L("מחיר למנוי לחודש", "Price per seat / mo")} value={price} min={5} max={400} onChange={setPrice} format={(v) => money(v)} />
          <Slider label={L("נטישה חודשית", "Monthly churn")} value={churn} min={0.5} max={12} step={0.1} onChange={setChurn} format={(v) => `${v.toFixed(1)}%`} />
          <Slider label={L("עלות גיוס לקוח", "Blended CAC")} value={cac} min={50} max={3000} step={10} onChange={setCac} format={(v) => money(v)} />
          <Slider label={L("צמיחה חודשית", "Monthly growth")} value={growth} min={0} max={25} step={0.5} onChange={setGrowth} format={(v) => `${v}%`} />
          <Slider label={L("רווח גולמי", "Gross margin")} value={grossMargin} min={40} max={95} onChange={setGrossMargin} format={(v) => `${v}%`} />
        </Card>

        <div className="grid content-start gap-4">
          <Card className="flex h-full flex-col">
            <p className={cx("mb-3 flex items-center gap-2 text-sm font-medium", t.heading)}>
              <TrendingUp size={15} style={{ color: "var(--a)" }} /> {L("תחזית הכנסות ל-12 חודשים", "12-month MRR projection")}
            </p>
            <div className="flex h-40 items-end gap-1.5">
              {model.projection.map((value, index) => (
                <div
                  key={index}
                  className="flex-1 rounded-t transition-all duration-500 ease-out hover:opacity-100"
                  style={{
                    height: `${clamp((value / Math.max(...model.projection)) * 100, 5, 100)}%`,
                    background: "var(--a)",
                    opacity: 0.4 + (index / 12) * 0.6,
                  }}
                  title={L(`חודש ${index + 1}: ${money(value)}`, `Month ${index + 1}: ${money(value)}`)}
                />
              ))}
            </div>
            <div className={cx("mt-3 flex flex-wrap items-center justify-between gap-x-3 text-xs", t.muted)}>
              <span>{L("חודש 1", "Month 1")}</span>
              <span className="font-medium" style={{ color: "var(--a)" }}>
                {L("ARR בסוף התקופה", "Exit ARR")} <bdi className="tabular-nums">{money(model.exitArr)}</bdi>
              </span>
              <span>{L("חודש 12", "Month 12")}</span>
            </div>
          </Card>
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <Stat
          label={L("החזר עלות גיוס", "CAC payback")}
          value={L(`${model.payback.toFixed(1)} חוד׳`, `${model.payback.toFixed(1)} mo`)}
          hint={
            model.payback <= 12
              ? L("מתחת ל-12 חודשים — בר מימון", "Under 12 months — fundable")
              : L("איטי מ-12 חודשים", "Slower than 12 months")
          }
          tone={model.payback <= 12 ? undefined : "warn"}
        />
        <Card className="sm:col-span-2">
          <p className={cx("text-[10px] font-semibold uppercase tracking-[0.14em]", t.faint)}>{L("שורה תחתונה", "Verdict")}</p>
          <p className="mt-1.5 flex items-center gap-2 text-sm font-medium">
            {healthy ? <ShieldCheck size={16} style={{ color: STATUS.good }} /> : <Flame size={16} style={{ color: STATUS.warning }} />}
            {healthy ? L("אפשר להגדיל גיוס לקוחות", "Scale acquisition") : L("קודם לטפל בנטישה", "Fix retention before scaling")}
          </p>
          <p className={cx("mt-1 text-xs leading-relaxed", t.muted)}>
            {healthy
              ? L(
                  `כל לקוח מחזיר פי ${model.ratio.toFixed(1)} מעלות הגיוס שלו לאורך ${model.lifetimeMonths.toFixed(0)} חודשים — שווה להשקיע יותר במה שכבר עובד.`,
                  `Each customer returns ${model.ratio.toFixed(1)}× their acquisition cost over a ${model.lifetimeMonths.toFixed(0)} month lifetime — spend more on what already works.`
                )
              : L(
                  `בנטישה של ${churn.toFixed(1)}% בחודש, לקוח שווה ${money(model.ltv)} מול עלות גיוס של ${money(cac)}. צריך להוריד נטישה או להעלות מחיר.`,
                  `At ${churn.toFixed(1)}% monthly churn a customer is only worth ${money(model.ltv)} against ${money(cac)} of CAC. Lower churn or raise price first.`
                )}
          </p>
        </Card>
      </div>
    </div>
  );
}

const TRACKER_FILTERS = ["all", "active", "done"];
const TRACKER_FILTERS_HE = { all: "הכול", active: "פתוחות", done: "הושלמו" };

function TrackerApp({ spec, dark, onToggleDark }) {
  const t = useT();
  const L = useL();
  const [items, setItems] = useState([
    { id: uid("item"), label: L("לאמת את הרעיון מול 5 משתמשים", "Validate the idea with 5 target users"), done: true, priority: "high" },
    { id: uid("item"), label: L("לשרטט את הזרימה המרכזית", "Sketch the core flow end to end"), done: false, priority: "medium" },
    { id: uid("item"), label: L("להעלות דף נחיתה", "Ship the landing page"), done: false, priority: "high" },
    { id: uid("item"), label: L("להטמיע אנליטיקס ומעקב שגיאות", "Set up analytics + error tracking"), done: false, priority: "low" },
  ]);
  const [draft, setDraft] = useState("");
  const [filter, setFilter] = useState("all");

  const done = items.filter((item) => item.done).length;
  const percent = items.length ? Math.round((done / items.length) * 100) : 0;
  const visible = items.filter((item) => (filter === "all" ? true : filter === "done" ? item.done : !item.done));

  const add = () => {
    const label = draft.trim();
    if (!label) return;
    setItems((list) => [{ id: uid("item"), label, done: false, priority: "medium" }, ...list]);
    setDraft("");
  };

  const circumference = 2 * Math.PI * 52;

  return (
    <div className="p-[var(--pad)] md:p-6">
      <AppHeader spec={spec} dark={dark} onToggleDark={onToggleDark} />

      <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
        <Card>
          <div className="flex gap-2">
            <input
              className={t.input}
              value={draft}
              placeholder={L("מה צריך לעשות?", "What needs doing?")}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") add();
              }}
            />
            <PreviewButton onClick={add} className="shrink-0">
              <Plus size={15} /> {L("הוסף", "Add")}
            </PreviewButton>
          </div>

          <div className="mt-3 flex gap-2">
            {TRACKER_FILTERS.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={cx(
                  "px-3 py-1 text-xs font-medium capitalize transition",
                  filter === value ? t.btn : t.chip,
                  filter === value ? "" : "hover:opacity-80"
                )}
              >
                {L(TRACKER_FILTERS_HE[value], value)}
                <bdi className="ms-1.5 opacity-60 tabular-nums">
                  {value === "all" ? items.length : value === "done" ? done : items.length - done}
                </bdi>
              </button>
            ))}
          </div>

          <ul className="mt-4 space-y-2">
            {visible.map((item) => (
              <li key={item.id} className={cx(t.surfaceAlt, "flex items-center gap-3 p-3 transition")}>
                <input
                  type="checkbox"
                  checked={item.done}
                  onChange={() => setItems((list) => list.map((row) => (row.id === item.id ? { ...row, done: !row.done } : row)))}
                  className="h-4 w-4 cursor-pointer"
                  style={{ accentColor: "var(--a)" }}
                />
                <span className={cx("flex-1 text-sm", item.done ? "line-through opacity-45" : "")}>{item.label}</span>
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: PRIORITY_COLOR[item.priority], background: `${PRIORITY_COLOR[item.priority]}1f` }}
                >
                  {L(PRIORITY_HE[item.priority], item.priority)}
                </span>
                <IconAction label={L("מחיקה", "Delete")} onClick={() => setItems((list) => list.filter((row) => row.id !== item.id))}>
                  <Trash2 size={13} />
                </IconAction>
              </li>
            ))}
            {visible.length === 0 ? (
              <li className={cx("rounded-lg border border-dashed p-6 text-center text-sm", t.divider, t.faint)}>
                {L("אין כאן כלום עדיין.", "Nothing here yet.")}
              </li>
            ) : null}
          </ul>
        </Card>

        <Card className="grid content-center justify-items-center text-center">
          <svg viewBox="0 0 120 120" className="h-32 w-32 -rotate-90">
            <circle cx="60" cy="60" r="52" fill="none" strokeWidth="10" stroke="currentColor" opacity="0.12" />
            <circle
              cx="60"
              cy="60"
              r="52"
              fill="none"
              strokeWidth="10"
              strokeLinecap="round"
              stroke="var(--a)"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - percent / 100)}
              className="transition-all duration-700 ease-out"
            />
          </svg>
          <p className="-mt-2 text-3xl font-semibold">
            <bdi className="tabular-nums">{percent}%</bdi>
          </p>
          <p className={cx("text-sm", t.muted)}>
            {L(`${done} מתוך ${items.length} הושלמו`, `${done} of ${items.length} complete`)}
          </p>
          <PreviewButton variant="ghost" className="mt-3" onClick={() => setItems((list) => list.map((item) => ({ ...item, done: false })))}>
            <RefreshCw size={13} /> {L("איפוס השבוע", "Reset week")}
          </PreviewButton>
        </Card>
      </div>

      {spec.showChart ? (
        <MiniBars
          label={L("השלמות השבוע", "Completions this week")}
          data={L(["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"], ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]).map((day, index) => ({
            label: day,
            value: [2, 4, 3, 5, done + 1, 6, done + 2][index],
          }))}
        />
      ) : null}
    </div>
  );
}

const APP_RENDERERS = {
  banking: BankingApp,
  landing: LandingApp,
  booking: BookingApp,
  rate: RateCalculatorApp,
  kanban: KanbanApp,
  invoice: InvoiceApp,
  roi: RoiApp,
  budget: BudgetApp,
  tracker: TrackerApp,
};

/* ==================================================================
   8. Application state machine
   ================================================================== */

const GEN_STEPS = [
  { id: "analyze", label: "Analyzing system architecture & user logic", icon: Cpu, detail: "parsing intent → component graph" },
  { id: "components", label: "Generating dynamic React components with Tailwind CSS", icon: Blocks, detail: "12 components · 340 utility classes" },
  { id: "state", label: "Injecting state management & mock data", icon: Braces, detail: "useState · useMemo · seeded fixtures" },
  { id: "render", label: "Rendering interactive preview canvas", icon: MousePointerClick, detail: "hydrating sandbox iframe" },
];

const initialState = {
  phase: "landing", // landing | generating | workspace
  prompt: "",
  styleId: "modern-dark",
  forcedId: null,
  pendingSpec: null,
  spec: null,
  code: "",
  changedLines: [],
  view: "split",
  stepIndex: 0,
  versions: [],
  activeVersion: 0,
  refine: "",
};

function reducer(state, action) {
  switch (action.type) {
    case "SET_PROMPT":
      return { ...state, prompt: action.value, forcedId: null };

    case "PICK_PRESET":
      return { ...state, prompt: action.blueprint.prompt, forcedId: action.blueprint.id };

    case "SET_STYLE":
      return { ...state, styleId: action.value };

    case "START": {
      const spec = resolveSpec(action.prompt, state.styleId, state.forcedId);
      return { ...state, phase: "generating", prompt: action.prompt, pendingSpec: spec, stepIndex: 0 };
    }

    case "STEP":
      return { ...state, stepIndex: Math.min(GEN_STEPS.length, state.stepIndex + 1) };

    case "FINISH": {
      const spec = state.pendingSpec;
      const code = buildCode(spec);
      const version = { id: uid("v"), label: "v1", spec, code, notes: ["initial generation"], at: Date.now() };
      return {
        ...state,
        phase: "workspace",
        spec,
        code,
        changedLines: [],
        versions: [version],
        activeVersion: 0,
        view: "split",
      };
    }

    case "SET_VIEW":
      return { ...state, view: action.value };

    case "SET_REFINE":
      return { ...state, refine: action.value };

    case "REFINE": {
      if (!state.spec) return state;
      const { patch, notes } = interpretRefinement(action.text, state.spec);
      const nextSpec = { ...state.spec, ...patch };
      const nextCode = buildCode(nextSpec);
      const previous = new Set(state.code.split("\n"));
      const changed = nextCode.split("\n").filter((line) => !previous.has(line));
      const version = {
        id: uid("v"),
        label: `v${state.versions.length + 1}`,
        spec: nextSpec,
        code: nextCode,
        notes,
        request: action.text.trim(),
        at: Date.now(),
      };
      return {
        ...state,
        spec: nextSpec,
        code: nextCode,
        changedLines: changed,
        versions: [...state.versions, version],
        activeVersion: state.versions.length,
        refine: "",
      };
    }

    case "SELECT_VERSION": {
      const version = state.versions[action.index];
      if (!version) return state;
      return { ...state, activeVersion: action.index, spec: version.spec, code: version.code, changedLines: [] };
    }

    case "HYDRATE": {
      const spec = action.spec;
      const code = buildCode(spec);
      return {
        ...state,
        phase: "workspace",
        prompt: spec.prompt,
        styleId: spec.styleId,
        spec,
        code,
        changedLines: [],
        versions: [{ id: uid("v"), label: "v1", spec, code, notes: ["restored from shared link"], at: Date.now() }],
        activeVersion: 0,
        view: "split",
      };
    }

    case "RESET":
      return { ...initialState, styleId: state.styleId };

    default:
      return state;
  }
}

/* ==================================================================
   9. Chrome — motion, toasts, shared shell pieces
   ================================================================== */

const KEYFRAMES = `
@keyframes aab-float { 0%,100% { transform: translate3d(0,0,0) scale(1); } 50% { transform: translate3d(0,-26px,0) scale(1.06); } }
@keyframes aab-rise { from { opacity: 0; transform: translate3d(0,14px,0); } to { opacity: 1; transform: none; } }
@keyframes aab-pop { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: none; } }
@keyframes aab-sweep { from { background-position: 200% 0; } to { background-position: -200% 0; } }
@keyframes aab-blink { 0%,49% { opacity: 1; } 50%,100% { opacity: 0; } }
@keyframes aab-scan { from { transform: translateY(-100%); } to { transform: translateY(400%); } }
.aab-rise { animation: aab-rise .5s cubic-bezier(.16,1,.3,1) both; }
.aab-pop { animation: aab-pop .35s cubic-bezier(.16,1,.3,1) both; }
.aab-float { animation: aab-float 11s ease-in-out infinite; }
.aab-shimmer {
  background: linear-gradient(90deg, rgba(255,255,255,0) 20%, rgba(255,255,255,.55) 50%, rgba(255,255,255,0) 80%);
  background-size: 200% 100%;
  animation: aab-sweep 2.2s linear infinite;
  -webkit-background-clip: text; background-clip: text; color: transparent;
}
.aab-caret::after { content: "▌"; animation: aab-blink 1s step-end infinite; margin-left: 2px; }
.aab-grid {
  background-image: linear-gradient(rgba(255,255,255,.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.045) 1px, transparent 1px);
  background-size: 64px 64px;
  mask-image: radial-gradient(ellipse 80% 60% at 50% 0%, #000 40%, transparent 100%);
  -webkit-mask-image: radial-gradient(ellipse 80% 60% at 50% 0%, #000 40%, transparent 100%);
}
.aab-scroll::-webkit-scrollbar { width: 10px; height: 10px; }
.aab-scroll::-webkit-scrollbar-track { background: transparent; }
.aab-scroll::-webkit-scrollbar-thumb { background: rgba(148,163,184,.22); border-radius: 999px; border: 3px solid transparent; background-clip: content-box; }
.aab-scroll::-webkit-scrollbar-thumb:hover { background: rgba(148,163,184,.4); background-clip: content-box; }
`;

function GlobalStyles() {
  return <style dangerouslySetInnerHTML={{ __html: KEYFRAMES }} />;
}

function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
      <div className="aab-pop flex items-center gap-2.5 rounded-full border border-white/15 bg-slate-900/90 px-4 py-2.5 text-sm text-white shadow-[0_20px_60px_-20px_rgba(0,0,0,0.9)] backdrop-blur-xl">
        <span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-400/20 text-emerald-300">
          <Check size={12} />
        </span>
        {toast.message}
      </div>
    </div>
  );
}

function Logo({ compact }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="relative grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-[0_8px_24px_-8px_rgba(139,92,246,0.9)]">
        <Sparkles size={17} className="text-white" />
      </span>
      {!compact ? (
        <span className="text-[15px] font-semibold tracking-tight text-white">
          AI App Builder
          <span className="ml-1.5 rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 align-middle text-[10px] font-medium text-slate-400">
            beta
          </span>
        </span>
      ) : null}
    </div>
  );
}

/* ==================================================================
   10. State A — Landing
   ================================================================== */

function Landing({ state, dispatch, onGenerate }) {
  const textareaRef = useRef(null);
  const style = STYLE_BY_ID[state.styleId];
  const canGenerate = state.prompt.trim().length > 3;

  const surprise = () => {
    const pick = SURPRISE_IDEAS[Math.floor(Math.random() * SURPRISE_IDEAS.length)];
    dispatch({ type: "SET_PROMPT", value: pick });
    textareaRef.current?.focus();
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#07070c] text-slate-200">
      <div className="pointer-events-none absolute inset-0 aab-grid" />
      <div
        className="pointer-events-none absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full blur-[130px] aab-float"
        style={{ background: "radial-gradient(circle, rgba(139,92,246,.45), transparent 65%)" }}
      />
      <div
        className="pointer-events-none absolute -right-32 top-24 h-[460px] w-[460px] rounded-full blur-[130px] aab-float"
        style={{ background: "radial-gradient(circle, rgba(34,211,238,.32), transparent 65%)", animationDelay: "-4s" }}
      />

      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Logo />
        <nav className="flex items-center gap-2">
          <span className="hidden items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-400 sm:flex">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            Generator online
          </span>
          <a
            href="#pricing"
            className="rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-sm text-slate-200 transition hover:bg-white/10"
          >
            Pricing
          </a>
        </nav>
      </header>

      <main className="relative z-10 mx-auto max-w-4xl px-6 pb-24 pt-8 text-center sm:pt-14">
        <div className="aab-rise flex flex-wrap items-center justify-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-xs text-slate-300 backdrop-blur">
            <Zap size={13} className="text-violet-300" />
            Ships working React, not screenshots
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-xs text-slate-300 backdrop-blur">
            <Languages size={13} className="text-cyan-300" />
            <bdi dir="rtl" lang="he">עברית ו‑RTL נתמכים</bdi>
          </span>
        </div>

        <h1
          className="aab-rise mt-6 text-4xl font-semibold leading-[1.08] tracking-tight text-white sm:text-6xl"
          style={{ animationDelay: "60ms" }}
        >
          Turn any idea into a
          <br className="hidden sm:block" />{" "}
          <span className="bg-gradient-to-r from-violet-300 via-fuchsia-200 to-cyan-300 bg-clip-text text-transparent">
            functional app
          </span>{" "}
          in seconds
        </h1>

        <p className="aab-rise mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-slate-400" style={{ animationDelay: "120ms" }}>
          Describe the tool you wish existed. Watch it get architected, generated and rendered — then keep refining it in plain English until
          it is exactly right.
        </p>

        <div className="aab-rise mt-9" style={{ animationDelay: "180ms" }}>
          <div className="group relative rounded-3xl border border-white/10 bg-white/[0.035] p-2 shadow-[0_40px_120px_-50px_rgba(139,92,246,0.8)] backdrop-blur-xl transition focus-within:border-violet-400/50">
            <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-r from-violet-500/10 via-transparent to-cyan-500/10 opacity-0 transition group-focus-within:opacity-100" />
            <textarea
              ref={textareaRef}
              value={state.prompt}
              onChange={(event) => dispatch({ type: "SET_PROMPT", value: event.target.value })}
              onKeyDown={(event) => {
                if ((event.metaKey || event.ctrlKey) && event.key === "Enter" && canGenerate) onGenerate(state.prompt);
              }}
              rows={4}
              dir="auto"
              placeholder="e.g. A freelance rate calculator that turns my salary goal into an hourly rate — or write in Hebrew: תכין לי אפליקציה לניהול כספים"
              className="relative w-full resize-none bg-transparent px-4 py-3.5 text-left text-[15px] leading-relaxed text-white outline-none placeholder:text-slate-500"
            />
            <div className="relative flex flex-wrap items-center justify-between gap-3 px-2 pb-1 pt-1">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={surprise}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-slate-400 transition hover:bg-white/5 hover:text-slate-200"
                >
                  <Shuffle size={13} /> Surprise me
                </button>
                <span className="hidden text-xs text-slate-600 sm:inline">{state.prompt.trim().length} characters</span>
              </div>
              <button
                type="button"
                disabled={!canGenerate}
                onClick={() => onGenerate(state.prompt)}
                className={cx(
                  "inline-flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-semibold transition",
                  canGenerate
                    ? "bg-gradient-to-r from-violet-500 to-indigo-500 text-white shadow-[0_14px_40px_-14px_rgba(139,92,246,1)] hover:brightness-110 active:scale-[0.98]"
                    : "cursor-not-allowed bg-white/5 text-slate-500"
                )}
              >
                <Wand2 size={15} />
                Generate App
                <kbd className="ml-1 hidden items-center gap-0.5 rounded border border-white/20 px-1.5 py-0.5 text-[10px] font-medium opacity-80 sm:inline-flex">
                  <Command size={9} />
                  <CornerDownLeft size={9} />
                </kbd>
              </button>
            </div>
          </div>
        </div>

        <div className="aab-rise mt-10 text-left" style={{ animationDelay: "240ms" }}>
          <p className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
            <Lightbulb size={13} /> Start from a template
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {PRESETS.map((preset, index) => {
              const Icon = preset.icon;
              const active = state.forcedId === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => dispatch({ type: "PICK_PRESET", blueprint: preset })}
                  onDoubleClick={() => onGenerate(preset.prompt, preset.id)}
                  className={cx(
                    "group relative overflow-hidden rounded-2xl border p-4 text-left transition",
                    // An odd preset count would leave a lonely half-width card.
                    index === PRESETS.length - 1 && PRESETS.length % 2 === 1 ? "sm:col-span-2" : "",
                    active
                      ? "border-violet-400/60 bg-violet-500/10 shadow-[0_10px_40px_-18px_rgba(139,92,246,0.9)]"
                      : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]"
                  )}
                  style={{ animationDelay: `${260 + index * 40}ms` }}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={cx(
                        "grid h-10 w-10 shrink-0 place-items-center rounded-xl border transition",
                        active ? "border-violet-400/40 bg-violet-500/20 text-violet-200" : "border-white/10 bg-white/5 text-slate-300"
                      )}
                    >
                      <Icon size={17} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 text-sm font-medium text-white">
                        {preset.name}
                        <ArrowUpRight size={13} className="opacity-0 transition group-hover:opacity-60" />
                      </p>
                      <p className="mt-0.5 truncate text-xs text-slate-400">{preset.subtitle}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {preset.tags.map((tag) => (
                          <span key={tag} className="rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] text-slate-400">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="aab-rise mt-10 text-left" style={{ animationDelay: "300ms" }}>
          <p className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
            <Palette size={13} /> Output style
          </p>
          <div className="flex flex-wrap gap-2">
            {STYLES.map((option) => {
              const active = option.id === state.styleId;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => dispatch({ type: "SET_STYLE", value: option.id })}
                  className={cx(
                    "group flex items-center gap-2.5 rounded-full border px-3.5 py-2 text-sm transition",
                    active
                      ? "border-white/25 bg-white/10 text-white shadow-[0_8px_30px_-14px_rgba(255,255,255,0.6)]"
                      : "border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/20 hover:text-slate-200"
                  )}
                >
                  <span className="flex -space-x-1">
                    <span className="h-3.5 w-3.5 rounded-full ring-2 ring-[#07070c]" style={{ background: option.accent }} />
                    <span className="h-3.5 w-3.5 rounded-full ring-2 ring-[#07070c]" style={{ background: option.accent2 }} />
                  </span>
                  {option.name}
                  {active ? <Check size={13} className="text-violet-300" /> : null}
                </button>
              );
            })}
          </div>
          <p className="mt-2.5 text-xs text-slate-500">{style.blurb}</p>
        </div>

        <div id="pricing" className="mt-16 grid gap-3 sm:grid-cols-3">
          {[
            {
              icon: Boxes,
              title: `${BLUEPRINTS.length} app archetypes`,
              body: "Finance, calculators, boards, invoices and trackers — all interactive.",
            },
            { icon: Terminal, title: "Readable source", body: "Every render ships with the matching Tailwind + React code." },
            { icon: Languages, title: "Hebrew & RTL", body: "Prompt in Hebrew and the app, labels and code come back right-to-left." },
          ].map((feature) => (
            <div key={feature.title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left">
              <feature.icon size={16} className="text-violet-300" />
              <p className="mt-2.5 text-sm font-medium text-white">{feature.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">{feature.body}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

/* ==================================================================
   11. State B — Generation
   ================================================================== */

function Generating({ state, onCancel }) {
  const spec = state.pendingSpec;
  const blueprint = spec ? BLUEPRINT_BY_ID[spec.appId] : BLUEPRINTS[0];
  const progress = Math.round((state.stepIndex / GEN_STEPS.length) * 100);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#07070c] px-6 text-slate-200">
      <div className="pointer-events-none absolute inset-0 aab-grid" />
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[560px] w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[120px]"
        style={{ background: "radial-gradient(circle, rgba(139,92,246,.35), transparent 65%)" }}
      />

      <div className="relative z-10 w-full max-w-2xl">
        <div className="aab-pop rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_50px_120px_-40px_rgba(0,0,0,1)] backdrop-blur-2xl sm:p-8">
          <div className="flex items-center gap-3">
            <span className="relative grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600">
              <Loader2 size={19} className="animate-spin text-white" />
              <span className="absolute inset-0 animate-ping rounded-2xl bg-violet-500/30" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white">Building your app</p>
              <p dir="auto" className="truncate text-xs text-slate-400">
                {state.prompt}
              </p>
            </div>
            <button
              type="button"
              onClick={onCancel}
              className="ml-auto grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/10 text-slate-400 transition hover:bg-white/5 hover:text-white"
              aria-label="Cancel generation"
            >
              <X size={15} />
            </button>
          </div>

          <div className="mt-6 h-1 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-400 to-cyan-300 transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          <ol className="mt-6 space-y-1">
            {GEN_STEPS.map((step, index) => {
              const done = index < state.stepIndex;
              const active = index === state.stepIndex;
              const Icon = step.icon;
              return (
                <li
                  key={step.id}
                  className={cx(
                    "flex items-center gap-3 rounded-xl px-3 py-3 transition-all duration-300",
                    active ? "bg-white/[0.06]" : "bg-transparent",
                    done || active ? "opacity-100" : "opacity-35"
                  )}
                >
                  <span
                    className={cx(
                      "grid h-7 w-7 shrink-0 place-items-center rounded-full border transition",
                      done
                        ? "border-emerald-400/40 bg-emerald-400/15 text-emerald-300"
                        : active
                        ? "border-violet-400/50 bg-violet-500/15 text-violet-200"
                        : "border-white/10 text-slate-500"
                    )}
                  >
                    {done ? <Check size={13} /> : active ? <Loader2 size={13} className="animate-spin" /> : <Icon size={13} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={cx("block text-sm", done ? "text-slate-300" : active ? "text-white" : "text-slate-500")}>
                      {step.label}
                    </span>
                    <span className="block truncate font-mono text-[11px] text-slate-500">{step.detail}</span>
                  </span>
                  {done ? <span className="font-mono text-[11px] text-emerald-400/80">done</span> : null}
                </li>
              );
            })}
          </ol>

          <div className="mt-6 rounded-2xl border border-white/10 bg-black/40 p-4 font-mono text-[11.5px] leading-relaxed text-slate-400">
            <p className="text-slate-500">$ builder generate --style={state.styleId}</p>
            {GEN_STEPS.slice(0, state.stepIndex).map((step) => (
              <p key={step.id} className="text-emerald-300/90">
                ✓ {step.id} <span className="text-slate-600">({step.detail})</span>
              </p>
            ))}
            <p className={cx("text-slate-300", state.stepIndex < GEN_STEPS.length ? "aab-caret" : "")}>
              {state.stepIndex < GEN_STEPS.length ? `→ resolving ${blueprint.name.toLowerCase()} blueprint` : "✓ ready"}
            </p>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-slate-500">
          Matched blueprint: <span className="text-slate-300">{blueprint.name}</span> · style{" "}
          <span className="text-slate-300">{STYLE_BY_ID[state.styleId].name}</span>
        </p>
      </div>
    </div>
  );
}

/* ==================================================================
   12. State C — Workspace
   ================================================================== */

const DEVICES = [
  { id: "desktop", icon: Monitor, width: "100%", label: "Desktop" },
  { id: "tablet", icon: Tablet, width: "768px", label: "Tablet" },
  { id: "mobile", icon: Smartphone, width: "390px", label: "Mobile" },
];

function PreviewCanvas({ spec }) {
  const [device, setDevice] = useState("desktop");
  const baseStyle = STYLE_BY_ID[spec.styleId];
  const [dark, setDark] = useState(baseStyle.dark);

  useEffect(() => {
    setDark(STYLE_BY_ID[spec.styleId].dark);
  }, [spec.styleId]);

  const effectiveStyleId = spec.darkToggle ? (dark ? DARK_TWIN[spec.styleId] : LIGHT_TWIN[spec.styleId]) : spec.styleId;
  const theme = STYLE_BY_ID[effectiveStyleId];
  const Renderer = APP_RENDERERS[spec.appId] || TrackerApp;
  const activeDevice = DEVICES.find((item) => item.id === device) || DEVICES[0];
  const isHebrew = spec.lang === "he";

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-2 border-b border-white/10 bg-[#0b0b12] px-3 py-2">
        <span className="flex gap-1.5 pl-1 pr-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        </span>
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5">
          <ShieldCheck size={12} className="shrink-0 text-emerald-400/80" />
          <span className="truncate font-mono text-[11px] text-slate-400">preview://apps/{slugify(componentName(spec))}</span>
        </div>
        <div className="flex items-center gap-0.5 rounded-lg border border-white/10 bg-white/[0.03] p-0.5">
          {DEVICES.map((item) => (
            <button
              key={item.id}
              type="button"
              title={item.label}
              onClick={() => setDevice(item.id)}
              className={cx(
                "grid h-7 w-7 place-items-center rounded-md transition",
                device === item.id ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-300"
              )}
            >
              <item.icon size={13} />
            </button>
          ))}
        </div>
      </div>

      <div className="aab-scroll min-h-0 flex-1 overflow-auto bg-[#0d0d15] p-4">
        <div className="mx-auto transition-all duration-300" style={{ width: activeDevice.width, maxWidth: "100%" }}>
          <ThemeCtx.Provider value={theme}>
            <LangCtx.Provider value={spec.lang || "en"}>
              <div
                dir={isHebrew ? "rtl" : "ltr"}
                lang={isHebrew ? "he" : "en"}
                className={cx(
                  "overflow-hidden shadow-[0_30px_80px_-40px_rgba(0,0,0,1)]",
                  theme.canvas,
                  theme.radius,
                  // The mono stack has poor Hebrew coverage, so RTL apps use the Hebrew stack.
                  isHebrew ? "font-hebrew" : theme.font
                )}
                style={{
                  "--a": spec.accent,
                  "--a2": spec.accent2,
                  "--pad": spec.density === "compact" ? "0.75rem" : "1.25rem",
                }}
              >
                <Renderer key={`${spec.appId}-${effectiveStyleId}`} spec={spec} dark={dark} onToggleDark={() => setDark((value) => !value)} />
              </div>
            </LangCtx.Provider>
          </ThemeCtx.Provider>
        </div>
      </div>
    </div>
  );
}

const REFINE_SUGGESTIONS = [
  "Change the accent color to cyan",
  "Add a dark mode toggle",
  "Make the layout more compact",
  "Add an analytics chart",
  "שנה את צבע הדגש לירוק",
  "תוריד את הכותרת",
];

function CodeInspector({ state, dispatch, onCopy, onRefine }) {
  const inputRef = useRef(null);
  const [pending, setPending] = useState(false);

  const submit = (text) => {
    const value = (text ?? state.refine).trim();
    if (!value || pending) return;
    setPending(true);
    window.setTimeout(() => {
      onRefine(value);
      setPending(false);
      inputRef.current?.focus();
    }, 620);
  };

  const lineCount = state.code.split("\n").length;

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#0a0a12]">
      <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
        <span className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-[11px] font-medium text-slate-300">
          <Code2 size={12} className="text-violet-300" />
          {componentName(state.spec)}.jsx
        </span>
        <span className="font-mono text-[11px] text-slate-600">{lineCount} lines</span>

        <div className="ml-auto flex items-center gap-1.5 overflow-x-auto">
          <History size={12} className="shrink-0 text-slate-600" />
          {state.versions.map((version, index) => (
            <button
              key={version.id}
              type="button"
              title={version.request || version.notes.join(", ")}
              onClick={() => dispatch({ type: "SELECT_VERSION", index })}
              className={cx(
                "shrink-0 rounded-md border px-2 py-1 font-mono text-[11px] transition",
                index === state.activeVersion
                  ? "border-violet-400/50 bg-violet-500/15 text-violet-200"
                  : "border-white/10 bg-white/[0.03] text-slate-500 hover:text-slate-300"
              )}
            >
              {version.label}
            </button>
          ))}
        </div>
      </div>

      <div className="aab-scroll min-h-0 flex-1 overflow-auto">
        <CodeViewer code={state.code} changed={state.changedLines} />
      </div>

      <div className="border-t border-white/10 bg-[#0b0b14] p-3">
        <div className="mb-2.5 flex flex-wrap gap-1.5">
          {REFINE_SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              dir="auto"
              onClick={() => submit(suggestion)}
              className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] text-slate-400 transition hover:border-violet-400/40 hover:text-violet-200"
            >
              {suggestion}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-1.5 transition focus-within:border-violet-400/50">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600">
            <Wand2 size={14} className="text-white" />
          </span>
          <input
            ref={inputRef}
            dir="auto"
            value={state.refine}
            disabled={pending}
            onChange={(event) => dispatch({ type: "SET_REFINE", value: event.target.value })}
            onKeyDown={(event) => {
              if (event.key === "Enter") submit();
            }}
            placeholder="Refine it — “make the accent emerald and add a chart”"
            className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-500 disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => submit()}
            disabled={pending || !state.refine.trim()}
            className={cx(
              "inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium transition",
              pending || !state.refine.trim()
                ? "cursor-not-allowed bg-white/5 text-slate-500"
                : "bg-gradient-to-r from-violet-500 to-indigo-500 text-white hover:brightness-110 active:scale-[0.98]"
            )}
          >
            {pending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            {pending ? "Applying" : "Refine"}
          </button>
        </div>

        {state.versions[state.activeVersion] ? (
          <p className="mt-2 flex items-center gap-1.5 truncate px-1 text-[11px] text-slate-500">
            <Activity size={11} className="shrink-0 text-emerald-400/70" />
            {state.versions[state.activeVersion].label}: {state.versions[state.activeVersion].notes.join(" · ")}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function Workspace({ state, dispatch, onCopy, onDownload, onShare, onRefine }) {
  const { spec, view } = state;
  const blueprint = BLUEPRINT_BY_ID[spec.appId];
  const BlueprintIcon = blueprint.icon;

  const views = [
    { id: "preview", icon: Eye, label: "Preview" },
    { id: "code", icon: Code2, label: "Code" },
    { id: "split", icon: Columns2, label: "Split" },
  ];

  return (
    <div className="flex h-screen flex-col bg-[#07070c] text-slate-200">
      <header className="flex shrink-0 flex-wrap items-center gap-3 border-b border-white/10 bg-[#0a0a12] px-4 py-3">
        <button type="button" onClick={() => dispatch({ type: "RESET" })} className="flex items-center gap-2.5" title="New app">
          <Logo compact />
        </button>

        <div className="hidden min-w-0 items-center gap-2 border-l border-white/10 pl-3 sm:flex">
          <BlueprintIcon size={14} className="shrink-0 text-violet-300" />
          <div className="min-w-0">
            <p dir="auto" className="truncate text-sm font-medium text-white">
              {spec.title}
            </p>
            <p className="truncate text-[11px] text-slate-500">
              {blueprint.name} · {STYLE_BY_ID[spec.styleId].name}
            </p>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1">
          {views.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => dispatch({ type: "SET_VIEW", value: item.id })}
              className={cx(
                "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition",
                view === item.id ? "bg-white/10 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
              )}
            >
              <item.icon size={13} />
              <span className="hidden sm:inline">{item.label}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <ToolbarButton onClick={onCopy} icon={Copy} label="Copy code" />
          <ToolbarButton onClick={onDownload} icon={Download} label="Download .JSX" />
          <ToolbarButton onClick={onShare} icon={Share2} label="Share" />
          <button
            type="button"
            onClick={() => dispatch({ type: "RESET" })}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-500 px-3 py-2 text-xs font-semibold text-white transition hover:brightness-110 active:scale-[0.98]"
          >
            <Rocket size={13} />
            <span className="hidden sm:inline">New app</span>
          </button>
        </div>
      </header>

      <main
        className={cx(
          "grid min-h-0 flex-1",
          view === "split" ? "grid-cols-1 grid-rows-2 lg:grid-cols-2 lg:grid-rows-1" : "grid-cols-1 grid-rows-1"
        )}
      >
        {view !== "code" ? (
          <section className={cx("min-h-0", view === "split" ? "border-b border-white/10 lg:border-b-0 lg:border-r" : "")}>
            <PreviewCanvas spec={spec} />
          </section>
        ) : null}

        {view !== "preview" ? (
          <section className="min-h-0">
            <CodeInspector state={state} dispatch={dispatch} onCopy={onCopy} onRefine={onRefine} />
          </section>
        ) : null}
      </main>
    </div>
  );
}

function ToolbarButton({ onClick, icon: Icon, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-2.5 py-2 text-xs font-medium text-slate-300 transition hover:bg-white/[0.08] hover:text-white active:scale-[0.98]"
    >
      <Icon size={13} />
      <span className="hidden md:inline">{label}</span>
    </button>
  );
}

/* ==================================================================
   13. Root component
   ================================================================== */

export default function AIAppBuilder() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const notify = useCallback((message) => {
    setToast({ id: uid("toast"), message });
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2600);
  }, []);

  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  /* Restore a shared workspace from the URL fragment. */
  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "");
    if (!hash.startsWith("app=")) return;
    try {
      const payload = JSON.parse(decodeURIComponent(escape(atob(hash.slice(4)))));
      const base = resolveSpec(payload.prompt || "", payload.styleId || "modern-dark", payload.appId);
      dispatch({ type: "HYDRATE", spec: { ...base, ...payload } });
      notify("Shared app restored");
    } catch (error) {
      /* A malformed link simply falls back to the landing page. */
    }
  }, [notify]);

  /* Drives the simulated generation pipeline. */
  useEffect(() => {
    if (state.phase !== "generating") return undefined;
    if (state.stepIndex >= GEN_STEPS.length) {
      const timer = window.setTimeout(() => dispatch({ type: "FINISH" }), 480);
      return () => window.clearTimeout(timer);
    }
    const timer = window.setTimeout(() => dispatch({ type: "STEP" }), state.stepIndex === 0 ? 520 : 760);
    return () => window.clearTimeout(timer);
  }, [state.phase, state.stepIndex]);

  const handleGenerate = useCallback(
    (prompt, forcedId) => {
      const text = (prompt || "").trim();
      if (text.length < 4) return;
      if (forcedId) dispatch({ type: "PICK_PRESET", blueprint: BLUEPRINT_BY_ID[forcedId] });
      dispatch({ type: "START", prompt: text });
    },
    []
  );

  const handleCopy = useCallback(async () => {
    const ok = await copyText(state.code);
    notify(ok ? "Code copied to clipboard" : "Copy failed — select the code manually");
  }, [state.code, notify]);

  const handleDownload = useCallback(() => {
    downloadFile(`${componentName(state.spec)}.jsx`, state.code, "text/jsx;charset=utf-8");
    notify(`${componentName(state.spec)}.jsx downloaded`);
  }, [state.spec, state.code, notify]);

  const handleShare = useCallback(async () => {
    const payload = {
      prompt: state.spec.prompt,
      appId: state.spec.appId,
      lang: state.spec.lang,
      subtitle: state.spec.subtitle,
      styleId: state.spec.styleId,
      accent: state.spec.accent,
      accent2: state.spec.accent2,
      density: state.spec.density,
      showChart: state.spec.showChart,
      showHeader: state.spec.showHeader,
      darkToggle: state.spec.darkToggle,
      title: state.spec.title,
    };
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
    const url = `${window.location.origin}${window.location.pathname}#app=${encoded}`;
    window.history.replaceState(null, "", `#app=${encoded}`);
    const ok = await copyText(url);
    notify(ok ? "Share link copied" : "Share link is in the address bar");
  }, [state.spec, notify]);

  const handleRefine = useCallback(
    (text) => {
      dispatch({ type: "REFINE", text });
      notify("Refinement applied — new version saved");
    },
    [notify]
  );

  return (
    <div className="antialiased">
      <GlobalStyles />
      {state.phase === "landing" ? <Landing state={state} dispatch={dispatch} onGenerate={handleGenerate} /> : null}
      {state.phase === "generating" ? <Generating state={state} onCancel={() => dispatch({ type: "RESET" })} /> : null}
      {state.phase === "workspace" && state.spec ? (
        <Workspace
          state={state}
          dispatch={dispatch}
          onCopy={handleCopy}
          onDownload={handleDownload}
          onShare={handleShare}
          onRefine={handleRefine}
        />
      ) : null}
      <Toast toast={toast} />
    </div>
  );
}
