import { NextResponse } from 'next/server';
import { syncMercadoPagoOrder, verifyWebhookSignature } from '@/app/mercadopago';

export async function POST(request: Request) {
  const url = new URL(request.url);
  const payload = await request.json().catch(() => null) as { type?: string; data?: { id?: string } } | null;
  const type = url.searchParams.get('type') ?? payload?.type;
  const dataId = url.searchParams.get('data.id') ?? payload?.data?.id;
  if (type !== 'order' || !dataId) return NextResponse.json({ ok: true });

  const valid = await verifyWebhookSignature({
    signature: request.headers.get('x-signature'),
    requestId: request.headers.get('x-request-id'),
    dataId,
  });
  if (!valid) return NextResponse.json({ error: 'Firma inválida.' }, { status: 401 });
  await syncMercadoPagoOrder(dataId);
  return NextResponse.json({ ok: true });
}
