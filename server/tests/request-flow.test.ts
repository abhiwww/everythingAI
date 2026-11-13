/**
 * Request flow tests — slot filling, estimates, state machine.
 */

import { describe, it, expect } from '@jest/globals';
import { getCategory } from '../src/domain/taxonomy.js';
import {
  canOrderTransition,
  canTransition,
  estimatePrice,
  extractAttributes,
  isAffirmative,
  isNegative,
  missingAttributes,
  validateAttributes,
} from '../src/domain/request-flow.js';

const cleaning = getCategory('house_cleaning')!;
const labour = getCategory('general_labour')!;

describe('Slot filling', () => {
  it('lists missing required attributes for a new request', () => {
    const missing = missingAttributes(cleaning, {});
    expect(missing.map((m) => m.key).sort()).toEqual(['area', 'hours', 'scope']);
  });

  it('fills hours and area from one message', () => {
    const attrs = extractAttributes(cleaning, '2 hours in Indiranagar');
    expect(attrs.hours).toBe(2);
    expect(attrs.area).toBe('Indiranagar');
  });

  it('uses the last missing text field as the answer', () => {
    const attrs = extractAttributes(
      cleaning,
      '2BHK deep clean, kitchen and bathrooms',
      { hours: 2, area: 'Indiranagar' }
    );
    expect(attrs.scope).toContain('2BHK');
    expect(missingAttributes(cleaning, attrs)).toHaveLength(0);
  });

  it('validates enum values', () => {
    const rental = getCategory('vehicle_rental')!;
    const bad = validateAttributes(rental, {
      vehicle_class: 'spaceship',
      days: 1,
      area: 'Indiranagar',
    });
    expect(bad.ok).toBe(false);
    expect(bad.errors.join(' ')).toContain('must be one of');
  });

  it('recognises confirmation and refusal', () => {
    expect(isAffirmative('yes')).toBe(true);
    expect(isAffirmative('go ahead')).toBe(true);
    expect(isAffirmative('hmm maybe')).toBe(false);
    expect(isNegative('no')).toBe(true);
    expect(isNegative('cancel it')).toBe(true);
  });
});

describe('Pricing', () => {
  it('multiplies hourly hints by hours', () => {
    const estimate = estimatePrice(labour, { hours: 4 });
    expect(estimate.min).toBe(labour.priceHint.min * 4);
    expect(estimate.max).toBe(labour.priceHint.max * 4);
    expect(estimate.is_estimate).toBe(true);
  });

  it('multiplies item hints by quantity', () => {
    const gum = getCategory('quick_commerce')!;
    const estimate = estimatePrice(gum, { quantity: 3 });
    expect(estimate.quantity_basis).toBe(3);
  });

  it('keeps flat jobs flat', () => {
    const car = getCategory('vehicle_purchase')!;
    const estimate = estimatePrice(car, { vehicle: 'Lamborghini', condition: 'new' });
    expect(estimate.quantity_basis).toBe(1);
    expect(estimate.max).toBe(50000000);
  });
});

describe('State machines', () => {
  it('allows the happy path', () => {
    expect(canTransition('awaiting_confirmation', 'matching')).toBe(true);
    expect(canTransition('matching', 'quoted')).toBe(true);
    expect(canTransition('quoted', 'confirmed')).toBe(true);
    expect(canTransition('confirmed', 'fulfilling')).toBe(true);
    expect(canTransition('fulfilling', 'completed')).toBe(true);
  });

  it('blocks illegal jumps', () => {
    expect(canTransition('draft', 'completed')).toBe(false);
    expect(canTransition('completed', 'confirmed')).toBe(false);
    expect(canTransition('cancelled', 'matching')).toBe(false);
  });

  it('guards order transitions', () => {
    expect(canOrderTransition('confirmed', 'in_progress')).toBe(true);
    expect(canOrderTransition('in_progress', 'completed')).toBe(true);
    expect(canOrderTransition('completed', 'in_progress')).toBe(false);
  });
});
