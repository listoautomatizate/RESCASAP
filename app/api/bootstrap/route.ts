import { env } from 'cloudflare:workers';
import { NextResponse } from 'next/server';
import { getAppUser } from '@/app/auth';
import { LEGAL_VERSION } from '@/app/legal';
import { mercadoPagoIsConfigured } from '@/app/mercadopago';
import { ensureDatabase } from '@/db/bootstrap';

export const dynamic = 'force-dynamic';

function uruguayMinutesNow() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Montevideo', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date());
  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? 0);
  const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? 0);
  return hour * 60 + minute;
}

function timeToMinutes(value: string) {
  const [hour, minute] = value.split(':').map(Number);
  return hour * 60 + minute;
}

export async function GET() {
  const authUser = await getAppUser();
  if (!authUser) return NextResponse.json({ error: 'Iniciá sesión para continuar.' }, { status: 401 });

  await ensureDatabase();
  const db = env.DB;
  const nowMinutes = uruguayMinutesNow();
  const discountable = await db.prepare(`SELECT id, pickup_end, current_price, final_price, discount_minutes
    FROM packs WHERE status = 'published' AND auto_discount = 1 AND final_price IS NOT NULL AND discount_minutes IS NOT NULL`).all<{
      id: string; pickup_end: string; current_price: number; final_price: number; discount_minutes: number;
    }>();
  const reductions = discountable.results.filter((pack) => {
    const remaining = timeToMinutes(pack.pickup_end) - nowMinutes;
    return remaining >= 0 && remaining <= pack.discount_minutes && pack.current_price !== pack.final_price;
  });
  if (reductions.length) {
    await db.batch(reductions.map((pack) => db.prepare('UPDATE packs SET current_price = ? WHERE id = ?').bind(pack.final_price, pack.id)));
  }

  const profile = await db.prepare('SELECT id, email, name, role, neighborhood FROM users WHERE id = ?')
    .bind(authUser.userId).first<{ id: string; email: string; name: string; role: 'consumer' | 'merchant'; neighborhood: string }>();
  const acceptedDocuments = await db.prepare(`SELECT document_type FROM legal_acceptances
    WHERE user_id = ? AND document_version = ?`).bind(authUser.userId, LEGAL_VERSION).all<{ document_type: string }>();
  const acceptedTypes = new Set(acceptedDocuments.results.map((row) => row.document_type));
  const legalAccepted = Boolean(profile) && acceptedTypes.has('terms') && acceptedTypes.has('privacy') &&
    (profile?.role !== 'merchant' || acceptedTypes.has('merchant_agreement'));
  const mercadoPagoConfigured = mercadoPagoIsConfigured();
  const packs = await db.prepare(`SELECT p.*, b.name AS business_name, b.category, b.address, b.neighborhood,
      b.latitude, b.longitude, b.rating, b.closing_time,
      CASE WHEN mp.status = 'connected' THEN 1 ELSE 0 END AS mercado_pago_connected
    FROM packs p JOIN businesses b ON b.id = p.business_id
    LEFT JOIN merchant_applications a ON a.business_id = b.id
    LEFT JOIN mercado_pago_connections mp ON mp.business_id = b.id
    WHERE b.owner_id IS NULL OR a.status = 'verified'
    ORDER BY CASE p.status WHEN 'published' THEN 0 ELSE 1 END, p.quantity_available ASC, p.pickup_end ASC`).all();
  const reservations = await db.prepare(`SELECT r.*, p.title, p.estimated_kg, p.pickup_start, p.pickup_end,
      b.name AS business_name, b.address, b.neighborhood, pt.status AS online_payment_status
    FROM reservations r JOIN packs p ON p.id = r.pack_id JOIN businesses b ON b.id = p.business_id
    LEFT JOIN payment_transactions pt ON pt.reservation_id = r.id
    WHERE r.user_id = ? ORDER BY r.created_at DESC`).bind(authUser.userId).all();
  const merchantBusiness = await db.prepare('SELECT * FROM businesses WHERE owner_id = ? LIMIT 1')
    .bind(authUser.userId).first();
  const merchantApplication = merchantBusiness && typeof merchantBusiness.id === 'string'
    ? await db.prepare('SELECT * FROM merchant_applications WHERE business_id = ?').bind(merchantBusiness.id).first()
    : null;
  const merchantConnection = merchantBusiness && typeof merchantBusiness.id === 'string'
    ? await db.prepare(`SELECT mp_user_id, status, expires_at, connected_at, updated_at
      FROM mercado_pago_connections WHERE business_id = ?`).bind(merchantBusiness.id).first<{
        mp_user_id: string; status: string; expires_at: string; connected_at: string; updated_at: string;
      }>()
    : null;
  let merchantPacks: unknown[] = [];
  let templates: unknown[] = [];
  if (merchantBusiness && typeof merchantBusiness.id === 'string') {
    const [merchantRows, templateRows] = await Promise.all([
      db.prepare(`SELECT p.*, COUNT(r.id) AS reservation_count,
          COALESCE(SUM(CASE WHEN r.status IN ('reserved','collected') THEN r.unit_price * r.quantity ELSE 0 END), 0) AS revenue
        FROM packs p LEFT JOIN reservations r ON r.pack_id = p.id
        WHERE p.business_id = ? GROUP BY p.id ORDER BY p.created_at DESC`).bind(merchantBusiness.id).all(),
      db.prepare('SELECT * FROM pack_templates WHERE business_id = ? ORDER BY title').bind(merchantBusiness.id).all(),
    ]);
    merchantPacks = merchantRows.results;
    templates = templateRows.results;
  }

  return NextResponse.json({
    authUser,
    profile,
    legalAccepted,
    packs: packs.results.map((pack) => ({
      ...pack,
      mercado_pago_enabled: mercadoPagoConfigured && Boolean(pack.mercado_pago_connected),
    })),
    reservations: reservations.results,
    merchantBusiness,
    merchantApplication,
    merchantPayment: {
      configured: mercadoPagoConfigured,
      status: merchantConnection?.status ?? 'not_connected',
      connectedAt: merchantConnection?.connected_at ?? null,
    },
    merchantPacks,
    templates,
  });
}
