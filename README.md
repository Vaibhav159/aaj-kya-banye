# 🍛 Aaj Kya Banaye?

A 42-day rotating Indian vegetarian meal planner. See today's meals, swap dishes, track what you ate, get snack ideas, and generate grocery lists — all stored locally on your device.

**Live:** [vaibhav159.github.io/aaj-kya-banye](https://vaibhav159.github.io/aaj-kya-banye/)

---

## Features

- **Today view** — breakfast, lunch, dinner with macro breakdown and nutrition rings
- **42-day planner** — browse and swap any meal slot across the full cycle
- **Decide mode** — let the app help when you can't pick what to cook
- **Meal log** — track eaten/skipped meals, maintain streaks
- **Snack finder** — 18 snacks filtered by craving (sweet, salty, crunchy, warm, refreshing, quick)
- **Grocery list** — aggregated ingredients by category for any date range
- **Dish database** — browse all 64 dishes with filters and search
- **Custom rules** — avoid/prefer/require rules scoped by slot, cuisine, cooking type, equipment, prep time, spice level
- **Calendar export** — download `.ics` files or sync a live feed via Cloudflare Workers
- **Share** — Web Share API with clipboard fallback

No account needed. All data lives in `localStorage`.

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

