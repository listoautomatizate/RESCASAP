import { env } from 'cloudflare:workers';

let schemaReady: Promise<void> | null = null;

export async function ensureDatabase() {
  if (!schemaReady) schemaReady = initialize();
  await schemaReady;
}

async function initialize() {
  const db = env.DB;
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('consumer','merchant')),
      neighborhood TEXT NOT NULL DEFAULT 'Montevideo',
      created_at TEXT NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS businesses (
      id TEXT PRIMARY KEY,
      owner_id TEXT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      address TEXT NOT NULL,
      neighborhood TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      rating REAL NOT NULL DEFAULT 4.8,
      closing_time TEXT NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS pack_templates (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      normal_price INTEGER NOT NULL,
      rescue_price INTEGER NOT NULL,
      estimated_kg REAL NOT NULL,
      pickup_start TEXT NOT NULL,
      pickup_end TEXT NOT NULL,
      auto_discount INTEGER NOT NULL DEFAULT 0,
      final_price INTEGER,
      discount_minutes INTEGER
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS packs (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      template_id TEXT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      normal_price INTEGER NOT NULL,
      rescue_price INTEGER NOT NULL,
      current_price INTEGER NOT NULL,
      quantity_total INTEGER NOT NULL,
      quantity_available INTEGER NOT NULL,
      estimated_kg REAL NOT NULL,
      pickup_start TEXT NOT NULL,
      pickup_end TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('published','sold_out','cancelled','unsold')),
      auto_discount INTEGER NOT NULL DEFAULT 0,
      final_price INTEGER,
      discount_minutes INTEGER,
      visual_tone TEXT NOT NULL DEFAULT 'bread',
      created_at TEXT NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS reservations (
      id TEXT PRIMARY KEY,
      pack_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      unit_price INTEGER NOT NULL,
      pickup_code TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL CHECK(status IN ('reserved','collected','cancelled','no_show')),
      payment_status TEXT NOT NULL CHECK(payment_status IN ('paid','pay_at_store','refunded')),
      created_at TEXT NOT NULL,
      collected_at TEXT
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS legal_acceptances (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      document_type TEXT NOT NULL,
      document_version TEXT NOT NULL,
      accepted_at TEXT NOT NULL,
      UNIQUE(user_id, document_type, document_version)
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS merchant_applications (
      business_id TEXT PRIMARY KEY,
      legal_name TEXT NOT NULL,
      rut TEXT NOT NULL,
      habilitation_number TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','verified','rejected')),
      terms_version TEXT NOT NULL,
      accepted_at TEXT NOT NULL,
      reviewed_at TEXT
    )`),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_businesses_owner_id ON businesses(owner_id)'),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_pack_templates_business_id ON pack_templates(business_id)'),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_packs_status_pickup_end ON packs(status, pickup_end)'),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_packs_business_id ON packs(business_id)'),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_reservations_user_id_created_at ON reservations(user_id, created_at)'),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_reservations_pack_id_status ON reservations(pack_id, status)'),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_legal_acceptances_user_document ON legal_acceptances(user_id, document_type, document_version)'),
    db.prepare('PRAGMA optimize'),
  ]);

  const existing = await db.prepare('SELECT COUNT(*) AS total FROM businesses').first<{ total: number }>();
  if ((existing?.total ?? 0) > 0) return;

  const now = new Date().toISOString();
  await db.batch([
    db.prepare('INSERT INTO businesses (id, name, category, address, neighborhood, latitude, longitude, rating, closing_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind('biz-la-miga', 'La Miga', 'Panadería', 'Gaboto 1421', 'Cordón', -34.9009, -56.1764, 4.9, '20:00'),
    db.prepare('INSERT INTO businesses (id, name, category, address, neighborhood, latitude, longitude, rating, closing_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind('biz-verde', 'Verde Mercado', 'Frutería', 'Av. Brasil 2480', 'Pocitos', -34.9084, -56.1528, 4.7, '21:00'),
    db.prepare('INSERT INTO businesses (id, name, category, address, neighborhood, latitude, longitude, rating, closing_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind('biz-cafe-sur', 'Café Sur', 'Cafetería', 'Gonzalo Ramírez 2088', 'Parque Rodó', -34.9142, -56.1661, 4.8, '19:30'),
    db.prepare('INSERT INTO businesses (id, name, category, address, neighborhood, latitude, longitude, rating, closing_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind('biz-botanico', 'Botánico Cocina', 'Restaurante', 'Durazno 1784', 'Palermo', -34.9107, -56.1791, 4.9, '23:00'),
    db.prepare(`INSERT INTO packs (id, business_id, title, description, normal_price, rescue_price, current_price, quantity_total, quantity_available, estimated_kg, pickup_start, pickup_end, status, auto_discount, final_price, discount_minutes, visual_tone, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', ?, ?, ?, ?, ?)`)
      .bind('pack-miga', 'biz-la-miga', 'Bolsa sorpresa de panadería', 'Una selección abundante de bizcochos, panes y dulces del día. El contenido cambia según el excedente.', 680, 220, 220, 5, 4, 1.4, '19:00', '19:40', 1, 160, 20, 'bread', now),
    db.prepare(`INSERT INTO packs (id, business_id, title, description, normal_price, rescue_price, current_price, quantity_total, quantity_available, estimated_kg, pickup_start, pickup_end, status, auto_discount, final_price, discount_minutes, visual_tone, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', ?, ?, ?, ?, ?)`)
      .bind('pack-verde', 'biz-verde', 'Caja de frutas y verduras', 'Productos frescos con detalles estéticos, ideales para cocinar hoy o freezar.', 890, 290, 290, 3, 2, 3.0, '20:00', '20:45', 0, null, null, 'greens', now),
    db.prepare(`INSERT INTO packs (id, business_id, title, description, normal_price, rescue_price, current_price, quantity_total, quantity_available, estimated_kg, pickup_start, pickup_end, status, auto_discount, final_price, discount_minutes, visual_tone, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', ?, ?, ?, ?, ?)`)
      .bind('pack-cafe-sur', 'biz-cafe-sur', 'Merienda de cierre', 'Dos bebidas y una selección de tortas o sándwiches preparados durante el día.', 540, 180, 180, 6, 6, 0.8, '18:30', '19:15', 1, 120, 15, 'coffee', now),
    db.prepare(`INSERT INTO packs (id, business_id, title, description, normal_price, rescue_price, current_price, quantity_total, quantity_available, estimated_kg, pickup_start, pickup_end, status, auto_discount, final_price, discount_minutes, visual_tone, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', ?, ?, ?, ?, ?)`)
      .bind('pack-botanico', 'biz-botanico', 'Cena vegetariana sorpresa', 'Plato principal vegetariano más acompañamiento, listo para llevar y disfrutar.', 980, 360, 360, 4, 3, 1.1, '22:00', '22:40', 1, 280, 30, 'dinner', now),
  ]);
}
