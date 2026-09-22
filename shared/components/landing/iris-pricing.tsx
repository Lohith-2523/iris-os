import Image from 'next/image';
import Link from 'next/link';
import { pricingCatalog, type PricingRegion } from '@/lib/plan-pricing';
import { IrisMarketingHeader } from './iris-marketing-header';
import { IrisPricingComparison } from './iris-pricing-comparison';
import pageStyles from './iris-pricing.module.css';

export function IrisPricing({ region }: { region: PricingRegion }) {
  const plans = pricingCatalog(region);

  return (
    <main className={pageStyles.pricingPage} id="top">
      <IrisMarketingHeader />

      <IrisPricingComparison plans={plans} region={region} pageHeading />

      <footer className={pageStyles.pricingPageFooter}>
        <Image src="/iris-logo-black-bg.png" alt="Iris OS" width={74} height={28} />
        <span>© 2026 Iris OS, Inc. All rights reserved.</span>
        <nav aria-label="Pricing footer navigation">
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/cancellation-refund-policy">Cancellations &amp; Refunds</Link>
        </nav>
      </footer>
    </main>
  );
}
