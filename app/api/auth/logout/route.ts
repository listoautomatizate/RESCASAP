import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ACCESS_COOKIE, REFRESH_COOKIE, supabaseConfig } from '@/app/auth';

export async function POST() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_COOKIE)?.value;
  const config = supabaseConfig();
  if (config && accessToken) {
    await fetch(`${config.url}/auth/v1/logout`, {
      method: 'POST',
      headers: { apikey: config.anonKey, Authorization: `Bearer ${accessToken}` },
    }).catch(() => undefined);
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ACCESS_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
  response.cookies.set(REFRESH_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
  return response;
}

