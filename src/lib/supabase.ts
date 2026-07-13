import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

const options: any = {};

// Provide a mock transport on the server side to avoid Node.js 20 WebSocket check crashes during build-time SSR/prerendering
if (typeof window === "undefined") {
  options.realtime = {
    transport: class MockWebSocket {},
  };
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, options);
