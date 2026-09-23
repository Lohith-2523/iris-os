'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';

const BODY = 'var(--font-geist-sans), sans-serif';

export function MarketingHeader() {
  const [scrolled, setScrolled] = React.useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  React.useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    handler();
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-[100] px-6 py-4">
        <div
          className="mx-auto flex max-w-[1200px] items-center justify-between rounded-[60px] py-3 pl-4 pr-5 transition-[background,box-shadow] duration-300"
          style={{
            background: scrolled ? '#111111' : 'rgba(17,17,17,0.6)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            boxShadow: scrolled
              ? '8px 8px 18px #040404, -8px -8px 18px #1e1e1e, 0 0 0 1px rgba(255,255,255,0.05)'
              : '0 0 0 1px rgba(255,255,255,0.05)',
          }}
        >
          <Link href="/" prefetch={false} className="flex items-center no-underline">
            <Image
              src="/iris-logo-black-bg.png"
              alt="IrisOS"
              width={95}
              height={36}
              priority
              className="block h-9 w-auto object-contain"
            />
          </Link>

          <nav className="hidden gap-1 md:flex" style={{ fontFamily: BODY }}>
            {[
              { href: '/#about', label: 'About' },
              { href: '/#features', label: 'Features' },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                className="rounded-full px-[18px] py-2 text-sm font-medium text-white/60 no-underline transition-colors hover:bg-white/[0.06] hover:text-[#e8e8e8]"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <Link
            href="/waitlist"
            prefetch={false}
            className="neo-button-accent hidden px-[22px] py-2.5 text-[13px] font-semibold text-[#0a0a0a] no-underline md:block"
            style={{ fontFamily: BODY }}
          >
            Join the Waitlist
          </Link>

          <button
            type="button"
            aria-label={mobileMenuOpen ? 'Close navigation' : 'Open navigation'}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="p-2 text-white hover:text-gray-300 md:hidden"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </header>

      {mobileMenuOpen && (
        <div
          className="neo-raised fixed left-6 right-6 top-[90px] z-40 flex flex-col gap-4 bg-[rgba(17,17,17,0.95)] p-6 backdrop-blur-xl md:hidden"
          style={{ boxShadow: '10px 10px 24px #040404, -10px -10px 24px #1e1e1e, 0 0 0 1px rgba(255,255,255,0.08)' }}
        >
          <nav className="flex flex-col gap-3" style={{ fontFamily: BODY }}>
            {[
              { href: '/#about', label: 'About' },
              { href: '/#features', label: 'Features' },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-xl px-4 py-2.5 text-[15px] text-white/80 no-underline hover:bg-white/[0.06]"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <Link
            href="/waitlist"
            prefetch={false}
            onClick={() => setMobileMenuOpen(false)}
            className="neo-button-accent mt-2 p-3 text-center text-sm font-semibold text-[#0a0a0a] no-underline"
            style={{ fontFamily: BODY }}
          >
            Join the Waitlist
          </Link>
        </div>
      )}
    </>
  );
}
