import type { Metadata } from 'next';
import { ContactForm } from '@/components/contact/contact-form';
import { IrisMarketingHeader } from '@/components/landing/iris-marketing-header';
import { RECAPTCHA_ENTERPRISE_SITE_KEY } from '@/config/recaptcha';
import styles from './contact.module.css';

export const metadata: Metadata = {
  title: 'Contact IrisOS',
  description: 'Contact the IrisOS team about agency operations, product support, partnerships, sales, or press inquiries.',
  alternates: { canonical: '/contact' },
  openGraph: {
    url: '/contact',
    title: 'Contact IrisOS',
    description: 'Reach the IrisOS team securely or email contact@irisos.app directly.',
  },
};

export default function ContactPage() {
  return <div className={styles.page}>
    <IrisMarketingHeader knownDevice={false} />
    <main className={styles.main}>
      <section className={styles.intro}>
        <span className={styles.eyebrow}>CONTACT / IRISOS</span>
        <h1>Let’s move the work forward.</h1>
        <p>Tell us what you are building, what is getting in the way, or where IrisOS could fit. Your message goes directly to our team.</p>
        <div className={styles.direct}>
          <p>Want to contact us directly? Contact us at <a href="mailto:contact@irisos.app">contact@irisos.app</a></p>
        </div>
      </section>
      <ContactForm siteKey={RECAPTCHA_ENTERPRISE_SITE_KEY} />
    </main>
    <footer className={styles.footer}>© 2026 IrisOS. Secure contact powered by Google reCAPTCHA.</footer>
  </div>;
}
