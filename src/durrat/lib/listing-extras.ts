export function listingExtras(value: {
  insurance_amount?: number; has_laundry?: boolean; has_elevator?: boolean;
  condition?: 'new' | 'used' | ''; payment_method?: string;
}) {
  return {
    insurance_amount: value.insurance_amount ?? 0,
    has_laundry: value.has_laundry ?? false,
    has_elevator: value.has_elevator ?? false,
    condition: value.condition ?? '',
    payment_method: value.payment_method ?? '',
  };
}