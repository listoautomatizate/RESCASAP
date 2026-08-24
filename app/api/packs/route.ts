import { env } from 'cloudflare:workers';
import { NextResponse } from 'next/server';
import { getAppUser } from '@/app/auth';
import { ensureDatabase } from '@/db/bootstrap';

export async function POST(request: Request) {
  const authUser = await getAppUser();
  if (!authUser) return NextResponse.json({ error: 'Sesión requerida.' }, { status: 401 });
  const body = await request.json() as {
    title?: string; description?: string; normalPrice?: number; rescuePrice?: number; quantity?: number;
    estimatedKg?: number; pickupStart?: string; pickupEnd?: string; autoDiscount?: boolean;
    finalPrice?: number; discountMinutes?: number; saveTemplate?: boolean;
  };
  if (!body.title?.trim() || !body.normalPrice || !body.rescuePrice || !body.quantity || !body.pickupStart || !body.pickupEnd) {
    return NextResponse.json({ error: 'Completá los datos obligatorios del pack.' }, { status: 400 });
  }
  if (body.rescuePrice >= body.normalPrice) {
    return NextResponse.json({ error: 'El precio rescate debe ser menor al precio habitual.' }, { status: 400 });
  }
  await ensureDatabase();
  const profile = await env.DB.prepare("SELECT role FROM users WHERE id = ? AND role = 'merchant'").bind(authUser.userId).first();
  const business = await env.DB.prepare(`SELECT b.id FROM businesses b
    JOIN merchant_applications a ON a.business_id = b.id AND a.status = 'verified'
    WHERE b.owner_id = ? LIMIT 1`).bind(authUser.userId).first<{ id: string }>();
  if (!profile || !business) return NextResponse.json({ error: 'Tu comercio debe estar verificado antes de publicar.' }, { status: 403 });

  const id = `pack-${crypto.randomUUID()}`;
  const templateId = body.saveTemplate ? `tpl-${crypto.randomUUID()}` : null;
  const statements = [];
  if (templateId) {
    statements.push(env.DB.prepare(`INSERT INTO pack_templates (id, business_id, title, description, normal_price, rescue_price, estimated_kg, pickup_start, pickup_end, auto_discount, final_price, discount_minutes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(templateId, business.id, body.title.trim(), body.description?.trim() || 'Pack sorpresa del día.', body.normalPrice, body.rescuePrice, body.estimatedKg || 1, body.pickupStart, body.pickupEnd, body.autoDiscount ? 1 : 0, body.autoDiscount ? body.finalPrice || body.rescuePrice : null, body.autoDiscount ? body.discountMinutes || 30 : null));
  }
  statements.push(env.DB.prepare(`INSERT INTO packs (id, business_id, template_id, title, description, normal_price, rescue_price, current_price, quantity_total, quantity_available, estimated_kg, pickup_start, pickup_end, status, auto_discount, final_price, discount_minutes, visual_tone, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', ?, ?, ?, 'merchant', ?)`)
    .bind(id, business.id, templateId, body.title.trim(), body.description?.trim() || 'Pack sorpresa del día.', body.normalPrice, body.rescuePrice, body.rescuePrice, body.quantity, body.quantity, body.estimatedKg || 1, body.pickupStart, body.pickupEnd, body.autoDiscount ? 1 : 0, body.autoDiscount ? body.finalPrice || body.rescuePrice : null, body.autoDiscount ? body.discountMinutes || 30 : null, new Date().toISOString()));
  await env.DB.batch(statements);
  return NextResponse.json({ id }, { status: 201 });
}
