import { createFileRoute } from "@tanstack/react-router";
import { buildIcs } from "../lib/ical";
import { applyOverrides } from "../lib/store";

export const Route = createFileRoute("/api/calendar")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const id = url.searchParams.get("id");

        if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) {
          return new Response("Invalid or missing calendar feed ID", { status: 400 });
        }

        try {
          const fs = await import("fs/promises");
          const path = await import("path");

          const filePath = path.join(process.cwd(), "data", "feeds", `${id}.json`);
          const dataStr = await fs.readFile(filePath, "utf-8");
          const feedData = JSON.parse(dataStr) as {
            start: number;
            cycleLength?: number;
            overrides: Record<string, string>;
            times: { breakfast: string; lunch: string; dinner: string };
          };

          const cycleLen = feedData.cycleLength || 42;
          const plan = applyOverrides(feedData.overrides, cycleLen);
          
          // Calculate sliding day index relative to request date (today)
          const cycleStart = feedData.start;
          const msPerDay = 86400000;
          const startMidnight = new Date(cycleStart);
          startMidnight.setHours(0, 0, 0, 0);
          const nowMidnight = new Date();
          nowMidnight.setHours(0, 0, 0, 0);
          const diff = Math.floor((nowMidnight.getTime() - startMidnight.getTime()) / msPerDay);
          const currentIdx = ((diff % cycleLen) + cycleLen) % cycleLen;

          const icsString = buildIcs(plan, currentIdx, 30, new Date(), feedData.times);

          return new Response(icsString, {
            headers: {
              "Content-Type": "text/calendar; charset=utf-8",
              "Content-Disposition": `attachment; filename="meal-plan-calendar.ics"`,
              "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
            },
          });
        } catch (error) {
          console.error(`Error loading feed data for id ${id}:`, error);
          return new Response("Calendar feed not found", { status: 404 });
        }
      },
    },
  },
});
