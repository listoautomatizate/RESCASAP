import type { AppUser } from './auth';
import type { BootstrapData, Pack } from './rescata-app';

const demoPacks: Pack[] = [
  {
    id: 'pack-miga', business_id: 'biz-la-miga', business_name: 'La Miga', category: 'Panadería',
    title: 'Bolsa sorpresa de panadería', description: 'Una selección abundante de bizcochos, panes y dulces del día. El contenido cambia según el excedente.',
    normal_price: 680, rescue_price: 220, current_price: 220, quantity_total: 5, quantity_available: 4,
    estimated_kg: 1.4, pickup_start: '19:00', pickup_end: '19:40', status: 'published', auto_discount: 1,
    final_price: 160, discount_minutes: 20, visual_tone: 'bread', address: 'Gaboto 1421', neighborhood: 'Cordón',
    latitude: -34.9009, longitude: -56.1764, rating: 4.9, mercado_pago_enabled: false,
  },
  {
    id: 'pack-verde', business_id: 'biz-verde', business_name: 'Verde Mercado', category: 'Frutería',
    title: 'Caja de frutas y verduras', description: 'Productos frescos con detalles estéticos, ideales para cocinar hoy o freezar.',
    normal_price: 890, rescue_price: 290, current_price: 290, quantity_total: 3, quantity_available: 2,
    estimated_kg: 3, pickup_start: '20:00', pickup_end: '20:45', status: 'published', auto_discount: 0,
    final_price: null, discount_minutes: null, visual_tone: 'greens', address: 'Av. Brasil 2480', neighborhood: 'Pocitos',
    latitude: -34.9084, longitude: -56.1528, rating: 4.7, mercado_pago_enabled: false,
  },
  {
    id: 'pack-cafe-sur', business_id: 'biz-cafe-sur', business_name: 'Café Sur', category: 'Cafetería',
    title: 'Merienda de cierre', description: 'Dos bebidas y una selección de tortas o sándwiches preparados durante el día.',
    normal_price: 540, rescue_price: 180, current_price: 180, quantity_total: 6, quantity_available: 6,
    estimated_kg: 0.8, pickup_start: '18:30', pickup_end: '19:15', status: 'published', auto_discount: 1,
    final_price: 120, discount_minutes: 15, visual_tone: 'coffee', address: 'Gonzalo Ramírez 2088', neighborhood: 'Parque Rodó',
    latitude: -34.9142, longitude: -56.1661, rating: 4.8, mercado_pago_enabled: false,
  },
  {
    id: 'pack-botanico', business_id: 'biz-botanico', business_name: 'Botánico Cocina', category: 'Restaurante',
    title: 'Cena vegetariana sorpresa', description: 'Plato principal vegetariano más acompañamiento, listo para llevar y disfrutar.',
    normal_price: 980, rescue_price: 360, current_price: 360, quantity_total: 4, quantity_available: 3,
    estimated_kg: 1.1, pickup_start: '22:00', pickup_end: '22:40', status: 'published', auto_discount: 1,
    final_price: 280, discount_minutes: 30, visual_tone: 'dinner', address: 'Durazno 1784', neighborhood: 'Palermo',
    latitude: -34.9107, longitude: -56.1791, rating: 4.9, mercado_pago_enabled: false,
  },
];

export function createDemoData(authUser: AppUser): BootstrapData {
  return {
    authUser,
    profile: { id: authUser.userId, email: authUser.email, name: 'Jurado WebMCP', role: 'consumer', neighborhood: 'Montevideo' },
    legalAccepted: true,
    packs: demoPacks.map((pack) => ({ ...pack })),
    reservations: [],
    merchantBusiness: null,
    merchantApplication: null,
    merchantPayment: { configured: false, status: 'not_connected', connectedAt: null },
    merchantPacks: [],
    templates: [],
  };
}
