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
import { useProfile, useCycleStart, useOverrides, useCustomDishes, applyOverrides, currentDayIndex } from "@/lib/store";
import { saveCalendarFeed } from "@/lib/calendar-server";
import { DISHES, type Dish } from "@/lib/dishes";
import { SNACKS } from "@/lib/snacks";
import { DishDetailDialog } from "@/components/dish-detail";
import { Search, Menu, Sparkles, ChevronRight, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,

  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import appCss from "../styles.css?url";
import logoSvg from "../../public/logo.svg?url";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { BottomNav } from "@/components/bottom-nav";
import { OnboardingDialog } from "@/components/onboarding-dialog";


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
      { name: "theme-color", content: "#d97706" },
      { title: "Aaj Kya Banaye? — Indian Vegetarian Meal Planner" },
      { name: "description", content: "A 42-day rotating Indian vegetarian meal planner with macro tracking, intelligent dish swap engine, craving-based snacks, and smart grocery list." },
      { name: "keywords", content: "Indian meal planner, vegetarian meal plan, Indian recipes, daily thali, macro tracking, grocery list, Indian food diet plan" },
      { name: "author", content: "Aaj Kya Banaye?" },
      { name: "robots", content: "index, follow" },
      { property: "og:site_name", content: "Aaj Kya Banaye?" },
      { property: "og:type", content: "website" },
      { property: "og:title", content: "Aaj Kya Banaye? — 42-Day Indian Vegetarian Meal Planner" },
      { property: "og:description", content: "Smart 42-day rotating Indian vegetarian meal plan with macros, instant swaps, snacks, and grocery list." },
      { property: "og:image", content: "./icon-512.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Aaj Kya Banaye? — Indian Vegetarian Meal Planner" },
      { name: "twitter:description", content: "Smart 42-day rotating Indian vegetarian meal planner with macro tracking and custom nutrition rules." },
      { name: "twitter:image", content: "./icon-512.png" },
      { name: "google-site-verification", content: "q7O2uNWrbW9e8_Cdk1kfyJd5kntd7VHh6JH_9M-QWdI" },
    ],
    links: [
      { rel: "manifest", href: "./manifest.webmanifest" },
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: logoSvg, type: "image/svg+xml" },
      { rel: "alternate icon", href: "./favicon.ico", type: "image/x-icon" },
      { rel: "apple-touch-icon", href: "./icon-192.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "preload",
        as: "style",
        href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap",
      },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebApplication",
          "name": "Aaj Kya Banaye?",
          "alternateName": "Thali Meal Planner",
          "applicationCategory": "HealthApplication",
          "operatingSystem": "All",
          "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "USD"
          },
          "description": "A 42-day rotating Indian vegetarian meal planner with macro tracking, custom nutrition rules, and aggregated grocery lists."
        }),
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
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function() {
              try {
                var mode = localStorage.getItem('thali:theme') || 'system';
                var dark = mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
                if (dark) document.documentElement.classList.add('dark');
                else document.documentElement.classList.remove('dark');
              } catch (e) {}
            })();`,
          }}
        />
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<Dish | null>(null);

  const { dishes: customDishes } = useCustomDishes();
  const { setMany } = useOverrides();
  const { profile } = useProfile();
  const [sharedOverrides, setSharedOverrides] = useState<any>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);

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

  // Register PWA Service Worker for offline capability
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("./sw.js")
        .then((reg) => console.log("Thali SW registered:", reg.scope))
        .catch((err) => console.error("Thali SW registration failed:", err));
    }
  }, []);

  // Shared meal plan detection
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const importPlan = params.get("importPlan");
    if (importPlan) {
      try {
        const base64 = importPlan.replace(/-/g, "+").replace(/_/g, "/");
        const decoded = JSON.parse(atob(base64));
        if (decoded && typeof decoded === "object") {
          setSharedOverrides(decoded);
          setShowImportDialog(true);
        }
      } catch (err) {
        console.error("Failed to parse shared overrides:", err);
        toast.error("Invalid or corrupt shared meal plan link");
      }
      
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }
  }, []);

  // Meal time reminders check
  useEffect(() => {
    if (typeof window === "undefined" || typeof Notification === "undefined") return;

    const interval = setInterval(() => {
      const enabled = localStorage.getItem("thali:remindersEnabled") === "true";
      if (!enabled || Notification.permission !== "granted") return;

      const now = new Date();
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const timeStr = `${hours}:${minutes}`;

      let matchedSlot: "breakfast" | "lunch" | "dinner" | null = null;
      if (timeStr === profile.breakfastTime) matchedSlot = "breakfast";
      else if (timeStr === profile.lunchTime) matchedSlot = "lunch";
      else if (timeStr === profile.dinnerTime) matchedSlot = "dinner";

      if (matchedSlot) {
        const dateKey = now.toDateString();
        const notifiedKey = `thali:notified-${dateKey}-${matchedSlot}`;
        if (!localStorage.getItem(notifiedKey)) {
          localStorage.setItem(notifiedKey, "true");
          
          const cycleStart = Number(localStorage.getItem("thali:cycleStart") || 0);
          if (cycleStart) {
            const dayIdx = currentDayIndex(cycleStart, now.getTime());
            const localOverrides = JSON.parse(localStorage.getItem("thali:overrides") || "{}");
            const plan = applyOverrides(localOverrides);
            const todayPlan = plan[dayIdx];
            const dishId = todayPlan?.[matchedSlot];
            const dish = dishId ? DISHES.find(d => d.id === dishId) : null;
            
            const mealName = dish ? `${dish.emoji} ${dish.name}` : "your meal";
            
            try {
              new Notification("Meal Time Alert! 🍛", {
                body: `It's time for your ${matchedSlot}! Today's menu: ${mealName}.`,
                icon: "/favicon.ico",
              });
            } catch (err) {
              console.error("Failed to show notification:", err);
            }
          }
        }
      }
    }, 60000); // Check once per minute

    return () => clearInterval(interval);
  }, [profile.breakfastTime, profile.lunchTime, profile.dinnerTime]);

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen flex flex-col">
        <SiteHeader
          onSearchClick={() => setSearchOpen(true)}
          onMenuClick={() => setMenuOpen(true)}
        />
        <main className="flex-1 pb-20 md:pb-0" style={{ viewTransitionName: "main-content" } as React.CSSProperties}>
          <Outlet />
        </main>
        <SiteFooter />
        <Toaster richColors position="top-center" />
        <BottomNav onOpenMenu={() => setMenuOpen(true)} />
        <CalendarSyncObserver />
        <OnboardingDialog open={onboardingOpen} onOpenChange={setOnboardingOpen} />

        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetContent side="right" className="w-[85%] sm:max-w-sm p-0 flex flex-col">
            <div className="p-5 overflow-y-auto flex-1 space-y-5">
              <SheetHeader className="text-left space-y-1 border-b border-border pb-4">
                <div className="flex items-center gap-2.5">
                  <img src={logoSvg} alt="Logo" className="h-7 w-7 shrink-0" />
                  <SheetTitle className="font-display text-lg font-semibold">Aaj Kya Banaye?</SheetTitle>
                </div>
                <SheetDescription className="text-xs">
                  42-day Indian vegetarian meal planner
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-1">
                <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase px-2 mb-1.5">
                  Navigation
                </p>
                {[
                  { to: "/", label: "Today", desc: "Daily meals & macro status", emoji: "🍽️" },
                  { to: "/planner", label: "Planner", desc: "42-day rotating meal plan", emoji: "📅" },
                  { to: "/kuch-bhi", label: "Kuch Bhi", desc: "Random meal decision helper", emoji: "🎲" },
                  { to: "/history", label: "History", desc: "Meal logs & streak history", emoji: "📊" },
                  { to: "/snacks", label: "Snacks", desc: "Craving-based snack finder", emoji: "🍿" },
                  { to: "/grocery", label: "Grocery", desc: "Aggregated shopping list", emoji: "🛒" },
                  { to: "/database", label: "Dishes", desc: "150+ recipe database", emoji: "📖" },
                  { to: "/rules", label: "Rules", desc: "Custom nutrition rules", emoji: "⚡" },
                  { to: "/settings", label: "Settings", desc: "Profile, iCal & preferences", emoji: "⚙️" },
                ].map((l) => (
                  <Link
                    key={l.to}
                    to={l.to}
                    activeOptions={{ exact: l.to === "/" }}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center justify-between rounded-xl px-3 py-2 text-sm transition-colors hover:bg-secondary/70 group"
                    activeProps={{ className: "flex items-center justify-between rounded-xl px-3 py-2 text-sm bg-secondary font-medium text-foreground group" }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg leading-none">{l.emoji}</span>
                      <div>
                        <div className="font-medium leading-tight">{l.label}</div>
                        <div className="text-[10px] text-muted-foreground">{l.desc}</div>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </Link>
                ))}
              </div>

              <div className="space-y-2 border-t border-border pt-4">
                <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase px-2">
                  Quick Actions
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    setSearchOpen(true);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl border border-border bg-secondary/30 px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-secondary"
                >
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <span>Search Dishes & Snacks</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    setOnboardingOpen(true);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl border border-border bg-secondary/30 px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-secondary"
                >
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  <span>Relaunch Setup Wizard</span>
                </button>
              </div>
            </div>
          </SheetContent>
        </Sheet>

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

        <AlertDialog open={showImportDialog} onOpenChange={setShowImportDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="font-display">Import Shared Meal Plan?</AlertDialogTitle>
              <AlertDialogDescription>
                We found a shared meal plan in the link. Do you want to apply these custom meal overrides? This will merge them with your current meal plan.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (sharedOverrides) {
                    setMany(sharedOverrides);
                    toast.success("Shared meal plan imported successfully!");
                  }
                  setShowImportDialog(false);
                }}
              >
                Import
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </QueryClientProvider>
  );
}

function SiteHeader({
  onSearchClick,
  onMenuClick,
}: {
  onSearchClick: () => void;
  onMenuClick: () => void;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto grid grid-cols-[1fr_auto_auto] md:grid-cols-[auto_1fr_auto] items-center gap-2 md:gap-3 px-4 py-3">
        <Link to="/" className="flex min-w-0 items-center gap-2.5">
          <img src={logoSvg} alt="Aaj Kya Banaye Logo" className="h-9 w-9 shrink-0 drop-shadow-sm" />
          <span className="truncate font-display text-xl font-semibold">Aaj Kya Banaye?</span>
        </Link>

        {/* Global Search trigger button */}
        <button
          type="button"
          aria-label="Search dishes and snacks"
          onClick={onSearchClick}
          className="flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground md:max-w-xs md:w-full ml-auto md:ml-4 select-none"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Search dishes & snacks...</span>
          <kbd className="pointer-events-none hidden md:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground ml-auto">
            <span className="text-xs">⌘</span>K
          </kbd>
        </button>

        {/* Mobile Menu Button */}
        <button
          type="button"
          aria-label="Open mobile menu"
          onClick={onMenuClick}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-secondary/50 text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring select-none shrink-0 md:hidden"
        >
          <Menu className="h-4 w-4" />
        </button>

        <nav className="hidden md:flex items-center gap-1.5 text-sm justify-end">
          <Link
            to="/"
            activeOptions={{ exact: true }}
            className="rounded-full px-3 py-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            activeProps={{ className: "rounded-full px-3 py-1.5 bg-secondary text-foreground font-medium" }}
          >
            Today
          </Link>

          <Link
            to="/planner"
            className="rounded-full px-3 py-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            activeProps={{ className: "rounded-full px-3 py-1.5 bg-secondary text-foreground font-medium" }}
          >
            Planner
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1 rounded-full px-3 py-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground outline-none">
              <span>Explore</span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 p-1">
              <DropdownMenuItem asChild>
                <Link to="/kuch-bhi" className="flex items-center gap-2 cursor-pointer">
                  <span>🎲</span>
                  <span>Kuch Bhi Helper</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/snacks" className="flex items-center gap-2 cursor-pointer">
                  <span>🍿</span>
                  <span>Snack Finder</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/database" className="flex items-center gap-2 cursor-pointer">
                  <span>📖</span>
                  <span>Dishes & Recipes</span>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Link
            to="/history"
            className="rounded-full px-3 py-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            activeProps={{ className: "rounded-full px-3 py-1.5 bg-secondary text-foreground font-medium" }}
          >
            History
          </Link>

          <Link
            to="/rules"
            className="rounded-full px-3 py-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            activeProps={{ className: "rounded-full px-3 py-1.5 bg-secondary text-foreground font-medium" }}
          >
            Rules
          </Link>

          <Link
            to="/grocery"
            className="rounded-full px-3 py-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            activeProps={{ className: "rounded-full px-3 py-1.5 bg-secondary text-foreground font-medium" }}
          >
            Grocery
          </Link>

          <Link
            to="/settings"
            className="rounded-full px-3 py-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            activeProps={{ className: "rounded-full px-3 py-1.5 bg-secondary text-foreground font-medium" }}
          >
            Settings
          </Link>
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
