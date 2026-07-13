import { Link } from "@tanstack/react-router";

const items: { to: string; label: string; emoji: string }[] = [
  { to: "/", label: "Today", emoji: "🍽️" },
  { to: "/planner", label: "Plan", emoji: "📅" },
  { to: "/decide", label: "Decide", emoji: "🎲" },
  { to: "/history", label: "History", emoji: "📊" },
  { to: "/database", label: "Dishes", emoji: "📖" },
];

export function BottomNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex items-stretch justify-around border-t border-border bg-background/95 backdrop-blur pb-[env(safe-area-inset-bottom)] md:hidden"
      aria-label="Primary"
    >
      {items.map((i) => (
        <Link
          key={i.to}
          to={i.to}
          activeOptions={{ exact: i.to === "/" }}
          className="flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-[11px] text-muted-foreground transition-colors"
          activeProps={{ className: "flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-[11px] text-primary font-medium" }}
        >
          <span className="text-xl leading-none">{i.emoji}</span>
          <span>{i.label}</span>
        </Link>
      ))}
    </nav>
  );
}