import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { useProfile, useCycleStart, useOverrides } from "@/lib/store";
import { saveCalendarFeed } from "@/lib/calendar-server";

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
          id: feedId,
          start,
          overrides,
          times: {
            breakfast: profile.breakfastTime,
            lunch: profile.lunchTime,
            dinner: profile.dinnerTime,
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

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <main className="flex-1 pb-20 md:pb-0">
          <Outlet />
        </main>
        <SiteFooter />
        <Toaster richColors position="top-center" />
        <BottomNav />
        <CalendarSyncObserver />
      </div>
    </QueryClientProvider>
  );
}

function SiteHeader() {
  const links: { to: string; label: string }[] = [
    { to: "/", label: "Today" },
    { to: "/planner", label: "Planner" },
    { to: "/decide", label: "Decide" },
    { to: "/history", label: "History" },
    { to: "/snacks", label: "Snacks" },
    { to: "/grocery", label: "Grocery" },
    { to: "/database", label: "Dishes" },
    { to: "/rules", label: "Rules" },
    { to: "/settings", label: "Settings" },
  ];
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-3">
        <Link to="/" className="flex min-w-0 items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground text-lg">🍛</span>
          <span className="truncate font-display text-xl font-semibold">Aaj Kya Banaye?</span>
        </Link>
        <nav className="hidden md:flex flex-wrap items-center gap-1 text-sm">
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
