# AGENTS.md

# 🍛 Thali — Engineering & Product Constitution

> **Mission**
>
> A 42-day rotating Indian vegetarian meal planner.
> Every change should make the app faster, simpler, and more useful.
> It should feel like a premium native app, not a recipe website.

---

# 🎯 Product Vision

Thali helps users:

- See today's meals at a glance with macro breakdown
- Browse and swap dishes across a 42-day rotating plan
- Track meals as eaten/skipped and maintain streaks
- Get snack suggestions based on cravings
- Generate aggregated grocery lists
- Define custom nutrition rules (avoid fried food, prefer quick meals, etc.)
- Export meal plans to calendar (iCal download + live Cloudflare feed)
- Share meal plans via Web Share API or clipboard

All data is stored locally in localStorage. No account required.

---

# ⭐ Core Principles

## 1. UX First
Prioritize reducing cognitive load. A first-time user should understand any screen immediately.

## 2. Less Is More
Prefer intelligent defaults over configuration. Remove before adding.

## 3. Fast Feels Premium
All navigation, filtering, and interactions must feel instant. No spinners for local data.

## 4. Beautiful by Default
Inspired by Apple Health, Notion, Linear. The UI should feel warm, clear, and confident.

## 5. Accessibility Is Mandatory
Keyboard navigation, focus states, semantic HTML, screen reader support, `prefers-reduced-motion`, proper contrast.

---

# 🏗 Tech Stack

## Framework & Routing
- **TanStack Start** (SPA mode) with **TanStack Router** (file-based routing in `src/routes/`)
- **Vite 8** as build tool via `@lovable.dev/vite-tanstack-config`

## Language
- **TypeScript** — strict mode enabled, avoid `any`

## Package Manager
- **Bun**

## Styling
- **Tailwind CSS v4** (`@tailwindcss/vite`)
- **tw-animate-css** for animation utilities
- CSS custom properties with oklch color format
- Design tokens in `src/styles.css`

## Components
- **shadcn/ui** (New York style, 46 components in `src/components/ui/`)
- **Radix UI** primitives (via shadcn)
- **Sonner** for toast notifications
- **Recharts** for data visualization
- **Vaul** for drawer component
- **cmdk** for command palette

## Icons
- **Lucide React** — do not mix icon libraries

## Fonts
- **Inter** (body) + **Fraunces** (display headings)

## Server State
- **TanStack Query** — used for QueryClient context and calendar sync

## State Management
- **Custom React hooks + localStorage** (no Zustand)
- All state hooks live in `src/lib/store.ts`
- Pattern: `useState` + `useEffect` hydration from localStorage + `useCallback` persist
- **Supabase** (`@supabase/supabase-js`) for cloud backup, synchronization, and user authentication

## Forms
- **React Hook Form** + **Zod** (installed, use for complex forms)

## Calendar Integration
- Client-side iCal generation (`src/lib/ical.ts`)
- Cloudflare Workers API for live calendar feeds (`src/lib/calendar-server.ts`)

## Deployment
- **GitHub Pages** (SPA mode, 404.html fallback)
- GitHub Actions for CI/CD

---

# 📁 Project Structure

