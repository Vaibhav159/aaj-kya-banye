import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DEFAULT_PROFILE, useCycleStart, useProfile, type Profile, syncAllData, readLS, calculateDailyGoals, type ActivityLevel, type GoalPace, CYCLE_PRESETS, formatCycleDuration } from "@/lib/store";
import { buildIcs, downloadIcs } from "@/lib/ical";
import { applyOverrides, currentDayIndex, useOverrides } from "@/lib/store";
import { saveCalendarFeed } from "@/lib/calendar-server";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useTheme } from "@/lib/theme";
import { Sun, Moon, Monitor, Sparkles, Calculator, User, Sliders, Cloud, Database, Bell, Calendar, Download, RefreshCw } from "lucide-react";
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
  const { start, length, setStart, setLength, reset } = useCycleStart();
  const { overrides } = useOverrides();
  const [form, setForm] = useState<Profile>(DEFAULT_PROFILE);
  const [feedId, setFeedId] = useState("");
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);

  const dayIdx = currentDayIndex(start, Date.now(), length);
  const currentDayNum = dayIdx + 1;
  const progressPct = Math.round((currentDayNum / length) * 100);

  const startDateObj = start ? new Date(start) : new Date();
  const startDateIso = `${startDateObj.getFullYear()}-${String(startDateObj.getMonth() + 1).padStart(2, "0")}-${String(startDateObj.getDate()).padStart(2, "0")}`;
  const startDateFormatted = startDateObj.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const endDateMs = (start || Date.now()) + (length - 1) * 86400000;
  const endDateFormatted = new Date(endDateMs).toLocaleDateString(undefined, { month: "short", day: "numeric" });

  const [user, setUser] = useState<any>(null);
  const [syncLoading, setSyncLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [_notificationPermission, setNotificationPermission] = useState<string>("default");

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

  const update = <K extends keyof Profile>(k: K, v: Profile[K]) => {
    setForm((prev) => {
      const nextForm = { ...prev, [k]: v };
      const calculated = calculateDailyGoals(nextForm);
      const profileToSave = {
        ...nextForm,
        goalKcal: calculated.goalKcal,
        goalProtein: calculated.goalProtein,
        goalCarbs: calculated.goalCarbs,
        goalFat: calculated.goalFat,
      };
      save(profileToSave);
      return nextForm;
    });
  };

  const liveCalculated = calculateDailyGoals(form);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
      <header className="border-b border-border pb-6">
        <p className="text-sm uppercase tracking-wide text-muted-foreground">Configuration</p>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold">Settings</h1>
      </header>

      <Tabs defaultValue="profile" className="w-full flex flex-col md:flex-row md:items-start gap-8">
        <TabsList className="flex md:flex-col items-stretch justify-start w-full md:w-60 h-auto p-1.5 bg-muted/60 md:bg-muted/30 gap-1.5 overflow-x-auto md:overflow-visible shrink-0 rounded-xl border border-border/50">
          <TabsTrigger
            value="profile"
            className="flex items-center justify-start gap-3 px-3 py-2.5 text-xs sm:text-sm font-medium cursor-pointer rounded-lg text-left data-[state=active]:bg-background data-[state=active]:shadow-sm md:data-[state=active]:bg-primary/10 md:data-[state=active]:text-primary transition-all shrink-0 md:shrink"
          >
            <User className="h-4 w-4 shrink-0 text-muted-foreground data-[state=active]:text-primary" />
            <div className="flex flex-col text-left">
              <span className="font-medium whitespace-nowrap">Profile & Macros</span>
              <span className="text-[11px] text-muted-foreground hidden md:inline font-normal">Biometrics & goals</span>
            </div>
          </TabsTrigger>

          <TabsTrigger
            value="preferences"
            className="flex items-center justify-start gap-3 px-3 py-2.5 text-xs sm:text-sm font-medium cursor-pointer rounded-lg text-left data-[state=active]:bg-background data-[state=active]:shadow-sm md:data-[state=active]:bg-primary/10 md:data-[state=active]:text-primary transition-all shrink-0 md:shrink"
          >
            <Sliders className="h-4 w-4 shrink-0 text-muted-foreground data-[state=active]:text-primary" />
            <div className="flex flex-col text-left">
              <span className="font-medium whitespace-nowrap">Preferences</span>
              <span className="text-[11px] text-muted-foreground hidden md:inline font-normal">Theme & meal times</span>
            </div>
          </TabsTrigger>

          <TabsTrigger
            value="integrations"
            className="flex items-center justify-start gap-3 px-3 py-2.5 text-xs sm:text-sm font-medium cursor-pointer rounded-lg text-left data-[state=active]:bg-background data-[state=active]:shadow-sm md:data-[state=active]:bg-primary/10 md:data-[state=active]:text-primary transition-all shrink-0 md:shrink"
          >
            <Cloud className="h-4 w-4 shrink-0 text-muted-foreground data-[state=active]:text-primary" />
            <div className="flex flex-col text-left">
              <span className="font-medium whitespace-nowrap">Sync & Feeds</span>
              <span className="text-[11px] text-muted-foreground hidden md:inline font-normal">Cloud sync & calendars</span>
            </div>
          </TabsTrigger>

          <TabsTrigger
            value="data"
            className="flex items-center justify-start gap-3 px-3 py-2.5 text-xs sm:text-sm font-medium cursor-pointer rounded-lg text-left data-[state=active]:bg-background data-[state=active]:shadow-sm md:data-[state=active]:bg-primary/10 md:data-[state=active]:text-primary transition-all shrink-0 md:shrink"
          >
            <Database className="h-4 w-4 shrink-0 text-muted-foreground data-[state=active]:text-primary" />
            <div className="flex flex-col text-left">
              <span className="font-medium whitespace-nowrap">Data & Backup</span>
              <span className="text-[11px] text-muted-foreground hidden md:inline font-normal">JSON export & import</span>
            </div>
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 min-w-0">
          {/* TAB 1: PROFILE & MACROS */}
        <TabsContent value="profile" className="space-y-6 mt-0">
          <Card>
            <CardHeader>
              <CardTitle>You & Biometrics</CardTitle>
              <CardDescription>Personal details used for calculating optimal metabolic macro targets.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Field label="Name">
                <Input value={form.name} onChange={(e) => update("name", e.target.value)} />
              </Field>
              <Field label="Gender">
                <select
                  value={form.gender || "male"}
                  onChange={(e) => update("gender", e.target.value as "male" | "female")}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </Field>
              <Field label="Weight (kg)">
                <Input type="number" value={form.weightKg} onChange={(e) => update("weightKg", Number(e.target.value))} />
              </Field>
              <Field label="Target weight (kg)">
                <Input type="number" value={form.targetKg} onChange={(e) => update("targetKg", Number(e.target.value))} />
              </Field>
              <Field label="Height (cm)">
                <Input type="number" value={form.heightCm || 170} onChange={(e) => update("heightCm", Number(e.target.value))} />
              </Field>
              <Field label="Age (years)">
                <Input type="number" value={form.age || 28} onChange={(e) => update("age", Number(e.target.value))} />
              </Field>
              <Field label="Daily Activity Level">
                <select
                  value={form.activityLevel || "light"}
                  onChange={(e) => update("activityLevel", e.target.value as ActivityLevel)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="sedentary">Sedentary (Desk job, minimal exercise)</option>
                  <option value="light">Lightly Active (Light exercise 1-3 days/wk)</option>
                  <option value="moderate">Moderately Active (Moderate exercise 3-5 days/wk)</option>
                  <option value="active">Very Active (Hard exercise 6-7 days/wk)</option>
                  <option value="very_active">Extra Active (Physical job / 2x training)</option>
                </select>
              </Field>
              <Field label="Goal Pace">
                <select
                  value={form.pace || "moderate"}
                  onChange={(e) => update("pace", e.target.value as GoalPace)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="mild">Mild (0.25 kg / week)</option>
                  <option value="moderate">Moderate (0.50 kg / week)</option>
                  <option value="aggressive">Aggressive (0.75 kg / week)</option>
                </select>
              </Field>
            </CardContent>
          </Card>

          <Card className="border-primary/30 bg-primary/5 dark:bg-primary/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Calculator className="h-4 w-4 text-primary" />
                Scientific BMR, TDEE & Recommended Daily Targets
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-center">
                <div className="p-2.5 rounded-lg bg-background border">
                  <p className="text-xs text-muted-foreground">BMR</p>
                  <p className="font-semibold text-base">{liveCalculated.bmr} <span className="text-xs text-muted-foreground">kcal</span></p>
                </div>
                <div className="p-2.5 rounded-lg bg-background border">
                  <p className="text-xs text-muted-foreground">TDEE</p>
                  <p className="font-semibold text-base">{liveCalculated.tdee} <span className="text-xs text-muted-foreground">kcal</span></p>
                </div>
                <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/20">
                  <p className="text-xs text-primary font-medium">Daily Calories</p>
                  <p className="font-bold text-base text-primary">{liveCalculated.goalKcal} <span className="text-xs">kcal</span></p>
                </div>
                <div className="p-2.5 rounded-lg bg-background border">
                  <p className="text-xs text-muted-foreground">Protein Target</p>
                  <p className="font-semibold text-base">{liveCalculated.goalProtein} <span className="text-xs text-muted-foreground">g</span></p>
                </div>
                <div className="p-2.5 rounded-lg bg-background border">
                  <p className="text-xs text-muted-foreground">Carbs Target</p>
                  <p className="font-semibold text-base">{liveCalculated.goalCarbs} <span className="text-xs text-muted-foreground">g</span></p>
                </div>
                <div className="p-2.5 rounded-lg bg-background border">
                  <p className="text-xs text-muted-foreground">Fat Target</p>
                  <p className="font-semibold text-base">{liveCalculated.goalFat} <span className="text-xs text-muted-foreground">g</span></p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Calculated using Mifflin-St Jeor formula (BMR = {liveCalculated.bmr} kcal) with maintenance TDEE of {liveCalculated.tdee} kcal.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: PREFERENCES & TIMINGS */}
        <TabsContent value="preferences" className="space-y-6 mt-0">
          <Card className="overflow-hidden border-border/80 shadow-sm">
            <CardHeader className="border-b border-border/40 bg-muted/20">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="font-display text-2xl flex items-center gap-2">
                    <RefreshCw className="h-5 w-5 text-primary animate-spin-slow" />
                    Meal Rotation Dashboard
                  </CardTitle>
                  <CardDescription>
                    Visual rhythm & cycle duration for your rotating meal plan.
                  </CardDescription>
                </div>
                <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                  {formatCycleDuration(length)}
                </span>
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              {/* LIVE ORBIT & TIMELINE BANNER */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-accent/5 to-muted/40 p-5 sm:p-6 border border-primary/20 shadow-inner space-y-5">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                  {/* SVG ORBIT RING */}
                  <div className="relative flex items-center justify-center shrink-0">
                    <svg className="w-28 h-28 -rotate-90 transform" viewBox="0 0 80 80">
                      <circle
                        cx="40"
                        cy="40"
                        r="34"
                        stroke="currentColor"
                        strokeWidth="6"
                        className="text-muted/30"
                        fill="transparent"
                      />
                      <circle
                        cx="40"
                        cy="40"
                        r="34"
                        stroke="currentColor"
                        strokeWidth="6"
                        strokeDasharray={213.6}
                        strokeDashoffset={213.6 - (progressPct / 100) * 213.6}
                        strokeLinecap="round"
                        className="text-primary transition-all duration-700 ease-out"
                        fill="transparent"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-xl font-bold font-display leading-none">Day {currentDayNum}</span>
                      <span className="text-[10px] text-muted-foreground mt-0.5 font-medium">of {length} days</span>
                    </div>
                  </div>

                  {/* TIMELINE DETAILS & PROGRESS BAR */}
                  <div className="flex-1 w-full space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-foreground flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-primary" /> Active Cycle Status
                      </span>
                      <span className="font-mono text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                        {progressPct}% Complete
                      </span>
                    </div>

                    {/* Progress Bar Track */}
                    <div className="relative w-full h-3 bg-muted/60 rounded-full overflow-hidden border border-border/40">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500 rounded-full"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
                      <span className="flex items-center gap-1 font-medium">
                        🚩 Started: <strong className="text-foreground">{startDateFormatted}</strong>
                      </span>
                      <span className="flex items-center gap-1 font-medium">
                        🔄 End / Reset: <strong className="text-foreground">{endDateFormatted}</strong>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* DURATION PRESET CARDS GRID */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-primary" /> Choose Rotation Rhythm
                  </Label>
                  <span className="text-xs text-muted-foreground">Select preset or enter custom days</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {CYCLE_PRESETS.map((preset) => {
                    const isSelected = length === preset.days;
                    return (
                      <button
                        key={preset.days}
                        type="button"
                        onClick={() => {
                          setLength(preset.days);
                          toast.success(`Set cycle rotation to ${preset.label} (${preset.days} days)`);
                        }}
                        className={`relative flex flex-col items-start p-3.5 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
                          isSelected
                            ? "bg-primary text-primary-foreground border-primary shadow-md ring-2 ring-primary/30 scale-[1.02]"
                            : "bg-card hover:bg-accent/30 border-border hover:border-primary/40 text-card-foreground shadow-2xs hover:scale-[1.01]"
                        }`}
                      >
                        <div className="flex items-center justify-between w-full mb-1">
                          <span className="text-xl">{preset.emoji}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isSelected ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                            {preset.days}d
                          </span>
                        </div>
                        <span className="font-display font-semibold text-sm leading-tight">{preset.label}</span>
                        <span className={`text-[11px] mt-0.5 ${isSelected ? "text-primary-foreground/85" : "text-muted-foreground"}`}>
                          {preset.tag}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* CUSTOM DURATION SLIDER & STEPPER */}
                <div className="flex flex-wrap items-center justify-between gap-4 p-3.5 bg-muted/30 rounded-xl border border-border/50">
                  <div className="flex items-center gap-2 text-xs font-medium">
                    <Sliders className="h-4 w-4 text-primary" />
                    <span>Fine-tune cycle duration:</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={1}
                      max={90}
                      value={length}
                      onChange={(e) => setLength(parseInt(e.target.value, 10) || 42)}
                      className="w-28 sm:w-36 accent-primary cursor-pointer"
                    />
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        min={1}
                        max={365}
                        className="w-16 h-8 text-xs text-center font-bold"
                        value={length}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (val > 0 && val <= 365) setLength(val);
                        }}
                      />
                      <span className="text-xs text-muted-foreground font-medium">days</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* START DATE & RESET CONTROLS */}
              <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-border/40">
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
                    Cycle Start Date
                  </Label>
                  <Input
                    type="date"
                    value={startDateIso}
                    onChange={(e) => {
                      if (!e.target.value) return;
                      const [y, m, d] = e.target.value.split("-").map(Number);
                      setStart(new Date(y, m - 1, d, 0, 0, 0, 0).getTime());
                      toast.success(`Cycle start date updated to ${e.target.value}`);
                    }}
                    className="bg-background"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">Day 1 of your rotation begins on this date.</p>
                </div>
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
                    Reset Counter
                  </Label>
                  <Button variant="outline" className="w-full justify-center gap-2 h-10 border-border/60 hover:border-primary/50" onClick={() => { reset(); toast.success("Cycle restarted at Day 1 (Today)"); }}>
                    <RefreshCw className="h-4 w-4 text-primary" /> Snap Day 1 to Today
                  </Button>
                  <p className="text-[11px] text-muted-foreground mt-1">Sets today's date as Day 1 of your rotation.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Appearance & Theme</CardTitle>
              <CardDescription>Choose your preferred theme mode or follow system settings.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setTheme("system")}
                  className={`flex flex-col items-center justify-center gap-2 rounded-xl border p-4 text-center cursor-pointer transition-all ${
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
                  className={`flex flex-col items-center justify-center gap-2 rounded-xl border p-4 text-center cursor-pointer transition-all ${
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
                  className={`flex flex-col items-center justify-center gap-2 rounded-xl border p-4 text-center cursor-pointer transition-all ${
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
            <CardHeader>
              <CardTitle>Meal Schedule & Reminders</CardTitle>
              <CardDescription>Set your standard meal times to sync with calendar feeds and alerts.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              <Field label="Breakfast"><Input type="time" value={form.breakfastTime} onChange={(e) => update("breakfastTime", e.target.value)} /></Field>
              <Field label="Lunch"><Input type="time" value={form.lunchTime} onChange={(e) => update("lunchTime", e.target.value)} /></Field>
              <Field label="Dinner"><Input type="time" value={form.dinnerTime} onChange={(e) => update("dinnerTime", e.target.value)} /></Field>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: SYNC & INTEGRATIONS */}
        <TabsContent value="integrations" className="space-y-6 mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Cloud Backup & Sync</CardTitle>
              <CardDescription>Synchronize your profile, logs, custom rules, and meal plan across devices.</CardDescription>
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
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm">
                    <div>
                      <div className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block"></span>
                        Cloud Sync Active
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
            <CardHeader>
              <CardTitle>Calendar Integration</CardTitle>
              <CardDescription>Export or subscribe to your meal plan in Apple Calendar, Google Calendar, or Outlook.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-secondary/40 p-4">
                <div>
                  <div className="font-medium flex items-center gap-2">
                    <Download className="h-4 w-4 text-primary" /> Download Static .ics Calendar
                  </div>
                  <p className="text-sm text-muted-foreground">Download the next 30 days of meals as an offline .ics file.</p>
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
                    <div className="font-medium flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary" /> Dynamic Live Calendar Subscription
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Subscribe to a live feed that updates automatically whenever you swap or log meals.
                    </p>
                  </div>
                  <Button
                    variant={feedId ? "destructive" : "default"}
                    onClick={toggleFeed}
                    className="shrink-0"
                  >
                    {feedId ? "Disable Feed" : "Enable Feed"}
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
                      Paste into Apple Calendar (Add Subscribed Calendar), Google Calendar (From URL), or Outlook.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notifications & Shortcuts</CardTitle>
              <CardDescription>Configure browser notifications and mobile shortcut options.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-secondary/40 p-4">
                <div>
                  <div className="font-medium flex items-center gap-2">
                    <Bell className="h-4 w-4 text-primary" /> Browser Meal Alerts
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Receive local browser notifications at your scheduled breakfast, lunch, and dinner times.
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
                    Install Aaj Kya Banaye? on your mobile home screen or desktop to use it like a native app.
                  </p>
                </div>
                <Button
                  variant="default"
                  onClick={() => {
                    toast.success("To install the app, tap Share or 'Add to Home Screen' in your browser menu!");
                  }}
                >
                  Install Shortcut
                </Button>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-border bg-muted/40 p-4">
                <div>
                  <div className="font-medium">Telegram Bot Reminders</div>
                  <p className="text-sm text-muted-foreground">
                    Get meal pings directly on Telegram at scheduled times.
                  </p>
                </div>
                <Button variant="outline" disabled title="Coming soon — needs Telegram bot connection">Connect Telegram</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: DATA & BACKUP */}
        <TabsContent value="data" className="space-y-6 mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Export & Import Local Data</CardTitle>
              <CardDescription>Export your complete data backup as a JSON file or restore from a previous backup.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Includes your profile biometrics, meal log history, custom rules, meal overrides, and custom dish definitions.
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

          <Card>
            <CardHeader>
              <CardTitle>Setup Wizard</CardTitle>
              <CardDescription>Re-run the step-by-step onboarding walkthrough to reconfigure your initial preferences.</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Onboarding Wizard</p>
                <p className="text-xs text-muted-foreground">Guided wizard for initial goal setting and preferences.</p>
              </div>
              <Button
                onClick={() => setIsOnboardingOpen(true)}
                variant="outline"
                className="gap-1.5 cursor-pointer text-xs"
              >
                <Sparkles className="h-4 w-4 text-amber-500" /> Launch Wizard
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        </div>
      </Tabs>

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