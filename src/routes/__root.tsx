import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, useMemo, type ReactNode } from "react";
import { useProfile, useCycleStart, useOverrides, useCustomDishes } from "@/lib/store";
import { saveCalendarFeed } from "@/lib/calendar-server";
import { DISHES, type Dish } from "@/lib/dishes";
import { SNACKS } from "@/lib/snacks";
import { DishDetailDialog } from "@/components/dish-detail";
import { Search } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Toaster } from "@/components/ui/sonner";
import { BottomNav } from "@/components/bottom-nav";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Aaj Kya Banaye? — Indian Vegetarian Meal Planner" },
      { name: "description", content: "A 42-day rotating Indian vegetarian meal plan with swap suggestions, macro tracking, and a smart grocery list." },
      { name: "author", content: "Aaj Kya Banaye?" },
      { property: "og:title", content: "Aaj Kya Banaye? — Indian Vegetarian Meal Planner" },
      { property: "og:description", content: "42-day Indian vegetarian meal plan with macros, swaps and grocery aggregation." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@Lovable" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function CalendarSyncObserver() {
  const { profile, hydrated: profileHydrated } = useProfile();
  const { start, hydrated: startHydrated } = useCycleStart();
  const { overrides, hydrated: overridesHydrated } = useOverrides();

  useEffect(() => {
    if (!profileHydrated || !startHydrated || !overridesHydrated) return;
    if (typeof window === "undefined") return;

    const feedId = window.localStorage.getItem("thali:calendarFeedId");
    if (!feedId) return;

    const timer = setTimeout(async () => {
      try {
        await saveCalendarFeed({
          data: {
            id: feedId,
            start,
            overrides,
            times: {
              breakfast: profile.breakfastTime,
              lunch: profile.lunchTime,
              dinner: profile.dinnerTime,
            },
          },
        });
      } catch (err) {
        console.error("Failed to sync calendar feed with server:", err);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [
    profileHydrated,
    startHydrated,
    overridesHydrated,
    profile.breakfastTime,
    profile.lunchTime,
    profile.dinnerTime,
    start,
    overrides,
  ]);

  return null;
}

function fuzzyMatch(text: string, query: string): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const target = text.toLowerCase();
  return words.every((word) => target.includes(word));
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<Dish | null>(null);

  const { dishes: customDishes } = useCustomDishes();

  const allDishes = useMemo(() => {
    const map = new Map<string, Dish>();
    DISHES.forEach((d) => map.set(d.id, d));
    customDishes.forEach((d) => map.set(d.id, d));
    return Array.from(map.values());
  }, [customDishes]);

  const filteredDishes = useMemo(() => {
    if (!searchQuery.trim()) return allDishes.slice(0, 5);
    return allDishes.filter((d) => fuzzyMatch(d.name, searchQuery)).slice(0, 15);
  }, [searchQuery, allDishes]);

  const filteredSnacks = useMemo(() => {
    if (!searchQuery.trim()) return SNACKS.slice(0, 5);
    return SNACKS.filter((s) => fuzzyMatch(s.name, searchQuery)).slice(0, 15);
  }, [searchQuery]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen flex flex-col">
        <SiteHeader onSearchClick={() => setSearchOpen(true)} />
        <main className="flex-1 pb-20 md:pb-0" style={{ viewTransitionName: "main-content" } as React.CSSProperties}>
          <Outlet />
        </main>
        <SiteFooter />
        <Toaster richColors position="top-center" />
        <BottomNav />
        <CalendarSyncObserver />

        <CommandDialog open={searchOpen} onOpenChange={setSearchOpen}>
          <CommandInput
            placeholder="Type a dish or snack..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            {filteredDishes.length === 0 && filteredSnacks.length === 0 && (
              <CommandEmpty>No results found.</CommandEmpty>
            )}

            {filteredDishes.length > 0 && (
              <CommandGroup heading="Dishes">
                {filteredDishes.map((d) => (
                  <CommandItem
                    key={d.id}
                    onSelect={() => {
                      setSelectedItem(d);
                      setSearchOpen(false);
                      setSearchQuery("");
                    }}
                    className="cursor-pointer"
                  >
                    <span className="mr-2 text-xl">{d.emoji}</span>
                    <span>{d.name}</span>
                    {d.cuisine && (
                      <span className="ml-2 rounded-full bg-secondary px-1.5 py-0.5 text-[10px] capitalize text-secondary-foreground">
                        {d.cuisine.replace(/-/g, " ")}
                      </span>
                    )}
                    <span className="ml-auto text-xs text-muted-foreground font-mono">{d.kcal} kcal</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {filteredSnacks.length > 0 && (
              <CommandGroup heading="Snacks">
                {filteredSnacks.map((s) => (
                  <CommandItem
                    key={s.id}
                    onSelect={() => {
                      setSelectedItem(s);
                      setSearchOpen(false);
                      setSearchQuery("");
                    }}
                    className="cursor-pointer"
                  >
                    <span className="mr-2 text-xl">{s.emoji}</span>
                    <span>{s.name}</span>
                    <span className="ml-2 rounded-full bg-warning/15 px-1.5 py-0.5 text-[10px] text-warning-foreground dark:text-warning font-medium">
                      Snack
                    </span>
                    <span className="ml-auto text-xs text-muted-foreground font-mono">{s.kcal} kcal</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </CommandDialog>

        <DishDetailDialog
          dish={selectedItem}
          open={selectedItem !== null}
          onOpenChange={(o) => !o && setSelectedItem(null)}
        />
      </div>
    </QueryClientProvider>
  );
}

function SiteHeader({ onSearchClick }: { onSearchClick: () => void }) {
  const links: { to: string; label: string }[] = [
    { to: "/", label: "Today" },
    { to: "/planner", label: "Planner" },
    { to: "/kuch-bhi", label: "Kuch Bhi" },
    { to: "/history", label: "History" },
    { to: "/snacks", label: "Snacks" },
    { to: "/grocery", label: "Grocery" },
    { to: "/database", label: "Dishes" },
    { to: "/rules", label: "Rules" },
    { to: "/settings", label: "Settings" },
  ];
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto grid grid-cols-[1fr_auto_auto] md:grid-cols-[auto_1fr_auto] items-center gap-4 px-4 py-3">
        <Link to="/" className="flex min-w-0 items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground text-lg">🍛</span>
          <span className="truncate font-display text-xl font-semibold">Aaj Kya Banaye?</span>
        </Link>

        {/* Global Search trigger button */}
        <button
          onClick={onSearchClick}
          className="flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground md:max-w-xs md:w-full ml-auto md:ml-4 select-none"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Search dishes & snacks...</span>
          <kbd className="pointer-events-none hidden md:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground ml-auto">
            <span className="text-xs">⌘</span>K
          </kbd>
        </button>

        <nav className="hidden md:flex flex-wrap items-center gap-1 text-sm justify-end">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              activeOptions={{ exact: l.to === "/" }}
              className="rounded-full px-3 py-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              activeProps={{ className: "rounded-full px-3 py-1.5 bg-secondary text-foreground font-medium" }}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
      Aaj Kya Banaye? · 42-day Indian vegetarian meal planner · stored locally on your device
    </footer>
  );
}
