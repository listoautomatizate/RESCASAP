export type RescuePack = {
  id: string;
  business_name: string;
  category: string;
  title: string;
  description: string;
  normal_price: number;
  current_price: number;
  quantity_available: number;
  estimated_kg: number;
  pickup_start: string;
  pickup_end: string;
  status: string;
  neighborhood: string;
  rating: number;
};

export type FindRescuePacksInput = {
  query?: string;
  category?: string;
  max_price_uyu?: number;
  min_estimated_kg?: number;
  sort_by?: 'ending_soon' | 'lowest_price' | 'most_food' | 'biggest_saving';
  limit?: number;
};

type WebMcpTool = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: { readOnlyHint: boolean; untrustedContentHint: boolean };
  execute: (input: Record<string, unknown>, context?: { signal?: AbortSignal }) => Promise<string> | string;
};

type WebMcpModelContext = {
  registerTool: (tool: WebMcpTool, options?: { signal?: AbortSignal }) => Promise<void>;
};

declare global {
  interface Document {
    modelContext?: WebMcpModelContext;
  }
}

export type RescasapToolCallbacks = {
  onShortlist: (packIds: string[], summary: string) => void;
  onCompare: (packIds: string[]) => void;
  onPrepare: (packId: string) => void;
};

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function available(packs: RescuePack[]) {
  return packs.filter((pack) => pack.status === 'published' && pack.quantity_available > 0);
}

export function findRescuePacks(packs: RescuePack[], input: FindRescuePacksInput = {}) {
  const query = normalize(input.query ?? '');
  const category = normalize(input.category ?? '');
  const maxPrice = Number.isFinite(input.max_price_uyu) ? Number(input.max_price_uyu) : null;
  const minKg = Number.isFinite(input.min_estimated_kg) ? Number(input.min_estimated_kg) : null;
  const limit = Math.min(5, Math.max(1, Math.trunc(input.limit ?? 4)));

  return available(packs)
    .filter((pack) => !query || normalize([
      pack.title,
      pack.description,
      pack.business_name,
      pack.category,
      pack.neighborhood,
    ].join(' ')).includes(query))
    .filter((pack) => !category || normalize(pack.category) === category)
    .filter((pack) => maxPrice === null || pack.current_price <= maxPrice)
    .filter((pack) => minKg === null || pack.estimated_kg >= minKg)
    .sort((left, right) => {
      switch (input.sort_by) {
        case 'lowest_price': return left.current_price - right.current_price;
        case 'most_food': return right.estimated_kg - left.estimated_kg;
        case 'biggest_saving':
          return (right.normal_price - right.current_price) - (left.normal_price - left.current_price);
        default: return left.pickup_end.localeCompare(right.pickup_end);
      }
    })
    .slice(0, limit);
}

export function compareRescuePacks(packs: RescuePack[], packIds: string[]) {
  const uniqueIds = [...new Set(packIds)].slice(0, 3);
  return uniqueIds
    .map((packId) => available(packs).find((pack) => pack.id === packId))
    .filter((pack): pack is RescuePack => Boolean(pack));
}

function compactPack(pack: RescuePack) {
  return {
    id: pack.id,
    title: pack.title,
    business: pack.business_name,
    category: pack.category,
    price_uyu: pack.current_price,
    regular_price_uyu: pack.normal_price,
    estimated_kg: pack.estimated_kg,
    pickup: `${pack.pickup_start}-${pack.pickup_end}`,
    neighborhood: pack.neighborhood,
    available: pack.quantity_available,
  };
}

export async function registerRescasapTools(
  packs: RescuePack[],
  callbacks: RescasapToolCallbacks,
  controller: AbortController,
) {
  if (!document.modelContext?.registerTool) return 0;

  await Promise.all([
    document.modelContext.registerTool({
      name: 'find_rescue_packs',
      description: 'Find available RESCASAP surplus-food packs in Montevideo. Filters by text, category, price or estimated food weight and visibly shortlists the best matches on the page.',
      inputSchema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          query: { type: 'string', maxLength: 80, description: 'Food, business or neighborhood to search for.' },
          category: { type: 'string', maxLength: 40, description: 'Exact category, such as Panadería, Frutería or Cafetería.' },
          max_price_uyu: { type: 'number', minimum: 1, maximum: 10000, description: 'Maximum price in Uruguayan pesos.' },
          min_estimated_kg: { type: 'number', minimum: 0.1, maximum: 50, description: 'Minimum estimated food weight per pack in kilograms.' },
          sort_by: { type: 'string', enum: ['ending_soon', 'lowest_price', 'most_food', 'biggest_saving'], description: 'How to rank matching packs.' },
          limit: { type: 'integer', minimum: 1, maximum: 5, description: 'Number of packs to return, up to five.' },
        },
      },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: async (rawInput) => {
        const matches = findRescuePacks(packs, rawInput as FindRescuePacksInput);
        const summary = matches.length
          ? `Encontramos ${matches.length} pack${matches.length === 1 ? '' : 's'} disponible${matches.length === 1 ? '' : 's'} para tu pedido.`
          : 'No encontramos packs disponibles con esos filtros.';
        callbacks.onShortlist(matches.map((pack) => pack.id), summary);
        return JSON.stringify({ summary, packs: matches.map(compactPack) });
      },
    }, { signal: controller.signal }),
    document.modelContext.registerTool({
      name: 'compare_rescue_packs',
      description: 'Compare two or three available RESCASAP packs by price, savings, estimated food weight, pickup time and neighborhood. Opens a visible comparison for the person.',
      inputSchema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          pack_ids: {
            type: 'array',
            minItems: 2,
            maxItems: 3,
            uniqueItems: true,
            items: { type: 'string', maxLength: 80 },
            description: 'Two or three pack IDs returned by find_rescue_packs.',
          },
        },
        required: ['pack_ids'],
      },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: async (rawInput) => {
        const ids = Array.isArray(rawInput.pack_ids) ? rawInput.pack_ids.map(String) : [];
        const matches = compareRescuePacks(packs, ids);
        if (matches.length < 2) return JSON.stringify({ error: 'At least two currently available pack IDs are required.' });
        callbacks.onCompare(matches.map((pack) => pack.id));
        return JSON.stringify({
          summary: `Comparing ${matches.length} available packs. The comparison is open on the page.`,
          packs: matches.map((pack) => ({
            ...compactPack(pack),
            saving_uyu: pack.normal_price - pack.current_price,
          })),
        });
      },
    }, { signal: controller.signal }),
    document.modelContext.registerTool({
      name: 'prepare_pack_reservation',
      description: 'Prepare one available RESCASAP pack for human review. Opens the checkout with pay-at-pickup selected, but never reserves, charges or submits anything; the person must confirm.',
      inputSchema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          pack_id: { type: 'string', maxLength: 80, description: 'Available pack ID returned by find_rescue_packs.' },
        },
        required: ['pack_id'],
      },
      annotations: { readOnlyHint: false, untrustedContentHint: true },
      execute: async (rawInput) => {
        const pack = available(packs).find((candidate) => candidate.id === String(rawInput.pack_id ?? ''));
        if (!pack) return JSON.stringify({ error: 'That pack is unavailable. Search again for current options.' });
        callbacks.onPrepare(pack.id);
        return JSON.stringify({
          status: 'ready_for_human_review',
          message: 'Checkout is open. No reservation or payment has been submitted.',
          pack: compactPack(pack),
          requires_human_confirmation: true,
        });
      },
    }, { signal: controller.signal }),
  ]);

  return 3;
}
