import { env } from 'cloudflare:workers';
import { NextResponse } from 'next/server';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { ensureDatabase } from '@/db/bootstrap';

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const authUser = await getChatGPTUser();
  if (!authUser) return NextResponse.json({ error: 'Sesión requerida.' }, { status: 401 });
  const { id } = await context.params;
  const body = await request.json() as { status?: string };
  if (!['collected', 'cancelled', 'no_show'].includes(body.status ?? '')) {
    return NextResponse.json({ error: 'Estado inválido.' }, { status: 400 });
  }
  await ensureDatabase();
  const reservation = await env.DB.prepare(`SELECT r.id, r.pack_id, r.status, b.owner_id
    FROM reservations r JOIN packs p ON p.id = r.pack_id JOIN businesses b ON b.id = p.business_id WHERE r.id = ?`).bind(id).first<{
      id: string; pack_id: string; status: string; owner_id: string | null;
    }>();
  if (!reservation) return NextResponse.json({ error: 'Reserva no encontrada.' }, { status: 404 });
  const canManage = reservation.owner_id === authUser.userId || body.status === 'cancelled';
  if (!canManage) return NextResponse.json({ error: 'No tenés permiso para actualizarla.' }, { status: 403 });

  await env.DB.prepare(`UPDATE reservations SET status = ?, collected_at = CASE WHEN ? = 'collected' THEN ? ELSE collected_at END,
    payment_status = CASE WHEN ? = 'cancelled' AND payment_status = 'paid' THEN 'refunded' ELSE payment_status END WHERE id = ?`)
    .bind(body.status, body.status, new Date().toISOString(), body.status, id).run();
  if (body.status === 'cancelled' && reservation.status === 'reserved') {
    await env.DB.prepare(`UPDATE packs SET quantity_available = quantity_available + 1,
      status = CASE WHEN status = 'sold_out' THEN 'published' ELSE status END WHERE id = ?`).bind(reservation.pack_id).run();
  }
  return NextResponse.json({ ok: true });
}
