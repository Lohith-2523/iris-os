import type { Metadata } from 'next';
import Image from 'next/image';
import { ContactForm } from '@/components/contact/contact-form';
import { IrisMarketingHeader } from '@/components/landing/iris-marketing-header';
import { RECAPTCHA_ENTERPRISE_SITE_KEY } from '@/config/recaptcha';
import instagramIcon from '../../../instagram.png';
import discordIcon from '../../../discord.png';
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
          <p className={styles.socialPrompt}>Also reach out to us at</p>
          <div className={styles.socials} aria-label="IrisOS social media">
            {[
              { label: 'Instagram', href: 'https://www.instagram.com/irisos.app/', icon: instagramIcon },
              { label: 'Discord', href: 'https://discord.gg/payRxxz49m', icon: discordIcon },
            ].map(item => <a key={item.label} href={item.href} target="_blank" rel="noreferrer">
              <Image src={item.icon} alt="" width={18} height={18} />
              <span>{item.label}</span>
            </a>)}
          </div>
        </div>
      </section>
      <ContactForm siteKey={RECAPTCHA_ENTERPRISE_SITE_KEY} />
    </main>
    <footer className={styles.footer}>© 2026 IrisOS. Secure contact powered by Google reCAPTCHA.</footer>
  </div>;
}
