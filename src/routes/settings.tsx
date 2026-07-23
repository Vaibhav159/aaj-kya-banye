import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEFAULT_PROFILE, useCycleStart, useProfile, type Profile, syncAllData, readLS } from "@/lib/store";
import { buildIcs, downloadIcs } from "@/lib/ical";
import { applyOverrides, currentDayIndex, useOverrides } from "@/lib/store";
import { saveCalendarFeed } from "@/lib/calendar-server";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useTheme } from "@/lib/theme";
import { Sun, Moon, Monitor, Sparkles } from "lucide-react";
import { OnboardingDialog } from "@/components/onboarding-dialog";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings & Profile Preferences · Aaj Kya Banaye?" },
      { name: "description", content: "Configure custom calorie targets, macro ratios, meal reminder times, iCal calendar feeds, and Supabase cloud sync." },
      { property: "og:title", content: "Settings & Profile Preferences · Aaj Kya Banaye?" },
      { property: "og:description", content: "Personalize daily calorie goals, macro targets, and calendar sync." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { profile, save, hydrated } = useProfile();
  const { start, reset } = useCycleStart();
  const { overrides } = useOverrides();
  const [form, setForm] = useState<Profile>(DEFAULT_PROFILE);
  const [feedId, setFeedId] = useState("");
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);

  const [user, setUser] = useState<any>(null);
  const [syncLoading, setSyncLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<string>("default");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setNotificationsEnabled(window.localStorage.getItem("thali:remindersEnabled") === "true");
      if (typeof Notification !== "undefined") {
        setNotificationPermission(Notification.permission);
      } else {
        setNotificationPermission("unsupported");
      }
    }
  }, []);

  const toggleNotifications = async () => {
    if (typeof Notification === "undefined") {
      toast.error("Notifications are not supported in this browser");
      return;
    }

    if (Notification.permission !== "granted") {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission !== "granted") {
        toast.error("Notification permission denied. Please enable them in browser settings.");
        return;
      }
    }

    const nextVal = !notificationsEnabled;
    setNotificationsEnabled(nextVal);
    window.localStorage.setItem("thali:remindersEnabled", String(nextVal));
    if (nextVal) {
      toast.success("Meal time notifications enabled!");
      try {
        new Notification("Aaj Kya Banaye? 🍛", {
          body: "Notifications are now active! We'll alert you at your scheduled meal times.",
          icon: "/favicon.ico",
        });
      } catch (err) {
        console.error(err);
      }
    } else {
      toast.success("Meal time notifications disabled.");
    }
  };

  const handleExportJSON = () => {
    try {
      const data = {
        version: 1,
        profile: readLS("thali:profile", DEFAULT_PROFILE),
        cycleStart: readLS("thali:cycleStart", null),
        overrides: readLS("thali:overrides", {}),
        log: readLS("thali:log", {}),
        customDishes: readLS("thali:customDishes", []),
        customRules: readLS("thali:customRules", []),
        remindersEnabled: localStorage.getItem("thali:remindersEnabled") === "true",
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `aaj-kya-banaye-backup-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Backup exported successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to export data");
    }
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!parsed || typeof parsed !== "object") throw new Error("Invalid format");
        
        if (parsed.profile) {
          localStorage.setItem("thali:profile", JSON.stringify(parsed.profile));
        }
        if (parsed.cycleStart) {
          localStorage.setItem("thali:cycleStart", JSON.stringify(parsed.cycleStart));
        }
        if (parsed.overrides) {
          localStorage.setItem("thali:overrides", JSON.stringify(parsed.overrides));
        }
        if (parsed.log) {
          localStorage.setItem("thali:log", JSON.stringify(parsed.log));
        }
        if (parsed.customDishes) {
          localStorage.setItem("thali:customDishes", JSON.stringify(parsed.customDishes));
        }
        if (parsed.customRules) {
          localStorage.setItem("thali:customRules", JSON.stringify(parsed.customRules));
        }
        if (typeof parsed.remindersEnabled === "boolean") {
          localStorage.setItem("thali:remindersEnabled", String(parsed.remindersEnabled));
        }

        toast.success("Backup imported successfully!");

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          toast.promise(syncAllData(), {
            loading: "Syncing imported data with cloud...",
            success: "Cloud sync complete!",
            error: "Failed to sync with cloud. Try manually syncing.",
          });
        }

        window.dispatchEvent(new Event("thali:sync"));
        setForm({ ...DEFAULT_PROFILE, ...readLS<Partial<Profile>>("thali:profile", {}) });
      } catch (err) {
        console.error(err);
        toast.error("Failed to parse JSON file. Ensure it is a valid backup file.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  useEffect(() => {
    if (hydrated) setForm(profile);
  }, [hydrated, profile]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }: any) => {
      setUser(user);
      setSyncLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
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

  const calculateGoals = () => {
    const { weightKg, targetKg } = form;
    if (!weightKg || !targetKg) {
      toast.error("Please enter both Weight and Target weight first!");
      return;
    }
    
    // Baseline Maintenance: weightKg * 30
    const maintenance = weightKg * 30;
    let kcal = maintenance;
    
    if (targetKg < weightKg) {
      // Weight loss deficit: -400 kcal (cap at 1200 kcal min)
      kcal = Math.max(1200, maintenance - 400);
    } else if (targetKg > weightKg) {
      // Weight gain surplus: +300 kcal
      kcal = maintenance + 300;
    }
    
    const goalKcal = Math.round(kcal);
    const goalProtein = Math.round(targetKg * 1.8);
    const goalFat = Math.round((goalKcal * 0.25) / 9);
    const goalCarbs = Math.round((goalKcal - (goalProtein * 4) - (goalFat * 9)) / 4);
    
    setForm((prev) => ({
      ...prev,
      goalKcal,
      goalProtein,
      goalCarbs,
      goalFat,
    }));
    
    toast.success(`Goals auto-calculated for target weight ${targetKg} kg!`);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-wide text-muted-foreground">Profile</p>
          <h1 className="font-display text-4xl font-semibold">Settings</h1>
        </div>
        <Button
          onClick={() => setIsOnboardingOpen(true)}
          variant="outline"
          className="gap-1.5 cursor-pointer text-xs"
        >
          <Sparkles className="h-4 w-4 text-amber-500" /> Relaunch Setup Wizard
        </Button>
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
        <CardHeader>
          <CardTitle>Appearance & Theme</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Choose your preferred theme mode or follow your system settings automatically.
          </p>
          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setTheme("system")}
              className={`flex flex-col items-center justify-center gap-2 rounded-xl border p-4 text-center transition-all ${
                theme === "system"
                  ? "border-primary bg-primary/10 text-primary font-medium shadow-sm"
                  : "border-border bg-card hover:bg-secondary/50 text-muted-foreground hover:text-foreground"
              }`}
            >
              <Monitor className="h-5 w-5" />
              <span className="text-xs font-semibold">System</span>
            </button>

            <button
              type="button"
              onClick={() => setTheme("light")}
              className={`flex flex-col items-center justify-center gap-2 rounded-xl border p-4 text-center transition-all ${
                theme === "light"
                  ? "border-primary bg-primary/10 text-primary font-medium shadow-sm"
                  : "border-border bg-card hover:bg-secondary/50 text-muted-foreground hover:text-foreground"
              }`}
            >
              <Sun className="h-5 w-5" />
              <span className="text-xs font-semibold">Light</span>
            </button>

            <button
              type="button"
              onClick={() => setTheme("dark")}
              className={`flex flex-col items-center justify-center gap-2 rounded-xl border p-4 text-center transition-all ${
                theme === "dark"
                  ? "border-primary bg-primary/10 text-primary font-medium shadow-sm"
                  : "border-border bg-card hover:bg-secondary/50 text-muted-foreground hover:text-foreground"
              }`}
            >
              <Moon className="h-5 w-5" />
              <span className="text-xs font-semibold">Dark</span>
            </button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle>Daily goals</CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={calculateGoals}
            className="text-xs"
            type="button"
          >
            Auto-calculate
          </Button>
        </CardHeader>
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
          {!isSupabaseConfigured ? (
            <div className="rounded-lg border border-dashed border-border bg-muted/40 p-4 text-center">
              <p className="text-sm text-muted-foreground">
                Cloud Sync is disabled. Configure <code className="font-mono text-xs bg-muted px-1 rounded">VITE_SUPABASE_URL</code> and <code className="font-mono text-xs bg-muted px-1 rounded">VITE_SUPABASE_ANON_KEY</code> to enable backup & sync.
              </p>
            </div>
          ) : syncLoading ? (
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
                downloadIcs("meal-plan-month.ics", buildIcs(plan, idx, 30, new Date(), {
                  breakfast: form.breakfastTime,
                  lunch: form.lunchTime,
                  dinner: form.dinnerTime,
                }));
                toast.success("Downloaded meal-plan-month.ics");
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

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-secondary/40 p-4">
            <div>
              <div className="font-medium">Browser Notifications</div>
              <p className="text-sm text-muted-foreground">
                Get alerted on your device at your scheduled breakfast, lunch, and dinner times.
              </p>
            </div>
            <Button
              variant={notificationsEnabled ? "destructive" : "default"}
              onClick={toggleNotifications}
            >
              {notificationsEnabled ? "Disable Alerts" : "Enable Alerts"}
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
            <div>
              <div className="font-medium flex items-center gap-2">
                <span>📱 Progressive Web App (PWA)</span>
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-600 font-semibold dark:text-emerald-400">
                  Offline Ready
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                Install Aaj Kya Banaye? on your mobile home screen or desktop to use it like a native app, complete with instant loading and offline access.
              </p>
            </div>
            <Button
              variant="default"
              onClick={() => {
                toast.success("To install the app, tap Share or 'Add to Home Screen' in your browser menu!");
              }}
            >
              Install App Shortcut
            </Button>
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


      <Card>
        <CardHeader>
          <CardTitle>Backup & Restore</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Export your complete Aaj Kya Banaye? meal plan data, profile settings, and logs as a JSON file, or restore a previous backup.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button onClick={handleExportJSON}>Export Data (JSON)</Button>
            <label className="inline-flex cursor-pointer">
              <Button asChild variant="outline" className="cursor-pointer">
                <span>
                  Import Data (JSON)
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportJSON}
                    className="sr-only"
                  />
                </span>
              </Button>
            </label>
          </div>
        </CardContent>
      </Card>

      <OnboardingDialog open={isOnboardingOpen} onOpenChange={setIsOnboardingOpen} />
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