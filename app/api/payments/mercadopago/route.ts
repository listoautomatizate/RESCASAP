import { env } from 'cloudflare:workers';
import { NextResponse } from 'next/server';
import { getAppUser } from '@/app/auth';
import { createMercadoPagoOrder, mercadoPagoIsConfigured } from '@/app/mercadopago';
import { ensureDatabase } from '@/db/bootstrap';

function pickupCode() {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const left = Array.from({ length: 3 }, () => letters[Math.floor(Math.random() * letters.length)]).join('');
  return `${left}-${Math.floor(100 + Math.random() * 900)}`;
}

export async function POST(request: Request) {
  const authUser = await getAppUser();
  if (!authUser) return NextResponse.json({ error: 'Sesión requerida.' }, { status: 401 });
  const body = await request.json() as { packId?: string };
  if (!body.packId) return NextResponse.json({ error: 'Elegí un pack.' }, { status: 400 });
  if (!mercadoPagoIsConfigured()) return NextResponse.json({ error: 'Mercado Pago todavía no está habilitado en RESCASAP.' }, { status: 503 });

  await ensureDatabase();
  const pack = await env.DB.prepare(`SELECT p.id, p.business_id, p.title, p.current_price, p.status, p.quantity_available,
      b.owner_id, a.status AS merchant_status, m.status AS mp_status
    FROM packs p JOIN businesses b ON b.id = p.business_id
    LEFT JOIN merchant_applications a ON a.business_id = b.id
    LEFT JOIN mercado_pago_connections m ON m.business_id = b.id
    WHERE p.id = ? LIMIT 1`).bind(body.packId).first<{
      id: string; business_id: string; title: string; current_price: number; status: string; quantity_available: number;
      owner_id: string | null; merchant_status: string | null; mp_status: string | null;
    }>();
  if (!pack || pack.status !== 'published' || pack.quantity_available < 1) {
    return NextResponse.json({ error: 'Ese pack se acaba de agotar.' }, { status: 409 });
  }
  if (!pack.owner_id || pack.merchant_status !== 'verified' || pack.mp_status !== 'connected') {
    return NextResponse.json({ error: 'Este comercio todavía no acepta Mercado Pago desde RESCASAP.' }, { status: 409 });
  }

  const reservationId = `res-${crypto.randomUUID()}`;
  const transactionId = `pay-${crypto.randomUUID()}`;
  const idempotencyKey = `rescasap-${crypto.randomUUID()}`;
  const now = new Date().toISOString();
  const results = await env.DB.batch([
    env.DB.prepare(`INSERT INTO reservations (id, pack_id, user_id, quantity, unit_price, pickup_code, status, payment_status, created_at)
      SELECT ?, id, ?, 1, current_price, ?, 'reserved', 'pay_at_store', ? FROM packs
      WHERE id = ? AND status = 'published' AND quantity_available > 0`)
      .bind(reservationId, authUser.userId, pickupCode(), now, pack.id),
    env.DB.prepare(`UPDATE packs SET quantity_available = quantity_available - 1,
      status = CASE WHEN quantity_available - 1 <= 0 THEN 'sold_out' ELSE status END
      WHERE id = ? AND status = 'published' AND quantity_available > 0`).bind(pack.id),
    env.DB.prepare(`INSERT INTO payment_transactions
      (id, reservation_id, business_id, provider, external_reference, idempotency_key, amount, marketplace_fee, status, created_at, updated_at)
      SELECT ?, ?, ?, 'mercadopago', ?, ?, ?, 0, 'initiating', ?, ?
      FROM reservations WHERE id = ?`)
      .bind(transactionId, reservationId, pack.business_id, reservationId, idempotencyKey, pack.current_price, now, now, reservationId),
  ]);
  if ((results[0].meta.changes ?? 0) < 1 || (results[2].meta.changes ?? 0) < 1) {
    return NextResponse.json({ error: 'Ese pack se acaba de agotar.' }, { status: 409 });
  }

  try {
    const { order, fee } = await createMercadoPagoOrder({
      businessId: pack.business_id,
      reservationId,
      title: pack.title,
      amount: pack.current_price,
      buyerEmail: authUser.email,
      idempotencyKey,
    });
    await env.DB.prepare(`UPDATE payment_transactions SET provider_order_id = ?, checkout_url = ?, marketplace_fee = ?,
      status = ?, status_detail = ?, updated_at = ? WHERE id = ?`)
      .bind(order.id, order.checkout_url, fee, order.status === 'processing' ? 'processing' : 'created', order.status_detail ?? order.status, new Date().toISOString(), transactionId).run();
    return NextResponse.json({ checkoutUrl: order.checkout_url, reservationId }, { status: 201 });
  } catch (caught) {
    const releaseMarker = `${new Date().toISOString()}:${crypto.randomUUID()}`;
    await env.DB.batch([
      env.DB.prepare(`UPDATE payment_transactions SET status = 'failed', status_detail = ?, stock_released_at = ?, updated_at = ?
        WHERE id = ? AND stock_released_at IS NULL`)
        .bind(caught instanceof Error ? caught.message.slice(0, 240) : 'No se pudo iniciar el pago.', releaseMarker, new Date().toISOString(), transactionId),
      env.DB.prepare(`UPDATE packs SET quantity_available = quantity_available + 1,
        status = CASE WHEN status = 'sold_out' THEN 'published' ELSE status END
        WHERE id = ? AND EXISTS (SELECT 1 FROM payment_transactions WHERE id = ? AND stock_released_at = ?)`)
        .bind(pack.id, transactionId, releaseMarker),
      env.DB.prepare(`UPDATE reservations SET status = 'cancelled' WHERE id = ? AND status = 'reserved'
        AND EXISTS (SELECT 1 FROM payment_transactions WHERE id = ? AND stock_released_at = ?)`)
        .bind(reservationId, transactionId, releaseMarker),
    ]);
    return NextResponse.json({ error: caught instanceof Error ? caught.message : 'No pudimos iniciar Mercado Pago.' }, { status: 502 });
  }
}
