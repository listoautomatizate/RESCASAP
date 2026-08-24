import { env } from 'cloudflare:workers';
import { ensureDatabase } from '@/db/bootstrap';

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  user_id?: number | string;
  message?: string;
  error?: string;
};

export type MercadoPagoOrder = {
  id: string;
  status: string;
  status_detail?: string;
  checkout_url?: string;
  external_reference?: string;
  total_amount?: string;
  user_id?: string | number;
};

type ConnectionRow = {
  business_id: string;
  mp_user_id: string;
  access_token_encrypted: string;
  refresh_token_encrypted: string | null;
  expires_at: string;
  scope: string | null;
  status: string;
};

function runtime() {
  return env as Cloudflare.Env;
}

export function mercadoPagoAppConfig() {
  const current = runtime();
  const clientId = current.MP_CLIENT_ID?.trim();
  const clientSecret = current.MP_CLIENT_SECRET?.trim();
  const redirectUri = current.MP_OAUTH_REDIRECT_URI?.trim();
  const encryptionKey = current.MP_TOKEN_ENCRYPTION_KEY?.trim();
  if (!clientId || !clientSecret || !redirectUri || !encryptionKey) return null;
  return { clientId, clientSecret, redirectUri, encryptionKey };
}

export function mercadoPagoIsConfigured() {
  return Boolean(mercadoPagoAppConfig() && runtime().MP_WEBHOOK_SECRET?.trim());
}

export function marketplaceFee(amount: number) {
  const raw = Number(runtime().MP_MARKETPLACE_FEE_PERCENT ?? 0);
  const percentage = Number.isFinite(raw) ? Math.min(50, Math.max(0, raw)) : 0;
  return Math.round(amount * percentage / 100);
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBytes(value: string) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function encryptionKey() {
  const encoded = mercadoPagoAppConfig()?.encryptionKey;
  if (!encoded) throw new Error('Mercado Pago no está configurado.');
  const bytes = base64UrlToBytes(encoded);
  if (bytes.length !== 32) throw new Error('La clave de cifrado de Mercado Pago no es válida.');
  return crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

export async function encryptToken(value: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await encryptionKey(), new TextEncoder().encode(value));
  return `${bytesToBase64Url(iv)}.${bytesToBase64Url(new Uint8Array(encrypted))}`;
}

export async function decryptToken(value: string) {
  const [iv, encrypted] = value.split('.');
  if (!iv || !encrypted) throw new Error('Credencial cifrada inválida.');
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: base64UrlToBytes(iv) }, await encryptionKey(), base64UrlToBytes(encrypted));
  return new TextDecoder().decode(decrypted);
}

export function randomUrlSafe(bytes = 32) {
  return bytesToBase64Url(crypto.getRandomValues(new Uint8Array(bytes)));
}

export async function pkceChallenge(verifier: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return bytesToBase64Url(new Uint8Array(digest));
}

async function parseMercadoPagoError(response: Response) {
  const detail = await response.json().catch(() => ({})) as { message?: string; error?: string; cause?: Array<{ description?: string }> };
  return detail.cause?.[0]?.description || detail.message || detail.error || 'Mercado Pago no pudo completar la operación.';
}

export async function exchangeAuthorizationCode(code: string, verifier: string) {
  const config = mercadoPagoAppConfig();
  if (!config) throw new Error('La integración de Mercado Pago todavía no está configurada.');
  const response = await fetch('https://api.mercadopago.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: config.redirectUri,
      code_verifier: verifier,
      test_token: false,
    }),
  });
  if (!response.ok) throw new Error(await parseMercadoPagoError(response));
  const token = await response.json() as TokenResponse;
  if (!token.access_token || !token.user_id || !token.expires_in) throw new Error('Mercado Pago devolvió una autorización incompleta.');
  return token as Required<Pick<TokenResponse, 'access_token' | 'expires_in' | 'user_id'>> & TokenResponse;
}

