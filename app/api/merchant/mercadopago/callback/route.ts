import { env } from 'cloudflare:workers';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getAppUser } from '@/app/auth';
import { encryptToken, exchangeAuthorizationCode } from '@/app/mercadopago';
import { ensureDatabase } from '@/db/bootstrap';

function home(request: Request, result: string) {
  const url = new URL('/', request.url);
  url.searchParams.set(result.startsWith('error:') ? 'mp_error' : 'mp_connected', result.startsWith('error:') ? result.slice(6) : '1');
  return url;
}

function clearOAuthCookies(response: NextResponse) {
  for (const name of ['rescasap_mp_state', 'rescasap_mp_verifier', 'rescasap_mp_business']) {
    response.cookies.set(name, '', { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 0 });
  }
}

export async function GET(request: Request) {
  const authUser = await getAppUser();
  const requestUrl = new URL(request.url);
  const cookieStore = await cookies();
  const state = cookieStore.get('rescasap_mp_state')?.value;
  const verifier = cookieStore.get('rescasap_mp_verifier')?.value;
  const businessId = cookieStore.get('rescasap_mp_business')?.value;
  const code = requestUrl.searchParams.get('code');
  const returnedState = requestUrl.searchParams.get('state');
  const upstreamError = requestUrl.searchParams.get('error');

  if (!authUser || upstreamError || !code || !state || !verifier || !businessId || returnedState !== state) {
    const response = NextResponse.redirect(home(request, 'error:autorizacion'));
    clearOAuthCookies(response);
    return response;
  }

  await ensureDatabase();
  const ownedBusiness = await env.DB.prepare(`SELECT b.id FROM businesses b
    JOIN merchant_applications a ON a.business_id = b.id
    WHERE b.id = ? AND b.owner_id = ? AND a.status = 'verified' LIMIT 1`)
    .bind(businessId, authUser.userId).first<{ id: string }>();
  if (!ownedBusiness) {
    const response = NextResponse.redirect(home(request, 'error:verificacion'));
    clearOAuthCookies(response);
    return response;
  }

  try {
    const token = await exchangeAuthorizationCode(code, verifier);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + token.expires_in * 1000).toISOString();
    await env.DB.prepare(`INSERT INTO mercado_pago_connections
      (business_id, mp_user_id, access_token_encrypted, refresh_token_encrypted, expires_at, scope, status, connected_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 'connected', ?, ?)
      ON CONFLICT(business_id) DO UPDATE SET mp_user_id = excluded.mp_user_id,
        access_token_encrypted = excluded.access_token_encrypted,
        refresh_token_encrypted = COALESCE(excluded.refresh_token_encrypted, mercado_pago_connections.refresh_token_encrypted),
        expires_at = excluded.expires_at, scope = excluded.scope, status = 'connected', updated_at = excluded.updated_at`)
      .bind(
        businessId,
        String(token.user_id),
        await encryptToken(token.access_token),
        token.refresh_token ? await encryptToken(token.refresh_token) : null,
        expiresAt,
        token.scope ?? null,
        now.toISOString(),
        now.toISOString(),
      ).run();
    const response = NextResponse.redirect(home(request, 'connected'));
    clearOAuthCookies(response);
    return response;
  } catch {
    const response = NextResponse.redirect(home(request, 'error:mercadopago'));
    clearOAuthCookies(response);
    return response;
  }
}
