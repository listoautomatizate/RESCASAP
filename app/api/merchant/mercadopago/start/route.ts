import { env } from 'cloudflare:workers';
import { NextResponse } from 'next/server';
import { getAppUser } from '@/app/auth';
import { ensureDatabase } from '@/db/bootstrap';
import { mercadoPagoAppConfig, pkceChallenge, randomUrlSafe } from '@/app/mercadopago';

const COOKIE_MAX_AGE = 10 * 60;

export async function GET() {
  const authUser = await getAppUser();
  if (!authUser) return NextResponse.redirect('https://rescasap.uy/?mp_error=sesion');
  await ensureDatabase();
  const business = await env.DB.prepare(`SELECT b.id FROM businesses b
    JOIN merchant_applications a ON a.business_id = b.id
    WHERE b.owner_id = ? AND a.status = 'verified' LIMIT 1`)
    .bind(authUser.userId).first<{ id: string }>();
  if (!business) return NextResponse.redirect('https://rescasap.uy/?mp_error=verificacion');
  const config = mercadoPagoAppConfig();
  if (!config) return NextResponse.redirect('https://rescasap.uy/?mp_error=configuracion');

  const state = randomUrlSafe(32);
  const verifier = randomUrlSafe(48);
  const authorizationUrl = new URL('https://auth.mercadopago.com.uy/authorization');
  authorizationUrl.searchParams.set('client_id', config.clientId);
  authorizationUrl.searchParams.set('response_type', 'code');
  authorizationUrl.searchParams.set('platform_id', 'mp');
  authorizationUrl.searchParams.set('redirect_uri', config.redirectUri);
  authorizationUrl.searchParams.set('state', state);
  authorizationUrl.searchParams.set('code_challenge', await pkceChallenge(verifier));
  authorizationUrl.searchParams.set('code_challenge_method', 'S256');

  const response = NextResponse.redirect(authorizationUrl);
  const cookieOptions = { httpOnly: true, secure: true, sameSite: 'lax' as const, path: '/', maxAge: COOKIE_MAX_AGE };
  response.cookies.set('rescasap_mp_state', state, cookieOptions);
  response.cookies.set('rescasap_mp_verifier', verifier, cookieOptions);
  response.cookies.set('rescasap_mp_business', business.id, cookieOptions);
  return response;
}
