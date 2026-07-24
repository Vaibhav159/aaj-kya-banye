import { Link, useLocation } from "@tanstack/react-router";
import { Menu } from "lucide-react";

interface BottomNavProps {
  onOpenMenu?: () => void;
}

const primaryItems: { to: string; label: string; emoji: string }[] = [
  { to: "/", label: "Today", emoji: "🍽️" },
  { to: "/planner", label: "Plan", emoji: "📅" },
  { to: "/kuch-bhi", label: "Kuch Bhi", emoji: "🎲" },
  { to: "/grocery", label: "Grocery", emoji: "🛒" },
];

const secondaryRoutes = ["/database", "/history", "/snacks", "/rules", "/settings"];

export function BottomNav({ onOpenMenu }: BottomNavProps) {
  const location = useLocation();
  const isMoreActive = secondaryRoutes.some(
    (path) => location.pathname === path || location.pathname.startsWith(`${path}/`)
  );

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex items-stretch justify-around border-t border-border bg-background/95 backdrop-blur pb-[env(safe-area-inset-bottom)] md:hidden"
      aria-label="Primary"
    >
      {primaryItems.map((i) => (
        <Link
          key={i.to}
          to={i.to}
          activeOptions={{ exact: i.to === "/" }}
          className="flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-[11px] text-muted-foreground transition-colors"
          activeProps={{
            className:
              "flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-[11px] text-primary font-medium",
          }}
        >
          <span className="text-xl leading-none">{i.emoji}</span>
          <span>{i.label}</span>
        </Link>
      ))}

      <button
        type="button"
        onClick={onOpenMenu}
        className={`flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-[11px] transition-colors select-none ${
          isMoreActive ? "text-primary font-medium" : "text-muted-foreground hover:text-foreground"
        }`}
        aria-label="Open full menu"
      >
        <span className="text-xl leading-none">📑</span>
        <span>More</span>
      </button>
    </nav>
  );
}