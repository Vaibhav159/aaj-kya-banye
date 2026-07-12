import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEFAULT_PROFILE, useCycleStart, useProfile, type Profile } from "@/lib/store";
import { buildIcs, downloadIcs } from "@/lib/ical";
import { applyOverrides, currentDayIndex, useOverrides } from "@/lib/store";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings · Thali" },
      { name: "description", content: "Set your name, weight, target and daily calorie / macro goals for your meal plan." },
      { property: "og:title", content: "Settings · Thali" },
      { property: "og:description", content: "Personalise your Thali meal-plan profile and goals." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { profile, save, hydrated } = useProfile();
  const { start, reset } = useCycleStart();
  const { overrides } = useOverrides();
  const [form, setForm] = useState<Profile>(DEFAULT_PROFILE);

  useEffect(() => {
    if (hydrated) setForm(profile);
  }, [hydrated, profile]);

  const update = <K extends keyof Profile>(k: K, v: Profile[K]) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
      <header>
        <p className="text-sm uppercase tracking-wide text-muted-foreground">Profile</p>
        <h1 className="font-display text-4xl font-semibold">Settings</h1>
      </header>

      <Card>
        <CardHeader><CardTitle>You</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Name">
            <Input value={form.name} onChange={(e) => update("name", e.target.value)} />
          </Field>
          <Field label="Weight (kg)">
            <Input type="number" value={form.weightKg} onChange={(e) => update("weightKg", Number(e.target.value))} />
          </Field>
          <Field label="Target weight (kg)">
            <Input type="number" value={form.targetKg} onChange={(e) => update("targetKg", Number(e.target.value))} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Daily goals</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Calories (kcal)"><Input type="number" value={form.goalKcal} onChange={(e) => update("goalKcal", Number(e.target.value))} /></Field>
          <Field label="Protein (g)"><Input type="number" value={form.goalProtein} onChange={(e) => update("goalProtein", Number(e.target.value))} /></Field>
          <Field label="Carbs (g)"><Input type="number" value={form.goalCarbs} onChange={(e) => update("goalCarbs", Number(e.target.value))} /></Field>
          <Field label="Fat (g)"><Input type="number" value={form.goalFat} onChange={(e) => update("goalFat", Number(e.target.value))} /></Field>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => { save(form); toast.success("Settings saved"); }}>Save</Button>
        <Button variant="outline" onClick={() => { reset(); toast.success("Cycle restarted at day 1"); }}>Restart 42-day cycle</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Reminders & sync</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-secondary/40 p-4">
            <div>
              <div className="font-medium">Calendar (.ics)</div>
              <p className="text-sm text-muted-foreground">Download 30 days of meals as calendar events.</p>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                const plan = applyOverrides(overrides);
                const idx = currentDayIndex(start);
                downloadIcs("thali-month.ics", buildIcs(plan, idx, 30));
                toast.success("Downloaded thali-month.ics");
              }}
            >
              Download .ics
            </Button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-border bg-muted/40 p-4">
            <div>
              <div className="font-medium">Telegram reminders</div>
              <p className="text-sm text-muted-foreground">
                Get a bot ping at meal times. Requires connecting Telegram (bot token via BotFather).
              </p>
            </div>
            <Button variant="outline" disabled title="Coming soon — needs Telegram bot connection">Connect Telegram</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}