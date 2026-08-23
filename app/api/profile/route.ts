import { env } from 'cloudflare:workers';
import { NextResponse } from 'next/server';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { ensureDatabase } from '@/db/bootstrap';

export async function POST(request: Request) {
  const authUser = await getChatGPTUser();
  if (!authUser) return NextResponse.json({ error: 'Sesión requerida.' }, { status: 401 });
  const body = await request.json() as { name?: string; role?: string; neighborhood?: string; businessName?: string; category?: string; address?: string };
  if (!body.name?.trim() || !['consumer', 'merchant'].includes(body.role ?? '')) {
    return NextResponse.json({ error: 'Completá tu nombre y elegí un tipo de cuenta.' }, { status: 400 });
  }
  await ensureDatabase();
  const now = new Date().toISOString();
  await env.DB.prepare(`INSERT INTO users (id, email, name, role, neighborhood, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET name = excluded.name, role = excluded.role, neighborhood = excluded.neighborhood`)
    .bind(authUser.userId, authUser.email, body.name.trim(), body.role, body.neighborhood?.trim() || 'Montevideo', now).run();

  if (body.role === 'merchant') {
    const existing = await env.DB.prepare('SELECT id FROM businesses WHERE owner_id = ? LIMIT 1').bind(authUser.userId).first();
    if (!existing) {
      await env.DB.prepare(`INSERT INTO businesses (id, owner_id, name, category, address, neighborhood, latitude, longitude, rating, closing_time)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(`biz-${crypto.randomUUID()}`, authUser.userId, body.businessName?.trim() || 'Mi comercio', body.category || 'Panadería', body.address?.trim() || 'Montevideo', body.neighborhood?.trim() || 'Montevideo', -34.9011, -56.1645, 5, '20:00').run();
    }
  }
  return NextResponse.json({ ok: true });
}