async function refreshConnection(connection: ConnectionRow) {
  const config = mercadoPagoAppConfig();
  if (!config || !connection.refresh_token_encrypted) throw new Error('El comercio debe volver a vincular Mercado Pago.');
  const refreshToken = await decryptToken(connection.refresh_token_encrypted);
  const response = await fetch('https://api.mercadopago.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });
  if (!response.ok) {
    await env.DB.prepare("UPDATE mercado_pago_connections SET status = 'expired', updated_at = ? WHERE business_id = ?")
      .bind(new Date().toISOString(), connection.business_id).run();
    throw new Error('La autorización de Mercado Pago venció. El comercio debe vincularla nuevamente.');
  }
  const token = await response.json() as TokenResponse;
  if (!token.access_token || !token.expires_in) throw new Error('Mercado Pago devolvió una renovación incompleta.');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + token.expires_in * 1000).toISOString();
  await env.DB.prepare(`UPDATE mercado_pago_connections SET access_token_encrypted = ?, refresh_token_encrypted = ?,
    expires_at = ?, scope = ?, status = 'connected', updated_at = ? WHERE business_id = ?`)
    .bind(
      await encryptToken(token.access_token),
      token.refresh_token ? await encryptToken(token.refresh_token) : connection.refresh_token_encrypted,
      expiresAt,
      token.scope ?? connection.scope,
      now.toISOString(),
      connection.business_id,
    ).run();
  return token.access_token;
}

export async function businessAccessToken(businessId: string) {
  await ensureDatabase();
  const connection = await env.DB.prepare('SELECT * FROM mercado_pago_connections WHERE business_id = ? AND status != \'revoked\'')
    .bind(businessId).first<ConnectionRow>();
  if (!connection) throw new Error('Este comercio todavía no vinculó Mercado Pago.');
  if (Date.parse(connection.expires_at) - Date.now() < 5 * 60 * 1000) return refreshConnection(connection);
  return decryptToken(connection.access_token_encrypted);
}

