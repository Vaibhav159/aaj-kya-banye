Build a client-only Indian vegetarian meal planner app (all state in `localStorage`, no backend needed).

## Scope

Single-user personal meal planner running a 42-day rotating cycle of 69 Indian vegetarian dishes across Breakfast / Lunch / Dinner slots, with swap suggestions, nutrition tracking, grocery aggregation, and settings.

## Routes (TanStack Start, separate files, each with own head())

```
src/routes/
  index.tsx           → / Dashboard (Today's meals, nutrition ring, rule tracker)
  planner.tsx         → /planner  Weekly + full 42-day table
  grocery.tsx         → /grocery  Smart grocery list with range filter
  database.tsx        → /database Searchable dish DB
  settings.tsx        → /settings Profile + goals
```

Shared header nav in `__root.tsx` with Link to each route.

## Data layer (`src/lib/`)

- `dishes.ts` — the 69 dishes: `{ id, name, slots: ('breakfast'|'lunch'|'dinner')[], kcal, protein, carbs, fat, emoji, ingredients: { name, qty, unit, category }[] }`. Categorized emojis: 🥬 veg, 🌾 grain, 🥛 dairy, 🫘 legume, 🧂 spice, 🫒 oil, 🍎 fruit, 🥜 nut.
- `plan.ts` — deterministic 42×3 schedule generated from dishes honoring the 8 rules (see below); frozen constant so it's stable.
- `rules.ts` — 8 dietary rules as data + a `validateSwap(dish, slot, dayIdx, plan)` helper enforcing them.
- `store.ts` — `useProfile()` and `useCycleStart()` hooks backed by `localStorage` (read inside `useEffect` to avoid SSR hydration mismatch; default goals: 2000 kcal, 80g P / 250g C / 65g F). Provides `today = daysSince(cycleStart) % 42`.
- `grocery.ts` — aggregation: given a day range, sum ingredients by `(name, unit)`, group by category.

## Features per route

**/ Dashboard**
- Three meal cards (Breakfast/Lunch/Dinner) for today with dish name, kcal, macros, emoji.
- "Suggest" button → dialog listing up to 4 alternatives from same slot, within ±150 kcal, not eaten in prior/next 3 days, passing all rules. Selecting one overrides that day+slot in `localStorage` (`overrides: Record<'d{n}-{slot}', dishId>`).
- Daily nutrition ring (SVG conic) for kcal + linear bars for P/C/F vs goals.
- Rule tracker card listing all 8 rules with a check indicator for today's plan.

**/planner**
- Rolling 7-day list starting from today with per-day est. kcal.
- Full 42-day table (day # | Breakfast | Lunch | Dinner | kcal) with current day row highlighted via `bg-accent`.

**/grocery**
- Segmented filter: Today | 2 Days | 3 Days | This Week | Next Week.
- Grouped list by category with combined quantities.
- "Copy List" button → `navigator.clipboard.writeText` + toast.

**/database**
- Search input + slot filter chips (All / Breakfast / Lunch / Dinner).
- Grid of dish cards with kcal, macro ratio bar.

**/settings**
- Form: name, weight (kg), target weight, daily kcal goal, P/C/F goals. Saves to `localStorage` on submit; toast confirmation.

## 8 Dietary Rules (encoded)

1. Pizza max 1×/week.
2. Paratha only at breakfast or lunch, not dinner.
3. No heavy fried breakfasts (puri, bhatura) more than 2×/week.
4. Dal or legume in ≥1 meal/day.
5. At least 1 leafy green meal/day.
6. No same dish twice within 3 days.
7. Dinner kcal ≤ lunch kcal.
8. Sweets max 2×/week.

## Design

Warm Indian-inspired palette in `src/styles.css` (oklch): saffron primary, deep terracotta accent, cream background, spice-green success. Semantic tokens only — no hardcoded colors in components. Font pair: Fraunces (headings) + Inter (body) loaded via `<link>` in `__root.tsx` head.

## Technical notes

- Pure client-side, no server functions, no auth.
- `localStorage` reads in `useEffect` (SSR-safe).
- `dishes.ts` seeds 69 realistic Indian vegetarian dishes with plausible macros and ingredients.
- Sitemap + robots.txt with all 5 routes.
- Each route sets its own `head()` (title, description, og:title, og:description).

Ready to build?