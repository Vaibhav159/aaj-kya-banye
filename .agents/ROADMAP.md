# 🗺️ Roadmap

Prioritized backlog. Agents: build from top down when asked "what's next." Update status as you work.

**Status key:** ✅ Done · 🔧 In Progress · ⬜ Planned

### P0 — Core polish
- ✅ 42-day rotating meal plan with swap suggestions
- ✅ Macro tracking (kcal, protein, carbs, fat)
- ✅ Meal logging with streak tracking
- ✅ Grocery list aggregation by date range
- ✅ Custom nutrition rules engine
- ✅ iCal export + Cloudflare calendar feed
- ✅ Share via Web Share API / clipboard

### P1
- ✅ Sync current db with https://docs.google.com/spreadsheets/d/1zVWajno7F7b947-6vz8-uSgSGUkJoP4vNAKAtfbds6E/edit?gid=744516389#gid=744516389
- ✅ Animated page transitions (View Transitions API or route-level)
- ✅ Cloud sync (Supabase) with optional auth, where users, meal logging, and plans are saved in db.
- ✅ Weekly nutrition summary chart on history page
- ✅ Drag-and-drop meal reordering in planner

### P2 — Content & intelligence
- ✅ Editable rules
- ✅ Much more features in rules as min and max frequency
- ✅ On Swap, let people search from recipe database
- ✅ On Skip, turn last 7 days and history for that meal to red or some other color
- ✅ On delay after given time, turn last 7 days and history for that meal diff colo
- ✅ Fuzzy search across dishes and snacks
- ✅ Calculate daily goals basis user target

### P3 — Integrations & social
- ✅ Shared meal plans (generate shareable link)
- ✅ Import/export meal plan as JSON
- ✅ Notifications / reminders (meal time alerts)
- ✅ Share Weekly meal plans as image 

### P4 - Enhanced
- Make dish cards interactive (mark favorite, set rule, view details)
- Add tooltips for stats and icons
- Add more filters to dishes
- Make "Generate Plan" less hidden (maybe secondary button on planner)
- Add Base & Cuisine badges (e.g., Roti / Rice / Dal & North Indian / South Indian) everywhere

### P5 - Good to have 
- Add search-based planning (type a dish, slot → search pool + suggestions)
- Improve UI: fix spacing, typography, card shadows, rounded corners
- ⬜ Meal photo integration (upload or generate per dish)
- ⬜ Expand dish database to 100+ dishes
- ⬜ Seasonal/regional dish suggestions
- ⬜ Onboarding flow for first-time users (guided profile setup)
- ⬜ "Cook now" timer with prep steps
- ⬜ AI meal recommendations based on history
- ⬜ Recipe page per dish (ingredients, steps, video link)
- ⬜ PWA support (service worker, installable, offline cache)

### P6 — Future / TBD
- ⬜ "What's in my fridge" reverse ingredient search (select ingredients → find matching dishes)
- ⬜ Family/household portion multiplier (scale grocery & macros for 2–4 people)
- ⬜ "Ate out" / off-plan meal logging (quick-add custom meal with estimated macros)
- ⬜ Nutrition insights & weekly report card (protein streaks, consistency scores, actionable tips)
- ⬜ Meal cost estimation (per-dish/weekly budget in ₹, cost breakdown in grocery page)
- ⬜ Dish rating & preference learning (rate meals → influence shuffle weighting)
- ⬜ Leftover / batch cook tracking (mark "made double" → auto-suggest reuse next day)
- ⬜ Ingredient substitution engine (don't have paneer? → suggest tofu with adjusted macros)
- ⬜ Prep difficulty calendar (color-code planner days by total prep minutes)
- ⬜ Print-friendly meal plan (CSS @media print stylesheet for weekly/monthly view)

