/**
 * Universal category resolver tests.
 * Pure functions — no database required.
 */

import { describe, it, expect } from '@jest/globals';
import { CATEGORIES, getCategory, resolveCategory } from '../src/domain/taxonomy.js';

describe('Category registry', () => {
  it('has unique slugs', () => {
    const slugs = CATEGORIES.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('every category declares a provider role and required attributes', () => {
    for (const c of CATEGORIES) {
      expect(c.providerRole.length).toBeGreaterThan(0);
      expect(Array.isArray(c.requiredAttributes)).toBe(true);
    }
  });

  it('looks up by slug', () => {
    expect(getCategory('house_cleaning')?.name).toBe('Home cleaning');
    expect(getCategory('nope')).toBeUndefined();
  });
});

describe('Intent resolution', () => {
  const cases: [string, string][] = [
    ['I want to order a pack of gum', 'quick_commerce'],
    ['get me a toy car', 'toy_purchase'],
    ['I need a cleaner for my 2BHK', 'house_cleaning'],
    ['my kitchen sink is leaking', 'plumbing'],
    ['a cook for 3 hours at home', 'home_cooking'],
    ['rent a car for 2 days', 'vehicle_rental'],
    ['I want to buy a used Honda City', 'vehicle_purchase'],
    ['I want a Lamborghini', 'vehicle_purchase'],
    ['order chicken biryani', 'food_delivery'],
    ['book a cab to the airport', 'cab_ride'],
    ['hire 2 helpers for shifting furniture', 'general_labour'],
    ['a maths tutor for class 10', 'tutoring'],
    ['send a parcel to Whitefield', 'courier_delivery'],
  ];

  it.each(cases)('maps %p → %p', (text, slug) => {
    expect(resolveCategory(text).category?.slug).toBe(slug);
  });

  it('returns null for unrelated text', () => {
    expect(resolveCategory('asdfghjkl').category).toBeNull();
  });

  it('prefers the more specific phrase', () => {
    // "toy car" must beat the generic "car"
    expect(resolveCategory('a toy car').category?.slug).toBe('toy_purchase');
  });
});
