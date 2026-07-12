# AGENTS.md

# 🍽️ Aaj Kya Banaye? Engineering & Product Constitution

> **Mission**
>
> Build the best meal planning experience on the web.
>
> Every change should make the application faster, simpler, more delightful, and more useful. The experience should feel like a premium native application rather than a traditional recipe website.

---

# 🎯 Product Vision

Aaj Kya Banaye? is **not** just a recipe website.

It is a modern meal planning platform focused on reducing the daily stress of deciding what to cook.

The application should help users:

- Discover meals effortlessly
- Plan meals intelligently
- Generate grocery lists automatically
- Track nutrition
- Minimize decision fatigue
- Feel delighted every time they open the app

Every feature should contribute toward these goals.

---

# ⭐ Core Principles

## 1. UX First

Every engineering decision should prioritize the user experience.

Always ask:

- Does this reduce effort?
- Does this reduce cognitive load?
- Does this make the interface feel faster?
- Does this improve discoverability?
- Would a first-time user immediately understand it?

If not, reconsider the implementation.

---

## 2. Less Is More

Avoid clutter.

Remove unnecessary buttons, text, settings, and dialogs.

Prefer intelligent defaults over user configuration.

---

## 3. Fast Feels Premium

Performance is part of the product.

Users should never wait for:

- navigation
- filtering
- searching
- animations
- meal recommendations

Prefer instant feedback over loading indicators whenever possible.

---

## 4. Beautiful by Default

The interface should feel polished without unnecessary decoration.

Inspired by products like:

- Apple Health
- Arc Browser
- Airbnb
- Notion
- Spotify
- Google Material 3
- Linear

The UI should communicate:

- clarity
- warmth
- confidence
- elegance

---

## 5. Accessibility Is Mandatory

Every feature must support:

- keyboard navigation
- visible focus states
- semantic HTML
- screen readers
- reduced motion preferences
- proper color contrast

Accessibility is never optional.

---

# 🏗 Tech Stack

Unless explicitly instructed otherwise, use the following technologies.

## Framework

- Next.js (App Router)

## Language

- TypeScript

Strict mode should remain enabled.

Avoid using `any`.

Prefer explicit typing.

---

## Styling

- Tailwind CSS v4

Guidelines:

- Use utility classes first.
- Avoid inline styles.
- Prefer reusable components.
- Use design tokens instead of hardcoded values.

---

## Components

Use **shadcn/ui** as the primary component library.

Do not reinvent common UI components unless customization provides clear user value.

Examples:

- Dialog
- Sheet
- Drawer
- Card
- Popover
- Tooltip
- Toast
- Dropdown
- Tabs
- Calendar
- Command Palette

---

## Icons

Use **Lucide React**.

Avoid mixing multiple icon libraries.

---

## Animations

Use **Framer Motion**.

Animations should communicate:

- hierarchy
- continuity
- interaction
- feedback

Avoid decorative animations.

Keep transitions smooth and subtle.

---

## State Management

Use:

- Zustand

Use local component state whenever possible.

Only introduce global state when necessary.

---

## Server State

Use:

- TanStack Query

Benefits:

- caching
- optimistic updates
- retries
- background synchronization

---

## Forms

Use:

- React Hook Form
- Zod validation

Never manually validate complex forms.

---

## Search

For fuzzy searching, use:

- Fuse.js

---

## Future Backend

Preferred backend:

- Supabase

Future features may include:

- Authentication
- Cloud Sync
- Saved Meal Plans
- Shared Lists
- AI Recommendations

Design the codebase so backend integration can be added without major refactoring.

---

# 📁 Project Structure

Follow this structure whenever possible.

```text
src/
│
├── app/
├── components/
│   ├── ui/
│   ├── meal/
│   ├── grocery/
│   ├── planner/
│   ├── nutrition/
│   └── layout/
│
├── features/
│
├── hooks/
│
├── lib/
│
├── store/
│
├── services/
│
├── data/
│
├── types/
│
├── utils/
│
└── styles/
```

---

# 🎨 Design System

## Colors

Never hardcode colors.

Use design tokens.

Maintain support for:

- Light Mode
- Dark Mode
- AMOLED Mode

---

## Typography

Typography should establish hierarchy.

Prefer:

- larger spacing
- comfortable reading widths
- clear section headings
- concise content

Avoid large blocks of text.

---

## Spacing

Use an 8px spacing system.

Consistent spacing creates visual rhythm.

---

## Border Radius

Maintain consistent radius across components.

Do not mix multiple corner styles.

---

