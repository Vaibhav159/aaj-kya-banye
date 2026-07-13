import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

const BASE_URL = "";

interface SitemapEntry {
  path: string;
  changefreq?: "weekly" | "daily" | "monthly";
  priority?: string;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries: SitemapEntry[] = [
          { path: "/", changefreq: "daily", priority: "1.0" },
          { path: "/planner", changefreq: "daily", priority: "0.8" },
          { path: "/decide", changefreq: "daily", priority: "0.7" },
          { path: "/history", changefreq: "daily", priority: "0.6" },
          { path: "/snacks", changefreq: "weekly", priority: "0.6" },
          { path: "/grocery", changefreq: "daily", priority: "0.8" },
          { path: "/database", changefreq: "weekly", priority: "0.6" },
          { path: "/rules", changefreq: "monthly", priority: "0.4" },
          { path: "/settings", changefreq: "monthly", priority: "0.4" },
        ];
        const urls = entries
          .map((e) =>
            [
              `  <url>`,
              `    <loc>${BASE_URL}${e.path}</loc>`,
              e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
              e.priority ? `    <priority>${e.priority}</priority>` : null,
              `  </url>`,
            ].filter(Boolean).join("\n"),
          )
          .join("\n");
        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
        return new Response(xml, {
          headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" },
        });
      },
    },
  },
});