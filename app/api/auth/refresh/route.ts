import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { REFRESH_COOKIE, supabaseConfig } from '@/app/auth';
import { setSessionCookies } from '../session/route';

export async function POST() {
  const config = supabaseConfig();
  const refreshToken = (await cookies()).get(REFRESH_COOKIE)?.value;
  if (!config || !refreshToken) return NextResponse.json({ error: 'Sesión vencida.' }, { status: 401 });
  const upstream = await fetch(`${config.url}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: { apikey: config.anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!upstream.ok) return NextResponse.json({ error: 'Sesión vencida.' }, { status: 401 });
  const session = await upstream.json() as { access_token: string; refresh_token: string; expires_in?: number };
  const response = NextResponse.json({ ok: true });
  setSessionCookies(response, session.access_token, session.refresh_token, session.expires_in);
  return response;
}

