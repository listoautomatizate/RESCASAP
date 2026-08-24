import { env } from 'cloudflare:workers';
import { NextResponse } from 'next/server';
import { supabaseConfig } from '@/app/auth';

export async function POST(request: Request) {
  const { email } = await request.json() as { email?: string };
  const normalized = email?.trim().toLowerCase();
  if (!normalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return NextResponse.json({ error: 'Ingresá un email válido.' }, { status: 400 });
  }
  const config = supabaseConfig();
  if (!config) return NextResponse.json({ error: 'El ingreso por email todavía no está configurado.' }, { status: 503 });
  const publicOrigin = ((env as Cloudflare.Env).PUBLIC_SITE_URL || new URL(request.url).origin).replace(/\/$/, '');
  const response = await fetch(`${config.url}/auth/v1/otp?redirect_to=${encodeURIComponent(`${publicOrigin}/auth/callback`)}`, {
    method: 'POST',
    headers: { apikey: config.anonKey, Authorization: `Bearer ${config.anonKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: normalized, create_user: true }),
  });
  if (!response.ok) {
    const detail = await response.json().catch(() => ({})) as { msg?: string; message?: string };
    return NextResponse.json({ error: detail.msg || detail.message || 'No pudimos enviar el enlace. Probá nuevamente.' }, { status: response.status });
  }
  return NextResponse.json({ ok: true });
}
