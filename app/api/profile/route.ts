import { env } from 'cloudflare:workers';
import { NextResponse } from 'next/server';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { LEGAL_VERSION } from '@/app/legal';
import { ensureDatabase } from '@/db/bootstrap';

export async function POST(request: Request) {
  const authUser = await getChatGPTUser();
  if (!authUser) return NextResponse.json({ error: 'Sesión requerida.' }, { status: 401 });
  const body = await request.json() as {
    name?: string; role?: string; neighborhood?: string; businessName?: string; category?: string; address?: string;
    legalName?: string; businessRut?: string; habilitationNumber?: string; acceptedTerms?: string; acceptedMerchantAgreement?: string;
  };
  if (!body.name?.trim() || !['consumer', 'merchant'].includes(body.role ?? '')) {
    return NextResponse.json({ error: 'Completá tu nombre y elegí un tipo de cuenta.' }, { status: 400 });
  }
  await ensureDatabase();
  const [existingTerms, existingBusiness] = await Promise.all([
    env.DB.prepare(`SELECT id FROM legal_acceptances
      WHERE user_id = ? AND document_type = 'terms' AND document_version = ? LIMIT 1`)
      .bind(authUser.userId, LEGAL_VERSION).first<{ id: string }>(),
    env.DB.prepare('SELECT id FROM businesses WHERE owner_id = ? LIMIT 1')
      .bind(authUser.userId).first<{ id: string }>(),
  ]);
  if (body.acceptedTerms !== 'on' && !existingTerms) {
    return NextResponse.json({ error: 'Debés aceptar los términos y la política de privacidad.' }, { status: 400 });
  }
  const businessRut = body.businessRut?.replace(/\D/g, '') ?? '';
  if (body.role === 'merchant' && !existingBusiness && (!body.businessName?.trim() || !body.legalName?.trim() || businessRut.length !== 12 || !body.habilitationNumber?.trim() || body.acceptedMerchantAgreement !== 'on')) {
    return NextResponse.json({ error: 'Completá los datos legales, RUT y habilitación, y aceptá el acuerdo para comercios.' }, { status: 400 });
  }
  const now = new Date().toISOString();
  await env.DB.prepare(`INSERT INTO users (id, email, name, role, neighborhood, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET name = excluded.name, role = excluded.role, neighborhood = excluded.neighborhood`)
    .bind(authUser.userId, authUser.email, body.name.trim(), body.role, body.neighborhood?.trim() || 'Montevideo', now).run();

  if (body.acceptedTerms === 'on') {
    const legalDocuments = ['terms', 'privacy', ...(body.role === 'merchant' && body.acceptedMerchantAgreement === 'on' ? ['merchant_agreement'] : [])];
    await env.DB.batch(legalDocuments.map((document) => env.DB.prepare(`INSERT OR IGNORE INTO legal_acceptances (id, user_id, document_type, document_version, accepted_at)
      VALUES (?, ?, ?, ?, ?)`).bind(`legal-${crypto.randomUUID()}`, authUser.userId, document, LEGAL_VERSION, now)));
  }

  if (body.role === 'merchant' && (!existingBusiness || body.businessRut || body.habilitationNumber)) {
    const businessId = existingBusiness?.id ?? `biz-${crypto.randomUUID()}`;
    if (!existingBusiness) {
      await env.DB.prepare(`INSERT INTO businesses (id, owner_id, name, category, address, neighborhood, latitude, longitude, rating, closing_time)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(businessId, authUser.userId, body.businessName?.trim(), body.category || 'Panadería', body.address?.trim() || 'Montevideo', body.neighborhood?.trim() || 'Montevideo', -34.9011, -56.1645, 5, '20:00').run();
    }
    if (body.legalName?.trim() && businessRut.length === 12 && body.habilitationNumber?.trim()) await env.DB.prepare(`INSERT INTO merchant_applications (business_id, legal_name, rut, habilitation_number, status, terms_version, accepted_at)
      VALUES (?, ?, ?, ?, 'pending', ?, ?)
      ON CONFLICT(business_id) DO UPDATE SET legal_name = excluded.legal_name, rut = excluded.rut,
        habilitation_number = excluded.habilitation_number, terms_version = excluded.terms_version,
        accepted_at = excluded.accepted_at,
        status = CASE WHEN merchant_applications.status = 'verified' THEN 'verified' ELSE 'pending' END`)
      .bind(businessId, body.legalName.trim(), businessRut, body.habilitationNumber.trim(), LEGAL_VERSION, now).run();
  }
  return NextResponse.json({ ok: true });
}
