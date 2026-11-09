import { describe, expect, it } from 'vitest';
import { listingExtras } from '@/durrat/lib/listing-extras';

describe('saved listing extras', () => {
  it('preserves the entered insurance amount of 1000 riyals', () => {
    expect(listingExtras({ insurance_amount: 1000 }).insurance_amount).toBe(1000);
  });
  it('keeps laundry optional and retains it when selected', () => {
    expect(listingExtras({}).has_laundry).toBe(false);
    expect(listingExtras({ has_laundry: true }).has_laundry).toBe(true);
  });
  it('retains both available and unavailable elevator selections', () => {
    expect(listingExtras({ has_elevator: true }).has_elevator).toBe(true);
    expect(listingExtras({ has_elevator: false }).has_elevator).toBe(false);
  });
  it('retains new and used property conditions', () => {
    expect(listingExtras({ condition: 'new' }).condition).toBe('new');
    expect(listingExtras({ condition: 'used' }).condition).toBe('used');
  });
});