## Shadows

Use subtle elevation.

Avoid heavy shadows.

---

## Motion

Motion should communicate state.

Good examples:

- card hover
- modal transitions
- list reordering
- page transitions
- loading skeletons

Bad examples:

- random bouncing
- excessive scaling
- spinning icons without purpose

Respect:

- `prefers-reduced-motion`

---

# 📱 Responsive Design

Design mobile first.

Support:

- phones
- tablets
- laptops
- desktops
- ultrawide displays

Avoid fixed widths.

Prefer:

- CSS Grid
- Flexbox
- clamp()
- responsive typography

---

# ⚡ Performance Standards

Performance is a feature.

Every feature should consider:

- rendering speed
- bundle size
- memory usage
- interaction latency

Prefer:

- memoization when appropriate
- lazy loading
- dynamic imports
- virtualization for long lists

Avoid:

- unnecessary re-renders
- duplicate computations
- excessive DOM nodes

---

# 🌐 Offline First

The application should remain useful without internet.

When fetching external resources:

- Use AbortController
- Timeout after 6 seconds
- Retry gracefully
- Provide local fallback data

Users should never encounter broken experiences because of network failures.

---

# 🧠 UX Standards

## Empty States

Every empty state should:

- explain what happened
- suggest the next action
- feel encouraging

Never display blank screens.

---

## Loading States

Prefer:

- skeletons
- shimmer placeholders
- optimistic rendering

Avoid unnecessary spinners.

---

## Error States

Errors should:

- explain the issue
- explain how to recover
- avoid technical jargon

Never expose stack traces.

---

## Feedback

Every interaction should provide feedback.

Examples:

- hover
- pressed
- loading
- success
- validation
- animation

Users should never wonder whether an action succeeded.

---

# 🍲 Meal Database Standards

Every meal must include:

- calories
- protein
- carbs
- fats
- meal slot
- ingredients

Example:

```ts
{
    calories: number,
    protein: number,
    carbs: number,
    fat: number,
    mealSlots: MealSlot[],
    ingredients: Ingredient[]
}
```

Nutrition values should always be realistic estimates.

Never leave placeholder values.

---

# 🛒 Grocery Rules

Ingredients should:

- merge duplicates
- normalize units
- combine quantities
- group by category

Categories include:

- Vegetables
- Fruits
- Dairy
- Grains
- Legumes
- Pantry
- Nuts
- Herbs & Spices

---

# 🔄 Meal Planning Rules

Meal recommendations should prioritize:

1. Variety
2. Nutrition
3. Simplicity
4. Seasonal relevance
5. User preferences

Avoid repetitive meal suggestions.

Users should feel the planner is intelligent.

---

# 🧩 Component Standards

Every reusable component should:

- be typed
- accept variants where appropriate
- support dark mode
- support keyboard navigation
- expose meaningful props
- avoid unnecessary complexity

Prefer composition over inheritance.

---

# 🧼 Code Quality

Write code for future maintainers.

Prefer:

- descriptive names
- small reusable functions
- early returns
- pure utilities
- composition

Avoid:

- magic numbers
- deeply nested logic
- duplicated code
- premature optimization

Comments should explain **why**, not **what**.

---

# 🧪 Testing Philosophy

When implementing features, consider:

- edge cases
- empty data
- slow networks
- offline usage
- invalid user input
- accessibility
- mobile devices

Code should fail gracefully.

---

# 🚀 Future Roadmap Considerations

The architecture should be ready for:

- AI meal recommendations
- Nutrition analytics
- Shopping integrations
- Voice search
- Barcode scanning
- Meal history
- User authentication
- Recipe pages
- PWA installation
- Notifications
- Offline sync

Do not tightly couple code that would prevent future expansion.

---

# 🤖 AI Agent Expectations

Before submitting any implementation, verify:

- Is this simpler?
- Is this faster?
- Is this easier to maintain?
- Is this more accessible?
- Does this improve the user experience?
- Would this feel at home in a premium mobile application?

If the answer is no, iterate further.

---

# ✅ Definition of Done

A feature is complete only if:

- It works correctly.
- It is responsive.
- It is accessible.
- It supports dark mode.
- It performs well.
- It has loading states.
- It has error handling.
- It follows the design system.
- It introduces no console errors.
- It keeps the codebase cleaner than before.

---

# 🌟 Golden Rule

Every commit should leave the project noticeably better than it was before.

Not just working.

Cleaner.

Faster.

More intuitive.

More maintainable.

More delightful.

Always optimize for the experience users feel, not just the code they never see.