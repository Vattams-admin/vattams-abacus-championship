import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_ABACUS_SUPABASE_URL as string | undefined;
const publishableKey = import.meta.env.VITE_ABACUS_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export const supabaseConfigured = Boolean(url && publishableKey);

export const supabase = supabaseConfigured
  ? createClient(url!, publishableKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : null;

// Only the publishable key belongs in this browser client.
// Never add a service-role or secret key to VITE_ variables.
