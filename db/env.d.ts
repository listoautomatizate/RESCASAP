declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    SUPABASE_URL?: string;
    SUPABASE_ANON_KEY?: string;
    PUBLIC_SITE_URL?: string;
  }
}
