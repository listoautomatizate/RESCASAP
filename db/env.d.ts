declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    SUPABASE_URL?: string;
    SUPABASE_ANON_KEY?: string;
    PUBLIC_SITE_URL?: string;
    MP_CLIENT_ID?: string;
    MP_CLIENT_SECRET?: string;
    MP_OAUTH_REDIRECT_URI?: string;
    MP_WEBHOOK_SECRET?: string;
    MP_TOKEN_ENCRYPTION_KEY?: string;
    MP_MARKETPLACE_FEE_PERCENT?: string;
  }
}