export async function createMercadoPagoOrder(input: {
  businessId: string;
  reservationId: string;
  title: string;
  amount: number;
  buyerEmail: string;
  idempotencyKey: string;
}) {
  const accessToken = await businessAccessToken(input.businessId);
  const origin = (runtime().PUBLIC_SITE_URL || 'https://rescasap.uy').replace(/\/$/, '');
  const returnBase = `${origin}/pago/${encodeURIComponent(input.reservationId)}`;
  const fee = marketplaceFee(input.amount);
  const body: Record<string, unknown> = {
    type: 'online',
    processing_mode: 'manual',
    capture_mode: 'automatic_async',
    total_amount: input.amount.toFixed(2),
    external_reference: input.reservationId,
    expiration_time: 'PT30M',
    payer: { email: input.buyerEmail },
    items: [{
      external_code: input.reservationId,
      title: input.title.slice(0, 120),
      quantity: 1,
      unit_measure: 'unit',
      unit_price: input.amount.toFixed(2),
      total_amount: input.amount.toFixed(2),
    }],
    config: {
      statement_descriptor: 'RESCASAP',
      online: {
        success_url: `${returnBase}?resultado=aprobado`,
        failure_url: `${returnBase}?resultado=rechazado`,
        pending_url: `${returnBase}?resultado=pendiente`,
        auto_return: 'approved',
      },
    },
  };
  if (fee > 0) body.marketplace_fee = fee.toFixed(2);
  const response = await fetch('https://api.mercadopago.com/v1/orders', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': input.idempotencyKey,
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(await parseMercadoPagoError(response));
  const order = await response.json() as MercadoPagoOrder;
  if (!order.id || !order.checkout_url) throw new Error('Mercado Pago no devolvió la dirección de pago.');
  return { order, fee };
}

async function fetchOrder(orderId: string, businessId: string) {
  const response = await fetch(`https://api.mercadopago.com/v1/orders/${encodeURIComponent(orderId)}`, {
    headers: { Authorization: `Bearer ${await businessAccessToken(businessId)}` },
  });
  if (!response.ok) throw new Error(await parseMercadoPagoError(response));
  return response.json() as Promise<MercadoPagoOrder>;
}

export async function applyOrderStatus(order: MercadoPagoOrder) {
  await ensureDatabase();
  const transaction = await env.DB.prepare(`SELECT pt.id, pt.reservation_id, pt.status, r.pack_id, r.status AS reservation_status
    FROM payment_transactions pt JOIN reservations r ON r.id = pt.reservation_id WHERE pt.provider_order_id = ? LIMIT 1`)
    .bind(order.id).first<{ id: string; reservation_id: string; status: string; pack_id: string; reservation_status: string }>();
  if (!transaction) return null;
  const now = new Date().toISOString();
  const isPaid = order.status === 'processed' && (!order.status_detail || order.status_detail === 'accredited');
  const isRefunded = order.status === 'refunded' || order.status_detail === 'refunded';
  const isTerminalFailure = ['failed', 'canceled', 'cancelled', 'expired'].includes(order.status);
  const nextStatus = isPaid ? 'paid' : isRefunded ? 'refunded' : isTerminalFailure ? (order.status === 'failed' ? 'failed' : 'cancelled') : order.status === 'processing' ? 'processing' : 'created';

  if ((isRefunded || isTerminalFailure) && transaction.reservation_status === 'reserved') {
    const releaseMarker = `${now}:${crypto.randomUUID()}`;
    await env.DB.batch([
      env.DB.prepare(`UPDATE payment_transactions SET status = ?, status_detail = ?, stock_released_at = ?, updated_at = ?
        WHERE id = ? AND stock_released_at IS NULL`)
        .bind(nextStatus, order.status_detail ?? order.status, releaseMarker, now, transaction.id),
      env.DB.prepare(`UPDATE packs SET quantity_available = quantity_available + 1,
        status = CASE WHEN status = 'sold_out' THEN 'published' ELSE status END
        WHERE id = ? AND EXISTS (SELECT 1 FROM payment_transactions WHERE id = ? AND stock_released_at = ?)`)
        .bind(transaction.pack_id, transaction.id, releaseMarker),
      env.DB.prepare(`UPDATE reservations SET status = 'cancelled', payment_status = ?
        WHERE id = ? AND status = 'reserved'
        AND EXISTS (SELECT 1 FROM payment_transactions WHERE id = ? AND stock_released_at = ?)`)
        .bind(isRefunded ? 'refunded' : 'pay_at_store', transaction.reservation_id, transaction.id, releaseMarker),
    ]);
  } else {
    await env.DB.batch([
      env.DB.prepare('UPDATE payment_transactions SET status = ?, status_detail = ?, updated_at = ? WHERE id = ?')
        .bind(nextStatus, order.status_detail ?? order.status, now, transaction.id),
      ...(isPaid ? [env.DB.prepare("UPDATE reservations SET payment_status = 'paid' WHERE id = ?").bind(transaction.reservation_id)] : []),
    ]);
  }
  return { reservationId: transaction.reservation_id, status: nextStatus };
}

export async function syncMercadoPagoOrder(orderId: string) {
  await ensureDatabase();
  const transaction = await env.DB.prepare('SELECT business_id FROM payment_transactions WHERE provider_order_id = ? LIMIT 1')
    .bind(orderId).first<{ business_id: string }>();
  if (!transaction) return null;
  const order = await fetchOrder(orderId, transaction.business_id);
  return applyOrderStatus(order);
}

export async function cancelOrRefundPayment(reservationId: string) {
  await ensureDatabase();
  const transaction = await env.DB.prepare(`SELECT id, business_id, provider_order_id, status
    FROM payment_transactions WHERE reservation_id = ? LIMIT 1`).bind(reservationId).first<{
      id: string; business_id: string; provider_order_id: string | null; status: string;
    }>();
  if (!transaction?.provider_order_id) return false;
  const token = await businessAccessToken(transaction.business_id);
  const current = await fetchOrder(transaction.provider_order_id, transaction.business_id);
  const paid = current.status === 'processed' && (!current.status_detail || current.status_detail === 'accredited');
  const action = paid ? 'refund' : 'cancel';
  const response = await fetch(`https://api.mercadopago.com/v1/orders/${encodeURIComponent(transaction.provider_order_id)}/${action}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': `${action}-${transaction.id}`,
    },
  });
  if (!response.ok) throw new Error(await parseMercadoPagoError(response));
  const order = await response.json() as MercadoPagoOrder;
  await applyOrderStatus(order);
  return true;
}

function hex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let result = 0;
  for (let index = 0; index < left.length; index += 1) result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return result === 0;
}

export async function verifyWebhookSignature(input: { signature: string | null; requestId: string | null; dataId: string }) {
  const secret = runtime().MP_WEBHOOK_SECRET?.trim();
  if (!secret || !input.signature || !input.requestId || !input.dataId) return false;
  const parts = Object.fromEntries(input.signature.split(',').map((part) => part.trim().split('=', 2)));
  if (!parts.ts || !parts.v1) return false;
  const manifest = `id:${input.dataId.toLowerCase()};request-id:${input.requestId};ts:${parts.ts};`;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(manifest));
  return constantTimeEqual(hex(new Uint8Array(signature)), parts.v1.toLowerCase());
}
