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

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

const makeMockSupabase = () => {
  const mockPromise = Promise.resolve({ data: null, error: null, count: 0 });

  const createQueryBuilder = (): any => {
    const builder = {
      select: () => builder,
      insert: () => builder,
      update: () => builder,
      upsert: () => builder,
      delete: () => builder,
      eq: () => builder,
      neq: () => builder,
      gt: () => builder,
      lt: () => builder,
      gte: () => builder,
      lte: () => builder,
      like: () => builder,
      ilike: () => builder,
      is: () => builder,
      in: () => builder,
      contains: () => builder,
      containedBy: () => builder,
      range: () => builder,
      textSearch: () => builder,
      filter: () => builder,
      match: () => builder,
      order: () => builder,
      limit: () => builder,
      single: () => mockPromise,
      maybeSingle: () => mockPromise,
      csv: () => builder,
      then: (onfulfilled?: any, onrejected?: any) => {
        return mockPromise.then(onfulfilled, onrejected);
      },
      catch: (onrejected?: any) => {
        return mockPromise.catch(onrejected);
      },
      finally: (onfinally?: any) => {
        return mockPromise.finally(onfinally);
      }
    };
    return builder;
  };

  return {
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
      onAuthStateChange: () => ({
        data: {
          subscription: {
            unsubscribe: () => {},
          },
        },
      }),
      signInWithPassword: async () => ({ data: { user: null }, error: new Error("Supabase is not configured") }),
      signUp: async () => ({ data: { user: null }, error: new Error("Supabase is not configured") }),
      signOut: async () => ({ error: null }),
    },
    from: () => createQueryBuilder(),
  } as any;
};

// ponytail: mock Supabase client when VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY are missing
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, options)
  : makeMockSupabase();
