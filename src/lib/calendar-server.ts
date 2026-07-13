import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Move the server function here to prevent TanStack Router route-stripping from breaking client exports
export const saveCalendarFeed = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string(),
      start: z.number(),
      overrides: z.record(z.string(), z.string()),
      times: z.object({
        breakfast: z.string(),
        lunch: z.string(),
        dinner: z.string(),
      }),
    })
  )
  .handler(async ({ data }) => {
    const fs = await import("fs/promises");
    const path = await import("path");

    const dir = path.join(process.cwd(), "data", "feeds");
    await fs.mkdir(dir, { recursive: true });

    const filePath = path.join(dir, `${data.id}.json`);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");

    return { success: true };
  });
