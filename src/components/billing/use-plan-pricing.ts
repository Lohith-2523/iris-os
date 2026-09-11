'use client';

import { useEffect, useState } from 'react';
import { pricingCatalog, type PricingRegion } from '@/lib/plan-pricing';

export function usePlanPricing(enabled = true) {
  const [region, setRegion] = useState<PricingRegion>('INTERNATIONAL');
  const [plans, setPlans] = useState(() => pricingCatalog('INTERNATIONAL'));
  const [loading, setLoading] = useState(enabled);

  useEffect(() => {
    if (!enabled) return;
    setLoading(true);
    const controller = new AbortController();
    fetch('/api/pricing', { signal: controller.signal, cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('Unable to load regional pricing.');
        return response.json();
      })
      .then((payload) => {
        if (payload.region === 'INDIA' || payload.region === 'INTERNATIONAL') {
          setRegion(payload.region);
          setPlans(pricingCatalog(payload.region));
        }
      })
      .catch((error) => {
        if (error instanceof Error && error.name === 'AbortError') return;
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [enabled]);

  return { region, plans, loading };
}
