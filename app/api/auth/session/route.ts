import { NextResponse } from 'next/server';
import { ACCESS_COOKIE, REFRESH_COOKIE, getUserFromAccessToken } from '@/app/auth';

export async function POST(request: Request) {
  const { accessToken, refreshToken, expiresIn } = await request.json() as { accessToken?: string; refreshToken?: string; expiresIn?: number };
  if (!accessToken || !refreshToken) return NextResponse.json({ error: 'Enlace incompleto o vencido.' }, { status: 400 });
  const user = await getUserFromAccessToken(accessToken);
  if (!user) return NextResponse.json({ error: 'No pudimos validar el enlace de acceso.' }, { status: 401 });
  const response = NextResponse.json({ ok: true, user });
  setSessionCookies(response, accessToken, refreshToken, expiresIn);
  return response;
}

export function setSessionCookies(response: NextResponse, accessToken: string, refreshToken: string, expiresIn = 3600) {
  const secure = process.env.NODE_ENV === 'production';
  response.cookies.set(ACCESS_COOKIE, accessToken, { httpOnly: true, secure, sameSite: 'lax', path: '/', maxAge: Math.max(60, expiresIn - 30) });
  response.cookies.set(REFRESH_COOKIE, refreshToken, { httpOnly: true, secure, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30 });
}

