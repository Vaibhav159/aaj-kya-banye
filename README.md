# 🍛 Aaj Kya Banaye?

Ever stood in front of the fridge at 8:30 PM, asking your family (or yourself) the ultimate, unresolved daily question: *"Aaj kya banaye?"* (What should we make today?) 

This project solves that exact everyday decision fatigue for Indian households. It is a highly-polished, 42-day rotating Indian vegetarian meal planner designed to feel like a premium native app. It helps you decide what to cook, structures your weekly groceries, respects your custom food preferences/rules, and gives you a backup plan when you absolutely cannot decide.

---

## 💡 The Problem & The Solution

1. **"What to cook today?" fatigue:** Most meal planners are built for Western diets (salads, meal-prepped chicken breasts). *Aaj Kya Banaye* is built specifically for Indian kitchens, pre-loaded with a rotating database of Indian vegetarian dishes (roti, subzi, dal, parathas, etc.).
2. **"I want custom rules/preferences:"** Don't want fried food on weekdays? Prefer dal every day? Want leafy greens twice a week? The app features a powerful custom rules engine to automatically generate plans conforming to your lifestyle.
3. **"I still don't know!" (Decision Paralysis):** When you just can't make up your mind, the **Kuch Bhi** (Anything) generator steps in to make the decision for you with an interactive helper.

---

## 🌟 Key Features

- **Today View** — Quick glance at breakfast, lunch, and dinner with macro breakdowns, ingredient checklists, and beautiful nutrition rings.
- **42-Day Planner** — Drag, drop, swap, or override any meal slot across a deterministic 42-day cycle.
- **Kuch Bhi Mode** — The ultimate helper when you're completely undecided. Let the app pick for you!
- **Custom Rules Engine** — Set rules like "Avoid fried food," "Prefer quick meals under 20 mins," or "No repeating same dish within 3 days."
- **Meal Log & Streaks** — Track eaten/skipped meals, delay times, and build consistency streaks (visualized with calendar colors).
- **Craving-Based Snack Finder** — Need a snack? Filter local options by craving: Sweet, Salty, Crunchy, Warm, Refreshing, or Quick.
- **Aggregated Grocery Lists** — Generates a combined shopping list for any date range, merging duplicates and grouping ingredients by category.
- **Calendar Sync** — Export your plan as a `.ics` file or subscribe to a live synced feed in your Google/Apple Calendar.
- **Cloud Sync** — Secured by Supabase with optional auth to keep your plan backed up across devices.

No accounts required by default. All data is saved locally in `localStorage` first, ensuring instant load times.

---

## Tech Stack

| Layer | Tech |
|---|---|
| Framework | TanStack Start (SPA) + TanStack Router |
| Build | Vite 8 via `@lovable.dev/vite-tanstack-config` |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 + tw-animate-css |
| Components | shadcn/ui (New York) + Radix UI |
| Icons | Lucide React |
| Fonts | Inter + Fraunces |
| State | Custom hooks + localStorage |
| Package manager | Bun |
| Deployment | GitHub Pages (GitHub Actions) |

---

## Getting Started

```bash
# Install dependencies
bun install

# Start dev server
bun run dev

# Build for production
bun run build

# Preview production build
bun run preview
```

---

## Project Structure

```
src/
├── components/ui/     # shadcn/ui (don't edit manually)
├── components/        # bottom-nav, dish-detail
├── hooks/             # use-mobile
├── lib/               # all business logic (store, dishes, plan, rules, grocery, snacks, ical, share)
├── routes/            # TanStack Router file-based routes (11 routes)
├── styles.css         # design system (oklch tokens, light/dark theme)
└── router.tsx         # router factory
```

See [`.agents/AGENTS.md`](.agents/AGENTS.md) for the full engineering constitution.

---

## Deployment

Pushes to `main` auto-deploy via GitHub Actions to GitHub Pages. The build script copies `index.html` → `404.html` for SPA client-side routing.

---

## License

This project is licensed under the [PolyForm Noncommercial License 1.0.0](LICENSE). It is free for personal, non-commercial use only.