```text
src/
├── components/
│   ├── ui/              # shadcn/ui components (do not edit manually)
│   ├── bottom-nav.tsx   # Mobile bottom navigation
│   └── dish-detail.tsx  # Dish detail sheet/modal
│
├── hooks/
│   └── use-mobile.tsx   # Mobile viewport detection
│
├── lib/                 # ALL business logic
│   ├── store.ts         # State hooks: profile, cycle, overrides, meal log, custom dishes
│   ├── dishes.ts        # Dish database (73 dishes), types, helpers
│   ├── plan.ts          # 42-day plan generation algorithm
│   ├── rules.ts         # 8 built-in nutrition rules + rule checker
│   ├── custom-rules.ts  # User-configurable rules engine
│   ├── grocery.ts       # Ingredient aggregation by category
│   ├── snacks.ts        # 18 snacks with craving-based filtering
│   ├── ical.ts          # iCal (.ics) generation
│   ├── share.ts         # Web Share API / clipboard fallback
│   ├── calendar-server.ts  # Cloudflare calendar feed sync
│   ├── supabase.ts      # Supabase client initialization
│   └── utils.ts         # cn() utility
│
├── routes/              # TanStack Router file-based routes
│   ├── __root.tsx       # Root layout: header, footer, bottom nav, providers
│   ├── index.tsx        # Today view (hero)
│   ├── planner.tsx      # 42-day calendar view
│   ├── kuch-bhi.tsx     # Meal decision helper
│   ├── history.tsx      # Meal log history
│   ├── snacks.tsx       # Snack finder by craving
│   ├── grocery.tsx      # Aggregated grocery list
│   ├── database.tsx     # Full dish database browser
│   ├── rules.tsx        # Custom rules editor
│   ├── settings.tsx     # Profile & preferences
│   └── api.calendar.ts  # Calendar feed API endpoint
│
├── router.tsx           # Router factory
├── server.ts            # SSR error wrapper
├── start.ts             # Entry point
└── styles.css           # Design system (oklch tokens, theme)
```

### Key conventions
- Business logic goes in `src/lib/`, not scattered across components
- Route files are self-contained pages (no separate page components)
- Feature-specific components live alongside routes, not in subdirectories
- No `features/`, `store/`, `services/`, `data/`, `types/`, or `utils/` directories

---

# 🎨 Design System

## Colors
- oklch color format throughout
- CSS custom properties defined in `src/styles.css`
- Light mode (`:root`) and Dark mode (`.dark`)
- Never hardcode colors — use semantic tokens (`primary`, `muted`, `destructive`, etc.)

## Typography
- Body: `Inter` via `--font-sans`
- Headings: `Fraunces` via `--font-display`
- Heading elements (`h1-h3`) automatically use display font

## Spacing
- 8px base spacing system via Tailwind

## Border Radius
- Base `--radius: 0.75rem` with computed sm/md/lg/xl/2xl/3xl/4xl variants

---

# 🍲 Dish Database

The `Dish` interface (`src/lib/dishes.ts`):

```ts
interface Dish {
  id: string;           // "b1", "l2", "d3", etc.
  name: string;
  emoji: string;
  slots: Slot[];        // "breakfast" | "lunch" | "dinner"
  kcal: number;
  protein: number;      // grams
  carbs: number;        // grams
  fat: number;          // grams
  tags: DishTag[];      // "pizza" | "paratha" | "fried-breakfast" | "dal" | "legume" | "leafy" | "sweet" | "light"
  ingredients: Ingredient[];
  cuisine?: Cuisine;
  cookingType?: CookingType;
  equipment?: Equipment[];
  prepMinutes?: number;
  spiceLevel?: 0 | 1 | 2 | 3;
  recipeUrl?: string;
}
```

ID conventions: `b*` = breakfast, `l*` = lunch, `d*` = dinner, `s*` = snack.

Nutrition values must be realistic estimates. Never use placeholders.

## Ingredient Categories
`veg` | `grain` | `dairy` | `legume` | `spice` | `oil` | `fruit` | `nut` | `other`

Grocery aggregation merges duplicates, normalizes units (g/ml/pc), and groups by category.

---

# 🔄 42-Day Plan

- Deterministic generation from dish pools in `plan.ts`
- Users can override any slot (stored as overrides in localStorage)
- Fried breakfasts only on Sundays (every 7th day)
- Dinner always lighter than lunch by kcal

---

# 📏 Rules Engine

### 8 Built-in Rules
1. Pizza max 1×/week
2. Paratha only at breakfast/lunch
3. Fried breakfasts max 2×/week
4. Dal or legume every day
5. Leafy greens every day
6. No repeat within 3 days
7. Dinner lighter than lunch
8. Sweets max 2×/week

