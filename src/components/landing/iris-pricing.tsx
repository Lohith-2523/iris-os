import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Check, CircleDollarSign } from 'lucide-react';
import { formatPlanMoney, pricingCatalog, type PricingRegion } from '@/lib/plan-pricing';
import styles from './iris-landing.module.css';
import pageStyles from './iris-pricing.module.css';

const planCopy = [
  { copy: 'Run the fundamentals of your agency from one system.', items: ['5 clients', '2 team members', 'Core finance and delivery', 'Client management and reporting'], cta: 'Start for free' },
  { copy: 'Add intelligence and secure collaboration.', items: ['15 clients', 'Unlimited team members', 'Atlas AI and meeting workflows', 'Secure messaging'], cta: 'Choose Pro' },
  { copy: 'Let Atlas operate across more of the agency.', items: ['30 clients', 'Unlimited team members', 'Full Atlas actions', 'Strategy Studio and Daily Briefing'], cta: 'Choose Advanced' },
] as const;

export function IrisPricing({ region }: { region: PricingRegion }) {
  const plans = pricingCatalog(region).map((plan, index) => ({ ...plan, ...planCopy[index] }));
  return <main className={`${styles.landing} ${pageStyles.pricingPage}`} id="top">
    <header className={pageStyles.pricingPageNav}><div className={pageStyles.pricingPageNavInner}>
      <Link className={styles.wordmark} href="/" aria-label="Iris OS home"><Image className={styles.brandLogo} src="/iris-logo-white-transparent.svg" alt="" width={28} height={28} priority /><span>IRIS <b>OS</b></span></Link>
      <Link className={styles.primaryButton} href="/signup">Start using Iris <ArrowRight aria-hidden="true" /></Link>
    </div></header>

    <section className={pageStyles.pricingPageHero} aria-labelledby="pricing-title"><div className={pageStyles.pricingPageHeroInner}>
      <div><span className={pageStyles.pricingPageKicker}>Workspace plans</span><h1 id="pricing-title">Choose your operating capacity.</h1></div>
      <div><span className={styles.pricingNote}><CircleDollarSign aria-hidden="true" /> {region === 'INDIA' ? 'India pricing' : 'International pricing'} · monthly</span><p>Pricing is selected from your public IP country. Paid plan prices exclude 18% GST.</p></div>
    </div></section>

    <section className={`${styles.pricingSection} ${pageStyles.pricingPagePlans}`} aria-labelledby="plans-title"><div className={styles.contentWidth}>
      <h2 className={pageStyles.pricingPlansTitle} id="plans-title">Three plans. One operating system.</h2>
      <div className={styles.plans}>{plans.map((plan, index) => <article className={index === 1 ? styles.planFeatured : ''} key={plan.id}>
        <div className={styles.planRail}><span>IRIS / {plan.name.toUpperCase()}</span><i /></div>
        <h3>{formatPlanMoney(plan.baseAmount, plan.currency)}<small>/ month</small></h3>
        <p>{plan.copy}</p>
        {plan.baseAmount > 0 && <p>+ 18% GST · {formatPlanMoney(plan.totalAmount, plan.currency)} due at checkout</p>}
        <ul>{plan.items.map((item) => <li key={item}><Check aria-hidden="true" />{item}</li>)}</ul>
        <Link className={index === 1 ? styles.primaryButton : styles.secondaryButton} href="/signup">{plan.cta}<ArrowRight aria-hidden="true" /></Link>
      </article>)}</div>
    </div></section>

    <footer className={pageStyles.pricingPageFooter}><span>© 2026 Iris OS</span><nav aria-label="Pricing footer navigation"><Link href="/">Product overview</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/login">Log in</Link></nav></footer>
  </main>;
}
