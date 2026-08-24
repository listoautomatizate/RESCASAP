import { env } from 'cloudflare:workers';
import { NextResponse } from 'next/server';
import { getAppUser } from '@/app/auth';
import { cancelOrRefundPayment } from '@/app/mercadopago';
import { ensureDatabase } from '@/db/bootstrap';

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const authUser = await getAppUser();
  if (!authUser) return NextResponse.json({ error: 'Sesión requerida.' }, { status: 401 });
  const { id } = await context.params;
  const body = await request.json() as { status?: string };
  if (!['collected', 'cancelled', 'no_show'].includes(body.status ?? '')) {
    return NextResponse.json({ error: 'Estado inválido.' }, { status: 400 });
  }
  await ensureDatabase();
  const reservation = await env.DB.prepare(`SELECT r.id, r.pack_id, r.user_id, r.status, r.payment_status, b.owner_id,
      pt.provider_order_id, pt.status AS online_payment_status
    FROM reservations r JOIN packs p ON p.id = r.pack_id JOIN businesses b ON b.id = p.business_id
    LEFT JOIN payment_transactions pt ON pt.reservation_id = r.id WHERE r.id = ?`).bind(id).first<{
      id: string; pack_id: string; user_id: string; status: string; payment_status: string; owner_id: string | null;
      provider_order_id: string | null; online_payment_status: string | null;
    }>();
  if (!reservation) return NextResponse.json({ error: 'Reserva no encontrada.' }, { status: 404 });
  const isOwner = reservation.owner_id === authUser.userId;
  const isBuyerCancelling = body.status === 'cancelled' && reservation.user_id === authUser.userId;
  const canManage = isOwner || isBuyerCancelling;
  if (!canManage) return NextResponse.json({ error: 'No tenés permiso para actualizarla.' }, { status: 403 });
  if (body.status !== 'cancelled' && !isOwner) return NextResponse.json({ error: 'Solo el comercio puede confirmar el retiro.' }, { status: 403 });
  if (body.status === 'collected' && reservation.online_payment_status && reservation.online_payment_status !== 'paid') {
    return NextResponse.json({ error: 'El pago de Mercado Pago todavía no está acreditado.' }, { status: 409 });
  }

  if (body.status === 'cancelled' && reservation.provider_order_id && !['failed', 'cancelled', 'refunded'].includes(reservation.online_payment_status ?? '')) {
    try {
      await cancelOrRefundPayment(id);
      return NextResponse.json({ ok: true });
    } catch (caught) {
      return NextResponse.json({ error: caught instanceof Error ? caught.message : 'No pudimos cancelar el pago.' }, { status: 502 });
    }
  }

  const updated = await env.DB.prepare(`UPDATE reservations SET status = ?,
    collected_at = CASE WHEN ? = 'collected' THEN ? ELSE collected_at END
    WHERE id = ? AND status = 'reserved'`)
    .bind(body.status, body.status, new Date().toISOString(), id).run();
  if (body.status === 'cancelled' && (updated.meta.changes ?? 0) > 0) {
    await env.DB.prepare(`UPDATE packs SET quantity_available = quantity_available + 1,
      status = CASE WHEN status = 'sold_out' THEN 'published' ELSE status END WHERE id = ?`).bind(reservation.pack_id).run();
  }
  return NextResponse.json({ ok: true });
}
