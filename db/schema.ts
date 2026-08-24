import { index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull(),
  name: text('name').notNull(),
  role: text('role', { enum: ['consumer', 'merchant'] }).notNull(),
  neighborhood: text('neighborhood').notNull().default('Montevideo'),
  createdAt: text('created_at').notNull(),
});

export const businesses = sqliteTable('businesses', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id'),
  name: text('name').notNull(),
  category: text('category').notNull(),
  address: text('address').notNull(),
  neighborhood: text('neighborhood').notNull(),
  latitude: real('latitude').notNull(),
  longitude: real('longitude').notNull(),
  rating: real('rating').notNull().default(4.8),
  closingTime: text('closing_time').notNull(),
}, (table) => [index('idx_businesses_owner_id').on(table.ownerId)]);

export const packTemplates = sqliteTable('pack_templates', {
  id: text('id').primaryKey(),
  businessId: text('business_id').notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  normalPrice: integer('normal_price').notNull(),
  rescuePrice: integer('rescue_price').notNull(),
  estimatedKg: real('estimated_kg').notNull(),
  pickupStart: text('pickup_start').notNull(),
  pickupEnd: text('pickup_end').notNull(),
  autoDiscount: integer('auto_discount', { mode: 'boolean' }).notNull().default(false),
  finalPrice: integer('final_price'),
  discountMinutes: integer('discount_minutes'),
}, (table) => [index('idx_pack_templates_business_id').on(table.businessId)]);

export const packs = sqliteTable('packs', {
  id: text('id').primaryKey(),
  businessId: text('business_id').notNull(),
  templateId: text('template_id'),
  title: text('title').notNull(),
  description: text('description').notNull(),
  normalPrice: integer('normal_price').notNull(),
  rescuePrice: integer('rescue_price').notNull(),
  currentPrice: integer('current_price').notNull(),
  quantityTotal: integer('quantity_total').notNull(),
  quantityAvailable: integer('quantity_available').notNull(),
  estimatedKg: real('estimated_kg').notNull(),
  pickupStart: text('pickup_start').notNull(),
  pickupEnd: text('pickup_end').notNull(),
  status: text('status', { enum: ['published', 'sold_out', 'cancelled', 'unsold'] }).notNull(),
  autoDiscount: integer('auto_discount', { mode: 'boolean' }).notNull().default(false),
  finalPrice: integer('final_price'),
  discountMinutes: integer('discount_minutes'),
  visualTone: text('visual_tone').notNull().default('bread'),
  createdAt: text('created_at').notNull(),
}, (table) => [
  index('idx_packs_status_pickup_end').on(table.status, table.pickupEnd),
  index('idx_packs_business_id').on(table.businessId),
]);

export const reservations = sqliteTable('reservations', {
  id: text('id').primaryKey(),
  packId: text('pack_id').notNull(),
  userId: text('user_id').notNull(),
  quantity: integer('quantity').notNull().default(1),
  unitPrice: integer('unit_price').notNull(),
  pickupCode: text('pickup_code').notNull().unique(),
  status: text('status', { enum: ['reserved', 'collected', 'cancelled', 'no_show'] }).notNull(),
  paymentStatus: text('payment_status', { enum: ['paid', 'pay_at_store', 'refunded'] }).notNull(),
  createdAt: text('created_at').notNull(),
  collectedAt: text('collected_at'),
}, (table) => [
  index('idx_reservations_user_id_created_at').on(table.userId, table.createdAt),
  index('idx_reservations_pack_id_status').on(table.packId, table.status),
]);

export const legalAcceptances = sqliteTable('legal_acceptances', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  documentType: text('document_type').notNull(),
  documentVersion: text('document_version').notNull(),
  acceptedAt: text('accepted_at').notNull(),
}, (table) => [
  index('idx_legal_acceptances_user_document').on(table.userId, table.documentType, table.documentVersion),
]);

export const merchantApplications = sqliteTable('merchant_applications', {
  businessId: text('business_id').primaryKey(),
  legalName: text('legal_name').notNull(),
  rut: text('rut').notNull(),
  habilitationNumber: text('habilitation_number').notNull(),
  status: text('status', { enum: ['pending', 'verified', 'rejected'] }).notNull().default('pending'),
  termsVersion: text('terms_version').notNull(),
  acceptedAt: text('accepted_at').notNull(),
  reviewedAt: text('reviewed_at'),
});

export const mercadoPagoConnections = sqliteTable('mercado_pago_connections', {
  businessId: text('business_id').primaryKey(),
  mpUserId: text('mp_user_id').notNull(),
  accessTokenEncrypted: text('access_token_encrypted').notNull(),
  refreshTokenEncrypted: text('refresh_token_encrypted'),
  expiresAt: text('expires_at').notNull(),
  scope: text('scope'),
  status: text('status', { enum: ['connected', 'expired', 'revoked'] }).notNull().default('connected'),
  connectedAt: text('connected_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => [index('idx_mp_connections_user_id').on(table.mpUserId)]);

export const paymentTransactions = sqliteTable('payment_transactions', {
  id: text('id').primaryKey(),
  reservationId: text('reservation_id').notNull().unique(),
  businessId: text('business_id').notNull(),
  provider: text('provider').notNull().default('mercadopago'),
  externalReference: text('external_reference').notNull().unique(),
  providerOrderId: text('provider_order_id').unique(),
  checkoutUrl: text('checkout_url'),
  idempotencyKey: text('idempotency_key').notNull().unique(),
  amount: integer('amount').notNull(),
  marketplaceFee: integer('marketplace_fee').notNull().default(0),
  status: text('status', { enum: ['initiating', 'created', 'processing', 'paid', 'failed', 'cancelled', 'refunded'] }).notNull(),
  statusDetail: text('status_detail'),
  stockReleasedAt: text('stock_released_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => [
  index('idx_payment_transactions_order').on(table.providerOrderId),
  index('idx_payment_transactions_business_status').on(table.businessId, table.status),
]);
