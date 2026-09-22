export type AgencyMetaAdMetric = {
  spend: number;
  reach: number;
  impressions: number;
  clicks: number;
  leadsCount: number;
};

export type AgencyMetaMetrics = AgencyMetaAdMetric & {
  ctr: number | null;
  cpc: number | null;
  cpm: number | null;
  costPerLead: number | null;
};

function safeRatio(numerator: number, denominator: number, multiplier = 1) {
  if (denominator <= 0) return null;
  return (numerator / denominator) * multiplier;
}

export function calculateAgencyMetaMetrics(ads: readonly AgencyMetaAdMetric[]): AgencyMetaMetrics {
  const totals = ads.reduce<AgencyMetaAdMetric>((current, ad) => ({
    spend: current.spend + ad.spend,
    reach: current.reach + ad.reach,
    impressions: current.impressions + ad.impressions,
    clicks: current.clicks + ad.clicks,
    leadsCount: current.leadsCount + ad.leadsCount,
  }), {
    spend: 0,
    reach: 0,
    impressions: 0,
    clicks: 0,
    leadsCount: 0,
  });

  return {
    ...totals,
    ctr: safeRatio(totals.clicks, totals.impressions, 100),
    cpc: safeRatio(totals.spend, totals.clicks),
    cpm: safeRatio(totals.spend, totals.impressions, 1000),
    costPerLead: safeRatio(totals.spend, totals.leadsCount),
  };
}
