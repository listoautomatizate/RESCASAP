import { env } from 'cloudflare:workers';
import { NextResponse } from 'next/server';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { ensureDatabase } from '@/db/bootstrap';

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const authUser = await getChatGPTUser();
  if (!authUser) return NextResponse.json({ error: 'Sesión requerida.' }, { status: 401 });
  const { id } = await context.params;
  const body = await request.json() as { status?: string };
  if (!['published', 'cancelled', 'unsold'].includes(body.status ?? '')) {
    return NextResponse.json({ error: 'Estado inválido.' }, { status: 400 });
  }
  await ensureDatabase();
  const result = await env.DB.prepare(`UPDATE packs SET status = ? WHERE id = ? AND business_id IN
    (SELECT id FROM businesses WHERE owner_id = ?)`).bind(body.status, id, authUser.userId).run();
  if ((result.meta.changes ?? 0) < 1) return NextResponse.json({ error: 'Pack no encontrado.' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
