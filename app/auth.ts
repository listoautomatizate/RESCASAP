import { env } from 'cloudflare:workers';
import { cookies } from 'next/headers';

export type AppUser = {
  userId: string;
  displayName: string;
  email: string;
  fullName: string | null;
};

type SupabaseUser = {
  id: string;
  email?: string;
  user_metadata?: { full_name?: string; name?: string };
};

export const ACCESS_COOKIE = 'rescasap_access';
export const REFRESH_COOKIE = 'rescasap_refresh';

export function supabaseConfig() {
  const runtime = env as Cloudflare.Env;
  const url = runtime.SUPABASE_URL?.replace(/\/$/, '');
  const anonKey = runtime.SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

export async function getUserFromAccessToken(token: string): Promise<AppUser | null> {
  const config = supabaseConfig();
  if (!config || !token) return null;
  const response = await fetch(`${config.url}/auth/v1/user`, {
    headers: { apikey: config.anonKey, Authorization: `Bearer ${token}` },
  });
  if (!response.ok) return null;
  const user = await response.json() as SupabaseUser;
  if (!user.id || !user.email) return null;
  const fullName = user.user_metadata?.full_name ?? user.user_metadata?.name ?? null;
  return { userId: user.id, email: user.email, fullName, displayName: fullName ?? user.email };
}

export async function getAppUser(): Promise<AppUser | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_COOKIE)?.value;
  return accessToken ? getUserFromAccessToken(accessToken) : null;
}

