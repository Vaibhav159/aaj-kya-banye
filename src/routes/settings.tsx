import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEFAULT_PROFILE, useCycleStart, useProfile, type Profile, syncAllData } from "@/lib/store";
import { buildIcs, downloadIcs } from "@/lib/ical";
import { applyOverrides, currentDayIndex, useOverrides } from "@/lib/store";
import { saveCalendarFeed } from "@/lib/calendar-server";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings · Aaj Kya Banaye?" },
      { name: "description", content: "Set your name, weight, target and daily calorie / macro goals for your meal plan." },
      { property: "og:title", content: "Settings · Aaj Kya Banaye?" },
      { property: "og:description", content: "Personalise your Aaj Kya Banaye? meal-plan profile and goals." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { profile, save, hydrated } = useProfile();
  const { start, reset } = useCycleStart();
  const { overrides } = useOverrides();
  const [form, setForm] = useState<Profile>(DEFAULT_PROFILE);
  const [feedId, setFeedId] = useState("");

  const [user, setUser] = useState<any>(null);
  const [syncLoading, setSyncLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (hydrated) setForm(profile);
  }, [hydrated, profile]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setSyncLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter email and password");
      return;
    }
    setSyncLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Signed in successfully!");
        setEmail("");
        setPassword("");
        await syncAllData();
      }
    } catch (err: any) {
      toast.error(`Sync failed: ${err.message || err}`);
    } finally {
      setSyncLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter email and password");
      return;
    }
    setSyncLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Account created! Please check your email or sign in.");
        setEmail("");
        setPassword("");
        if (data?.user) {
          await syncAllData();
        }
      }
    } catch (err: any) {
      toast.error(`Sync failed: ${err.message || err}`);
    } finally {
      setSyncLoading(false);
    }
  };

  const handleSignOut = async () => {
    setSyncLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Signed out successfully!");
        window.dispatchEvent(new Event("thali:sync"));
      }
    } catch (err: any) {
      toast.error(err.message || String(err));
    } finally {
      setSyncLoading(false);
    }
  };

  const handleManualSync = async () => {
    setSyncLoading(true);
    try {
      await syncAllData();
      toast.success("Sync completed successfully!");
    } catch (err: any) {
      toast.error(`Sync failed: ${err.message || err}`);
    } finally {
      setSyncLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      setFeedId(window.localStorage.getItem("thali:calendarFeedId") || "");
    }
  }, []);

  const subscriptionUrl = typeof window !== "undefined"
    ? `${window.location.origin}${window.location.pathname.replace(/\/settings\/?$/, "")}/api/calendar?id=${feedId}`
    : "";

  const toggleFeed = async () => {
    if (feedId) {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem("thali:calendarFeedId");
      }
      setFeedId("");
      toast.success("Calendar subscription disabled");
    } else {
      const newId = `f${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`;
      if (typeof window !== "undefined") {
        window.localStorage.setItem("thali:calendarFeedId", newId);
      }
      setFeedId(newId);
      
      try {
        await saveCalendarFeed({
          data: {
            id: newId,
            start,
            overrides,
            times: {
              breakfast: form.breakfastTime,
              lunch: form.lunchTime,
              dinner: form.dinnerTime,
            },
          },
        });
        toast.success("Calendar subscription enabled!");
      } catch (err) {
        console.error("Failed to save calendar feed on server:", err);
        toast.success("Calendar subscription enabled locally.");
      }
    }
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(subscriptionUrl);
    toast.success("Subscription URL copied to clipboard!");
  };

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

      <Card>
        <CardHeader><CardTitle>Reminder timing</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <Field label="Breakfast"><Input type="time" value={form.breakfastTime} onChange={(e) => update("breakfastTime", e.target.value)} /></Field>
          <Field label="Lunch"><Input type="time" value={form.lunchTime} onChange={(e) => update("lunchTime", e.target.value)} /></Field>
          <Field label="Dinner"><Input type="time" value={form.dinnerTime} onChange={(e) => update("dinnerTime", e.target.value)} /></Field>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => { save(form); toast.success("Settings saved"); }}>Save</Button>
        <Button variant="outline" onClick={() => { reset(); toast.success("Cycle restarted at day 1"); }}>Restart 42-day cycle</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cloud Backup & Sync</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {syncLoading ? (
            <div className="py-4 text-center text-sm text-muted-foreground">Loading sync status...</div>
          ) : user ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-success/30 bg-success/5 p-4 text-sm">
                <div>
                  <div className="font-semibold text-success flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-success inline-block"></span>
                    Sync Active
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">Logged in as {user.email}</div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={handleManualSync}>
                    Sync Now
                  </Button>
                  <Button size="sm" variant="destructive" onClick={handleSignOut}>
                    Sign Out
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Back up your meal log, custom rules, and overrides to the cloud to access them across devices.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Email Address">
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </Field>
                <Field label="Password">
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </Field>
              </div>
              <div className="flex gap-2 pt-2">
                <Button size="sm" onClick={handleSignIn}>
                  Sign In
                </Button>
                <Button size="sm" variant="secondary" onClick={handleSignUp}>
                  Create Account
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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
                downloadIcs("thali-month.ics", buildIcs(plan, idx, 30, new Date(), {
                  breakfast: form.breakfastTime,
                  lunch: form.lunchTime,
                  dinner: form.dinnerTime,
                }));
                toast.success("Downloaded thali-month.ics");
              }}
            >
              Download .ics
            </Button>
          </div>

          <div className="flex flex-col gap-3 rounded-lg border border-border bg-secondary/40 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex-1 min-w-[240px]">
                <div className="font-medium">Dynamic Calendar Subscription</div>
                <p className="text-sm text-muted-foreground">
                  Subscribe to a live calendar feed that updates automatically in your calendar app whenever you swap or log meals.
                </p>
              </div>
              <Button
                variant={feedId ? "destructive" : "default"}
                onClick={toggleFeed}
                className="shrink-0"
              >
                {feedId ? "Disable Subscription" : "Enable Subscription"}
              </Button>
            </div>
            
            {feedId && (
              <div className="mt-2 space-y-2 border-t border-border pt-3">
                <Label className="text-xs font-semibold text-muted-foreground uppercase">Subscription URL</Label>
                <div className="flex gap-2">
                  <Input readOnly value={subscriptionUrl} className="font-mono text-xs bg-background" />
                  <Button variant="outline" size="sm" onClick={copyUrl} className="shrink-0">
                    Copy URL
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Copy this URL and paste it into Apple Calendar (Add Subscribed Calendar), Google Calendar (From URL), or Outlook to subscribe.
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-border bg-muted/40 p-4">
            <div>
              <div className="font-medium">Telegram reminders</div>
              <p className="text-sm text-muted-foreground">
                Ping at {form.breakfastTime} / {form.lunchTime} / {form.dinnerTime}. Requires connecting Telegram — ask to enable it and we'll wire the bot.
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