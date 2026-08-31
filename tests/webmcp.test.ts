import assert from 'node:assert/strict';
import test from 'node:test';
import { compareRescuePacks, findRescuePacks, type RescuePack } from '../app/webmcp.ts';

const base = {
  description: 'Surplus food', quantity_available: 2, status: 'published', pickup_start: '18:00',
  neighborhood: 'Cordón', rating: 4.8,
};

const packs: RescuePack[] = [
  { ...base, id: 'bread', title: 'Bread bag', business_name: 'Bakery', category: 'Panadería', normal_price: 600, current_price: 200, estimated_kg: 1.2, pickup_end: '19:00' },
  { ...base, id: 'produce', title: 'Produce box', business_name: 'Market', category: 'Frutería', normal_price: 900, current_price: 300, estimated_kg: 3, pickup_end: '20:00' },
  { ...base, id: 'sold', title: 'Sold pack', business_name: 'Cafe', category: 'Cafetería', normal_price: 500, current_price: 150, estimated_kg: 1, pickup_end: '18:30', quantity_available: 0 },
];

test('findRescuePacks filters unavailable packs and applies constraints', () => {
  const result = findRescuePacks(packs, { max_price_uyu: 250, min_estimated_kg: 1 });
  assert.deepEqual(result.map((pack) => pack.id), ['bread']);
});

test('findRescuePacks normalizes accents and ranks by food weight', () => {
  const result = findRescuePacks(packs, { category: 'Fruteria', sort_by: 'most_food' });
  assert.deepEqual(result.map((pack) => pack.id), ['produce']);
});

test('compareRescuePacks deduplicates IDs and excludes unavailable packs', () => {
  const result = compareRescuePacks(packs, ['produce', 'bread', 'produce', 'sold']);
  assert.deepEqual(result.map((pack) => pack.id), ['produce', 'bread']);
});
