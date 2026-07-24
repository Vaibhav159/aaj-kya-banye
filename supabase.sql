-- ====================================================================
-- Thali — Supabase Database Wipe & Fresh Setup
-- File: supabase.sql
-- Description: Complete Postgres SQL schema for Supabase cloud backup.
--              Copy and paste this ENTIRE script into your Supabase 
--              SQL Editor and click RUN.
-- ====================================================================

-- --------------------------------------------------------------------
-- STEP 1: DROP OLD TABLES
-- --------------------------------------------------------------------
DROP TABLE IF EXISTS public.custom_rules CASCADE;
DROP TABLE IF EXISTS public.custom_dishes CASCADE;
DROP TABLE IF EXISTS public.meal_logs CASCADE;
DROP TABLE IF EXISTS public.overrides CASCADE;
DROP TABLE IF EXISTS public.cycle_starts CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- --------------------------------------------------------------------
-- STEP 2: CREATE EXTENSIONS & TABLES
-- --------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES TABLE
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT DEFAULT 'You',
  weight_kg NUMERIC(5,2),
  target_kg NUMERIC(5,2),
  goal_kcal INTEGER DEFAULT 2000,
  goal_protein INTEGER DEFAULT 80,
  goal_carbs INTEGER DEFAULT 250,
  goal_fat INTEGER DEFAULT 65,
  breakfast_time TEXT DEFAULT '08:00',
  lunch_time TEXT DEFAULT '13:00',
  dinner_time TEXT DEFAULT '20:00',
  theme TEXT DEFAULT 'system',
  favorites TEXT[] DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. CYCLE STARTS TABLE
CREATE TABLE public.cycle_starts (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  start_time BIGINT NOT NULL,
  cycle_length INTEGER DEFAULT 42,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. OVERRIDES TABLE
CREATE TABLE public.overrides (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  dish_id TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT overrides_user_key_unique UNIQUE (user_id, key)
);

-- 4. MEAL LOGS TABLE
CREATE TABLE public.meal_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('eaten', 'skipped')),
  logged_at BIGINT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT meal_logs_user_key_unique UNIQUE (user_id, key)
);

-- 5. CUSTOM DISHES TABLE
CREATE TABLE public.custom_dishes (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  emoji TEXT DEFAULT '🍲',
  slots TEXT[] DEFAULT '{}',
  kcal INTEGER DEFAULT 0,
  protein INTEGER DEFAULT 0,
  carbs INTEGER DEFAULT 0,
  fat INTEGER DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  ingredients JSONB DEFAULT '[]'::jsonb,
  cuisine TEXT,
  cooking_type TEXT,
  equipment TEXT[],
  prep_minutes INTEGER,
  spice_level INTEGER,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. CUSTOM RULES TABLE
CREATE TABLE public.custom_rules (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  kind TEXT NOT NULL,
  scope TEXT NOT NULL,
  match JSONB NOT NULL DEFAULT '{}'::jsonb,
  enabled BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- STEP 3: ENABLE ROW LEVEL SECURITY (RLS) & POLICIES
-- --------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cycle_starts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_dishes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own profile"
  ON public.profiles FOR ALL
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can manage their own cycle start config"
  ON public.cycle_starts FOR ALL
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can manage their own overrides"
  ON public.overrides FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own meal logs"
  ON public.meal_logs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own custom dishes"
  ON public.custom_dishes FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own custom rules"
  ON public.custom_rules FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
