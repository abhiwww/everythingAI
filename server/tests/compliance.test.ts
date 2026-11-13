/**
 * Compliance engine tests — the rules that make "order anything" lawful.
 */

import { describe, it, expect } from '@jest/globals';
import { getCategory } from '../src/domain/taxonomy.js';
import {
  checkCompliance,
  checkProviderEligibility,
  extractHourlyRate,
  scanProhibited,
} from '../src/domain/compliance.js';

describe('Prohibited content', () => {
  const blocked = [
    'I want to buy a gun',
    'find me a gun dealer',
    'I need a pistol and ammunition',
    'get me some cocaine',
    'sell me a kidney',
    'buy a fake passport',
    'hack my ex girlfriend instagram',
    'hire a hitman',
    'fake rolex for cheap',
  ];

  it.each(blocked)('blocks: %p', (text) => {
    const verdict = checkCompliance({ text, category: null });
    expect(verdict.decision).toBe('block');
  });

  const allowed = [
    'I need a glue gun for craft work',
    'buy a nail gun',
    'a toy gun for my nephew',
    'a paintball gun rental',
  ];

  it.each(allowed)('does not block legal tool/toy phrasing: %p', (text) => {
    expect(scanProhibited(text)).toBeNull();
  });
});

describe('Category rules', () => {
  it('allows ordinary cleaning', () => {
    const verdict = checkCompliance({
      text: 'I need a cleaner for 2 hours in Indiranagar',
      category: getCategory('house_cleaning')!,
      attributes: { hours: 2, area: 'Indiranagar', scope: '2BHK' },
    });
    expect(verdict.decision).toBe('allow');
  });

  it('gates alcohol behind age verification', () => {
    const verdict = checkCompliance({
      text: 'order two beers',
      category: getCategory('alcohol_delivery')!,
      attributes: { items: 'two beers', area: 'Indiranagar' },
    });
    expect(verdict.decision).toBe('gate');
    expect(verdict.code).toBe('age_verification_required');
    expect(verdict.required_actions).toContain('verify_age_21');
  });

  it('gates categories not enabled in the pilot', () => {
    const verdict = checkCompliance({
      text: 'hire a babysitter',
      category: getCategory('childcare')!,
      attributes: { hours: 4, child_age: 5, area: 'Indiranagar' },
    });
    expect(verdict.decision).toBe('gate');
  });

  it('gates other cities', () => {
    const verdict = checkCompliance({
      text: 'I need a cleaner',
      category: getCategory('house_cleaning')!,
      city: 'Mumbai',
    });
    expect(verdict.decision).toBe('gate');
    expect(verdict.code).toBe('outside_pilot_city');
  });

  it('blocks sub-floor labour rates', () => {
    const verdict = checkCompliance({
      text: 'I want a worker for 50 rs per hour',
      category: getCategory('general_labour')!,
      attributes: { hours: 4, area: 'Indiranagar', work: 'shifting' },
    });
    expect(verdict.decision).toBe('block');
    expect(verdict.code).toBe('below_minimum_rate');
  });

  it('allows labour at or above the floor', () => {
    const verdict = checkCompliance({
      text: '2 helpers at 200 rs per hour',
      category: getCategory('general_labour')!,
      attributes: { hours: 4, area: 'Indiranagar', work: 'shifting' },
    });
    expect(verdict.decision).toBe('allow');
  });

  it('attaches provider licence requirements for licensed categories', () => {
    const verdict = checkCompliance({
      text: 'a cab to the airport',
      category: getCategory('cab_ride')!,
      attributes: { pickup: 'Indiranagar', drop: 'Airport', pickup_time: '6am' },
    });
    expect(verdict.decision).toBe('allow');
    expect(verdict.provider_requirements.length).toBeGreaterThan(0);
  });
});

describe('Helpers', () => {
  it('extracts hourly rates', () => {
    expect(extractHourlyRate('a worker for 50 rs per hour')).toBe(50);
    expect(extractHourlyRate('₹250/hour')).toBe(250);
    expect(extractHourlyRate('no rate here')).toBeNull();
  });

  it('rejects unverified providers', () => {
    const verdict = checkProviderEligibility({
      category: getCategory('house_cleaning')!,
      provider: { verificationStatus: 'pending' },
    });
    expect(verdict.decision).toBe('gate');
  });

  it('requires a licence for licensed providers', () => {
    const verdict = checkProviderEligibility({
      category: getCategory('cab_ride')!,
      provider: { verificationStatus: 'verified', licenceVerified: false },
    });
    expect(verdict.decision).toBe('gate');
    expect(verdict.code).toBe('provider_licence_missing');
  });
});
