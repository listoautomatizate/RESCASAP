import { env } from 'cloudflare:workers';
import { NextResponse } from 'next/server';
import { getAppUser } from '@/app/auth';
import { ensureDatabase } from '@/db/bootstrap';

function pickupCode() {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const left = Array.from({ length: 3 }, () => letters[Math.floor(Math.random() * letters.length)]).join('');
  return `${left}-${Math.floor(100 + Math.random() * 900)}`;
}

export async function POST(request: Request) {
  const authUser = await getAppUser();
  if (!authUser) return NextResponse.json({ error: 'Sesión requerida.' }, { status: 401 });
  const body = await request.json() as { packId?: string; paymentMethod?: 'paid' | 'pay_at_store' };
  if (!body.packId || !['paid', 'pay_at_store'].includes(body.paymentMethod ?? '')) {
    return NextResponse.json({ error: 'Reserva incompleta.' }, { status: 400 });
  }
  await ensureDatabase();
  const id = `res-${crypto.randomUUID()}`;
  const code = pickupCode();
  const now = new Date().toISOString();
  const db = env.DB;
  const result = await db.batch([
    db.prepare(`INSERT INTO reservations (id, pack_id, user_id, quantity, unit_price, pickup_code, status, payment_status, created_at)
      SELECT ?, id, ?, 1, current_price, ?, 'reserved', ?, ? FROM packs
      WHERE id = ? AND status = 'published' AND quantity_available > 0`)
      .bind(id, authUser.userId, code, body.paymentMethod, now, body.packId),
    db.prepare(`UPDATE packs SET quantity_available = quantity_available - 1,
      status = CASE WHEN quantity_available - 1 <= 0 THEN 'sold_out' ELSE status END
      WHERE id = ? AND status = 'published' AND quantity_available > 0`).bind(body.packId),
  ]);
  if ((result[0].meta.changes ?? 0) < 1) {
    return NextResponse.json({ error: 'Ese pack se acaba de agotar.' }, { status: 409 });
  }
  const reservation = await db.prepare(`SELECT r.*, p.title, p.pickup_start, p.pickup_end,
      b.name AS business_name, b.address, b.neighborhood
    FROM reservations r JOIN packs p ON p.id = r.pack_id JOIN businesses b ON b.id = p.business_id
    WHERE r.id = ?`).bind(id).first();
  return NextResponse.json({ reservation }, { status: 201 });
}
