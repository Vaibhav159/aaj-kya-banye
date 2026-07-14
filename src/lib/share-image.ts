import { DISHES_BY_ID } from "./dishes";
import type { DayPlan } from "./plan";

interface ShareImageOptions {
  plan: DayPlan[];
  startIdx: number;
  daysToRender?: number;
}

export function drawWeeklyPlan(canvas: HTMLCanvasElement, { plan, startIdx, daysToRender = 7 }: ShareImageOptions) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Set vertical high-resolution layout (800x1200, optimized for mobile viewing/sharing)
  const width = 800;
  const height = 1200;
  canvas.width = width;
  canvas.height = height;

  // 1. Draw premium background gradient
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#0f172a"); // Deep slate
  gradient.addColorStop(0.5, "#1e1b4b"); // Deep indigo
  gradient.addColorStop(1, "#311042"); // Deep plum/wine
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Decorative ambient glow circles
  ctx.fillStyle = "rgba(99, 102, 241, 0.12)"; // Indigo glow
  ctx.beginPath();
  ctx.arc(100, 200, 250, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(236, 72, 153, 0.08)"; // Pink glow
  ctx.beginPath();
  ctx.arc(width - 100, height - 200, 200, 0, Math.PI * 2);
  ctx.fill();

  // 2. Draw Header
  // Logo
  ctx.fillStyle = "#fbbf24";
  ctx.font = "bold 32px sans-serif";
  ctx.fillText("🍛", 50, 70);

  // Title
  ctx.fillStyle = "#ffffff";
  ctx.font = "500 24px Fraunces, Georgia, serif";
  ctx.fillText("Aaj Kya Banaye?", 100, 64);

  // Subtitle
  ctx.fillStyle = "#94a3b8";
  ctx.font = "500 12px Inter, sans-serif";
  ctx.fillText("WEEKLY MEAL PLAN", 100, 82);

  // Brand Watermark
  ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
  ctx.font = "600 11px Inter, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText("aaj-kya-banaye.github.io", width - 50, 70);
  ctx.textAlign = "left"; // reset

  // 3. Draw Vertical Rows
  const paddingX = 50;
  const startY = 120;
  const rowHeight = 128;
  const spacingY = 14;

  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const startDate = new Date();

  for (let i = 0; i < daysToRender; i++) {
    const d = plan[(startIdx + i) % 42];
    const date = new Date(startDate.getTime() + i * 86400000);
    const rowY = startY + i * (rowHeight + spacingY);

    // Draw frosted card background for the row
    ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.roundRect?.(paddingX, rowY, width - paddingX * 2, rowHeight, 16);
    ctx.fill();
    ctx.stroke();

    // Column 1: Day & Date (x: 74)
    ctx.fillStyle = "#f1f5f9";
    ctx.font = "bold 18px Inter, sans-serif";
    ctx.fillText(dayLabels[date.getDay()], paddingX + 20, rowY + 52);

    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    ctx.font = "500 12px Inter, sans-serif";
    ctx.fillText(`${date.getDate()} ${date.toLocaleString("default", { month: "short" })}`, paddingX + 20, rowY + 72);

    // Vertical Divider after day info
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.beginPath();
    ctx.moveTo(paddingX + 105, rowY + 16);
    ctx.lineTo(paddingX + 105, rowY + rowHeight - 16);
    ctx.stroke();

    // Column 2, 3, 4: Breakfast, Lunch, Dinner details
    const slots: { label: string; color: string; id: string; startX: number }[] = [
      { label: "BREAKFAST", color: "#f87171", id: d.breakfast, startX: paddingX + 125 },
      { label: "LUNCH", color: "#fbbf24", id: d.lunch, startX: paddingX + 285 },
      { label: "DINNER", color: "#60a5fa", id: d.dinner, startX: paddingX + 445 },
    ];

    let totalKcal = 0;

    slots.forEach((slot) => {
      const dish = DISHES_BY_ID[slot.id];
      if (!dish) return;
      totalKcal += dish.kcal;

      // Slot Label
      ctx.fillStyle = slot.color;
      ctx.font = "bold 9px Inter, sans-serif";
      ctx.fillText(slot.label, slot.startX, rowY + 34);

      // Emoji
      ctx.fillStyle = "#ffffff";
      ctx.font = "18px sans-serif";
      ctx.fillText(dish.emoji, slot.startX, rowY + 60);

      // Name wrapping (fits inside 140px width)
      ctx.fillStyle = "#e2e8f0";
      ctx.font = "500 12px Inter, sans-serif";

      const maxNameWidth = 125;
      const words = dish.name.split(" ");
      let line = "";
      let lines: string[] = [];

      for (let n = 0; n < words.length; n++) {
        let testLine = line + words[n] + " ";
        let metrics = ctx.measureText(testLine);
        if (metrics.width > maxNameWidth && n > 0) {
          lines.push(line.trim());
          line = words[n] + " ";
        } else {
          line = testLine;
        }
      }
      lines.push(line.trim());

      // Limit to 2 lines max
      if (lines.length > 2) {
        lines = [lines[0], lines[1].substring(0, lines[1].length - 3) + "..."];
      }

      lines.forEach((l, idx) => {
        ctx.fillText(l, slot.startX + 26, rowY + 54 + (idx * 14));
      });
    });

    // Vertical Divider before kcal
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.beginPath();
    ctx.moveTo(width - paddingX - 95, rowY + 16);
    ctx.lineTo(width - paddingX - 95, rowY + rowHeight - 16);
    ctx.stroke();

    // Column 5: Total kcal
    ctx.fillStyle = "#10b981"; // Emerald
    ctx.font = "bold 15px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${totalKcal}`, width - paddingX - 48, rowY + rowHeight / 2 - 2);

    ctx.fillStyle = "#94a3b8";
    ctx.font = "500 11px Inter, sans-serif";
    ctx.fillText("kcal", width - paddingX - 48, rowY + rowHeight / 2 + 14);
    ctx.textAlign = "left"; // reset alignment
  }

  // Footer / Watermark
  ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
  ctx.font = "500 11px Inter, sans-serif";
  ctx.fillText("🌿 100% Indian Vegetarian Meal Plan", 50, height - 50);
}
