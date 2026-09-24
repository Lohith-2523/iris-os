import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import {
  formatPlanMoney,
  pricingCatalog,
  type PricingRegion,
} from '@/lib/plan-pricing';
import styles from './iris-pricing-comparison.module.css';

type PricingPlan = ReturnType<typeof pricingCatalog>[number];

type IrisPricingComparisonProps = {
  plans: PricingPlan[];
  region: PricingRegion;
  loading?: boolean;
  pageHeading?: boolean;
  showFullPricingLink?: boolean;
};

export function IrisPricingComparison({
  plans,
  region,
  loading = false,
  pageHeading = false,
  showFullPricingLink = false,
}: IrisPricingComparisonProps) {
  const Heading = pageHeading ? 'h1' : 'h2';
  const featureRows = plans[0].features.map((feature, featureIndex) => ({
    label: feature.label,
    values: plans.map((plan) => plan.features[featureIndex].value),
  }));

  if (showFullPricingLink) {
    return (
      <section id="pricing" className={styles.section} aria-labelledby="pricing-summary-title">
        <div className={styles.frame}>
          <header className={styles.heading}>
            <span className={styles.sectionDivider} aria-hidden="true" />
            <span className={styles.eyebrow}>Simple monthly pricing</span>
            <h2 id="pricing-summary-title">Start lean. Scale when the work demands it.</h2>
            <p aria-live="polite">
              {loading ? 'Detecting pricing for your region…' : `${region === 'INDIA' ? 'India' : 'International'} pricing selected. Open any plan for the complete feature comparison.`}
            </p>
          </header>
          <div className={styles.summaryGrid}>
            {plans.map((plan) => (
              <article className={`${styles.summaryCard} ${plan.id === 'PRO' ? styles.featured : ''}`} key={plan.id}>
                <div className={styles.summaryTop}>
                  <h3>{plan.name}</h3>
                  {plan.id === 'PRO' && <b className={styles.popular}>Popular</b>}
                  {plan.id === 'ADVANCED' && <b className={styles.bestValue}>Best value</b>}
                </div>
                {plan.listAmount > plan.baseAmount && (
                  <div className={styles.summaryDiscount}>
                    <del>{formatPlanMoney(plan.listAmount, plan.currency)}</del>
                    <b>50% off early bird offer</b>
                  </div>
                )}
                <div className={`${styles.summaryPrice} ${plan.listAmount > plan.baseAmount ? '' : styles.summaryPriceNoDiscount}`}>
                  <strong>{plan.baseAmount === 0 ? 'Free' : formatPlanMoney(plan.baseAmount, plan.currency)}</strong>
                  {plan.baseAmount > 0 && <span>/month</span>}
                </div>
                <p>{plan.description}</p>
                <ul>
                  {plan.features.slice(0, 3).map((feature) => <li key={feature.label}><span>{feature.label}</span><strong>{feature.value}</strong></li>)}
                </ul>
                <Link className={styles.viewMore} href={`/pricing#plan-${plan.id.toLowerCase()}`}>
                  View more <ArrowRight aria-hidden="true" />
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="pricing" className={styles.section} aria-labelledby="pricing-comparison-title">
      <div className={styles.frame}>
        <header className={styles.heading}>
          <span className={styles.sectionDivider} aria-hidden="true" />
          <span className={styles.eyebrow}>Simple monthly pricing</span>
          <Heading id="pricing-comparison-title">Choose how far Miles can take you.</Heading>
          <p aria-live="polite">
            {loading
              ? 'Detecting pricing for your region…'
              : `${region === 'INDIA' ? 'India' : 'International'} pricing selected from your location. Paid prices exclude applicable taxes.`}
          </p>
        </header>

        <p className={styles.scrollHint}>Swipe to compare every plan</p>
        <div
          className={styles.grid}
          role="group"
          aria-label="IrisOS plan comparison. Scroll horizontally to compare plans."
          tabIndex={0}
        >
          <article className={`${styles.card} ${styles.featureCard}`} aria-labelledby="feature-labels-title">
            <div className={`${styles.columnHeader} ${styles.featureHeader}`}>
              <strong id="feature-labels-title">Features</strong>
            </div>
            <div className={styles.rows}>
              <div className={styles.featureName}>Price</div>
              <div className={styles.featureName}>Best for</div>
              {featureRows.map((feature) => (
                <div className={styles.featureName} key={feature.label}>{feature.label}</div>
              ))}
            </div>
            <div className={styles.cardFooter} aria-hidden="true" />
          </article>

          {plans.map((plan, planIndex) => (
            <article
              className={`${styles.card} ${styles.planCard} ${plan.id === 'PRO' ? styles.featured : ''}`}
              key={plan.id}
              id={`plan-${plan.id.toLowerCase()}`}
            >
              <div className={styles.columnHeader}>
                <h3>{plan.name}</h3>
                {plan.id === 'PRO' && <b className={styles.popular}>Popular</b>}
                {plan.id === 'ADVANCED' && <b className={styles.bestValue}>Best value</b>}
              </div>
              <div className={styles.rows}>
                <div className={`${styles.planValue} ${styles.priceValue}`}>
                  <div className={styles.priceBlock}>
                    {plan.listAmount > plan.baseAmount && (
                      <span className={styles.discount}>
                        <del>{formatPlanMoney(plan.listAmount, plan.currency)}</del>
                        <b>50% off early bird offer</b>
                      </span>
                    )}
                    <strong>
                      {plan.baseAmount === 0 ? 'Free' : formatPlanMoney(plan.baseAmount, plan.currency)}
                      {plan.baseAmount > 0 && <small>/mo</small>}
                    </strong>
                  </div>
                </div>
                <div className={`${styles.planValue} ${styles.bestFor}`}>
                  <span>{plan.description}</span>
                </div>
                {featureRows.map((feature) => (
                  <div className={styles.planValue} key={feature.label}>
                    <strong>{feature.values[planIndex]}</strong>
                  </div>
                ))}
              </div>
              <div className={styles.cardFooter}>
                <Link
                  href="/signup"
                  prefetch={false}
                  className={plan.id === 'PRO' ? styles.primaryCta : styles.secondaryCta}
                >
                  {plan.id === 'BASIC' ? 'Start for free' : `Choose ${plan.name}`}
                  <ArrowRight aria-hidden="true" />
                </Link>
              </div>
            </article>
          ))}
        </div>

      </div>
    </section>
  );
}
