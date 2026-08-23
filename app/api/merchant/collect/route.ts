import { env } from 'cloudflare:workers';
import { NextResponse } from 'next/server';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { ensureDatabase } from '@/db/bootstrap';

export async function POST(request: Request) {
  const authUser = await getChatGPTUser();
  if (!authUser) return NextResponse.json({ error: 'Sesión requerida.' }, { status: 401 });
  const body = await request.json() as { code?: string };
  const code = body.code?.trim().toUpperCase();
  if (!code) return NextResponse.json({ error: 'Ingresá el código de retiro.' }, { status: 400 });
  await ensureDatabase();
  const reservation = await env.DB.prepare(`SELECT r.id, r.status FROM reservations r
    JOIN packs p ON p.id = r.pack_id JOIN businesses b ON b.id = p.business_id
    WHERE r.pickup_code = ? AND b.owner_id = ? LIMIT 1`).bind(code, authUser.userId).first<{ id: string; status: string }>();
  if (!reservation) return NextResponse.json({ error: 'Ese código no corresponde a una reserva de tu comercio.' }, { status: 404 });
  if (reservation.status === 'collected') return NextResponse.json({ error: 'Ese retiro ya fue confirmado.' }, { status: 409 });
  if (reservation.status !== 'reserved') return NextResponse.json({ error: 'La reserva ya no está activa.' }, { status: 409 });
  await env.DB.prepare("UPDATE reservations SET status = 'collected', collected_at = ? WHERE id = ?")
    .bind(new Date().toISOString(), reservation.id).run();
  return NextResponse.json({ ok: true });
}
