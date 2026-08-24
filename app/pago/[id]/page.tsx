import { env } from 'cloudflare:workers';
import Link from 'next/link';
import { getAppUser } from '@/app/auth';
import { syncMercadoPagoOrder } from '@/app/mercadopago';
import { ensureDatabase } from '@/db/bootstrap';

export const dynamic = 'force-dynamic';

type PaymentRow = {
  reservation_id: string;
  provider_order_id: string | null;
  online_status: string;
  amount: number;
  reservation_status: string;
  pickup_code: string;
  title: string;
  pickup_start: string;
  pickup_end: string;
  business_name: string;
  address: string;
  neighborhood: string;
};

function money(value: number) {
  return new Intl.NumberFormat('es-UY', { style: 'currency', currency: 'UYU', maximumFractionDigits: 0 }).format(value);
}

export default async function PaymentReturnPage({ params }: { params: Promise<{ id: string }> }) {
  const authUser = await getAppUser();
  const { id } = await params;
  if (!authUser) return <main className="payment-return"><section><span className="brand">RESCASAP</span><h1>Volvé a ingresar</h1><p>Tu pago queda protegido. Ingresá con tu email para consultar el estado real.</p><Link href="/">Ingresar →</Link></section></main>;

  await ensureDatabase();
  let payment = await env.DB.prepare(`SELECT pt.reservation_id, pt.provider_order_id, pt.status AS online_status, pt.amount,
      r.status AS reservation_status, r.pickup_code, p.title, p.pickup_start, p.pickup_end,
      b.name AS business_name, b.address, b.neighborhood
    FROM payment_transactions pt JOIN reservations r ON r.id = pt.reservation_id
    JOIN packs p ON p.id = r.pack_id JOIN businesses b ON b.id = p.business_id
    WHERE pt.reservation_id = ? AND r.user_id = ? LIMIT 1`).bind(id, authUser.userId).first<PaymentRow>();
  if (!payment) return <main className="payment-return"><section><span className="brand">RESCASAP</span><h1>No encontramos ese pago</h1><p>Revisá tus rescates desde la aplicación.</p><Link href="/">Volver a RESCASAP →</Link></section></main>;

  if (payment.provider_order_id && !['paid', 'failed', 'cancelled', 'refunded'].includes(payment.online_status)) {
    await syncMercadoPagoOrder(payment.provider_order_id).catch(() => null);
    payment = await env.DB.prepare(`SELECT pt.reservation_id, pt.provider_order_id, pt.status AS online_status, pt.amount,
        r.status AS reservation_status, r.pickup_code, p.title, p.pickup_start, p.pickup_end,
        b.name AS business_name, b.address, b.neighborhood
      FROM payment_transactions pt JOIN reservations r ON r.id = pt.reservation_id
      JOIN packs p ON p.id = r.pack_id JOIN businesses b ON b.id = p.business_id
      WHERE pt.reservation_id = ? AND r.user_id = ? LIMIT 1`).bind(id, authUser.userId).first<PaymentRow>() ?? payment;
  }

  const paid = payment.online_status === 'paid';
  const pending = ['initiating', 'created', 'processing'].includes(payment.online_status);
  return <main className={`payment-return ${paid ? 'paid' : pending ? 'pending' : 'failed'}`}><section>
    <span className="brand">RESCASAP</span><div className="payment-status-mark">{paid ? '✓' : pending ? '…' : '×'}</div>
    <p className="eyebrow dark">MERCADO PAGO</p>
    <h1>{paid ? 'Pago confirmado' : pending ? 'Estamos confirmando' : payment.online_status === 'refunded' ? 'Pago devuelto' : 'El pago no se completó'}</h1>
    <p>{paid ? `Tu rescate en ${payment.business_name} quedó reservado.` : pending ? 'No cierres nada: Mercado Pago todavía está procesando la operación. Podés volver a consultar en unos instantes.' : 'El pack volvió a quedar disponible. Podés elegir pago al retirar o intentar nuevamente.'}</p>
    <div className="payment-return-details"><p><span>Pack</span><b>{payment.title}</b></p><p><span>Total</span><b>{money(payment.amount)}</b></p>{paid && <><p><span>Retiro</span><b>{payment.pickup_start}–{payment.pickup_end}</b></p><p><span>Dirección</span><b>{payment.address}, {payment.neighborhood}</b></p><p><span>Código</span><b className="return-code">{payment.pickup_code}</b></p></>}</div>
    {pending && <Link href={`/pago/${encodeURIComponent(id)}`}>Volver a consultar →</Link>}
    <Link href="/">Ir a mis rescates →</Link>
  </section></main>;
}
