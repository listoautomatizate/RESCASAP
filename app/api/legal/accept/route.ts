import { env } from 'cloudflare:workers';
import { NextResponse } from 'next/server';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { LEGAL_VERSION } from '@/app/legal';
import { ensureDatabase } from '@/db/bootstrap';

export async function POST(request: Request) {
  const authUser = await getChatGPTUser();
  if (!authUser) return NextResponse.json({ error: 'Sesión requerida.' }, { status: 401 });
  const body = await request.json() as { accepted?: boolean };
  if (!body.accepted) return NextResponse.json({ error: 'Debés aceptar los documentos legales para continuar.' }, { status: 400 });
  await ensureDatabase();
  const profile = await env.DB.prepare('SELECT role FROM users WHERE id = ?').bind(authUser.userId).first<{ role: string }>();
  if (!profile) return NextResponse.json({ error: 'Completá primero tu perfil.' }, { status: 400 });
  const now = new Date().toISOString();
  const documents = ['terms', 'privacy', ...(profile.role === 'merchant' ? ['merchant_agreement'] : [])];
  await env.DB.batch(documents.map((document) => env.DB.prepare(`INSERT OR IGNORE INTO legal_acceptances (id, user_id, document_type, document_version, accepted_at)
    VALUES (?, ?, ?, ?, ?)`).bind(`legal-${crypto.randomUUID()}`, authUser.userId, document, LEGAL_VERSION, now)));
  return NextResponse.json({ ok: true });
}
