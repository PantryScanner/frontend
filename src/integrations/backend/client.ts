import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

// NOTE:
// In some hosted builds, Vite env vars may not be injected (e.g. .env is not bundled).
// To avoid a blank screen, we provide safe defaults for the public backend config.

const DEFAULT_BACKEND_URL = "https://vgcpgzrabnotchaerqna.supabase.co";
const DEFAULT_BACKEND_PUBLISHABLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnY3BnenJhYm5vdGNoYWVycW5hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1MDI2MjksImV4cCI6MjA3NjA3ODYyOX0.w9Jq1OwzF15g-M-SBwuP3lqH070K6-4DN0-qkHGLfiE";

const backendUrl = import.meta.env.VITE_SUPABASE_URL ?? DEFAULT_BACKEND_URL;
const backendKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? DEFAULT_BACKEND_PUBLISHABLE_KEY;

export const supabase = createClient<Database>(backendUrl, backendKey, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