### Custom Rules (`custom-rules.ts`)
Users can create avoid/prefer/require rules scoped to any slot, matching on:
cuisine, cookingType, equipment, tag, maxPrepMinutes, maxSpice

---

# 🧠 State Management Pattern

All state follows the same hook pattern in `store.ts`:

```ts
function useX() {
  const [state, setState] = useState(defaultValue);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => { setState(readLS(KEY, default)); setHydrated(true); }, []);
  const save = useCallback((next) => { setState(next); localStorage.setItem(KEY, ...); }, []);
  return { state, save, hydrated };
}
```

Always check `hydrated` before rendering state-dependent UI to avoid hydration flash.

localStorage keys are prefixed with `thali:`.

---

# 📱 Responsive Design

- Mobile-first with bottom navigation (`BottomNav`)
- Desktop gets horizontal header nav
- Main content has `pb-20 md:pb-0` to account for bottom nav
- Use Flexbox/Grid, avoid fixed widths

---

# ⚡ Performance

- All data is local (localStorage + static dish arrays) — no loading states needed for core data
- Lazy load routes via TanStack Router
- No unnecessary re-renders: `useCallback` for all state setters

---

# 🧼 Code Quality

Write code for future maintainers.

- Descriptive names, small functions, early returns
- Comments explain **why**, not **what**
- No magic numbers, no deeply nested logic
- Prefer composition over inheritance

---

# ✅ Definition of Done

- Works correctly
- Responsive (mobile + desktop)
- Accessible (keyboard, focus, semantic HTML)
- Supports dark mode
- No console errors
- Follows existing patterns in `src/lib/`
- localStorage keys prefixed with `thali:`

---

# 🔄 Self-Maintenance (for AI agents)

**This file and `ROADMAP.md` are the source of truth for all agents working on this codebase. Keep them accurate.**

When you make changes to the codebase, update the relevant sections as part of the same task. Do not defer it.

| When you… | Update |
|---|---|
| Add/remove a **route** in `src/routes/` | AGENTS.md → Project Structure (route list) |
| Add/remove a **file in `src/lib/`** | AGENTS.md → Project Structure (lib list) |
| Add/remove a **component** outside `src/components/ui/` | AGENTS.md → Project Structure (components list) |
| Add/remove a **dependency** in `package.json` | AGENTS.md → Tech Stack (relevant subsection) |
| Add/remove **dishes** in `dishes.ts` | AGENTS.md → Dish Database (dish count, ID conventions if new prefix) |
| Add/remove **snacks** in `snacks.ts` | AGENTS.md → Dish Database or a snack section (snack count) |
| Add/remove **built-in rules** in `rules.ts` | AGENTS.md → Rules Engine (numbered list) |
| Add/remove **custom rule match fields** | AGENTS.md → Rules Engine → Custom Rules |
| Add/remove **localStorage keys** | AGENTS.md → State Management Pattern (key prefix note) |
| Change the **state hook pattern** in `store.ts` | AGENTS.md → State Management Pattern (code example) |
| Add/remove **ingredient categories** | AGENTS.md → Dish Database → Ingredient Categories |
| Change **design tokens or fonts** in `styles.css` | AGENTS.md → Design System |
| Change **deployment target or CI** | AGENTS.md → Tech Stack → Deployment |
| Add a new **shadcn/ui component** | AGENTS.md → Tech Stack → Components (component count) |
| **Complete a roadmap item** | ROADMAP.md (change ⬜ → ✅, or 🔧 while in progress) |
| **Discover a needed feature** during a task | ROADMAP.md (add as ⬜ under the appropriate priority) |

### Rules for updates
- Keep edits surgical — only change the lines that are affected
- Don't rewrite sections that haven't changed
- Counts (e.g. "64 dishes", "46 components") must match reality after your change
- If you add a new major feature area not covered above, add a section for it
- Roadmap items move ⬜ → 🔧 → ✅ — never skip 🔧 for multi-step work
- New roadmap items go at the bottom of the appropriate priority section