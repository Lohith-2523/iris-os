import Link from 'next/link';
import Image from 'next/image';
import { MarketingHeader } from '@/components/marketing/marketing-header';
import { LEGAL_LINKS } from '@/lib/legal/policies';

export type LegalSection = {
  id: string;
  title: string;
  paragraphs?: string[];
  bullets?: string[];
  note?: string;
  links?: ReadonlyArray<{ label: string; href: string }>;
};

export function LegalPolicyPage({ title, badge, updated, effectiveDate, jurisdiction, introduction, sections, sources = [] }: {
  title: string;
  badge: string;
  updated: string;
  effectiveDate?: string;
  jurisdiction?: string;
  introduction: string | string[];
  sections: LegalSection[];
  sources?: Array<{ label: string; href: string }>;
}) {
  const introductions = Array.isArray(introduction) ? introduction : [introduction];
  return <div className="min-h-screen bg-[#0a0a0a] text-zinc-100">
    <MarketingHeader />
    <main>
      <section className="border-b border-white/5 px-6 pb-16 pt-36 text-center">
        <div className="mx-auto max-w-4xl">
          <span className="inline-flex rounded-full border border-white/10 bg-zinc-900 px-4 py-2 font-mono text-sm font-semibold uppercase tracking-[0.16em] text-zinc-400">{badge}</span>
          <h1 className="mt-7 text-4xl font-bold uppercase tracking-tight sm:text-6xl">{title}</h1>
          <div className="mx-auto mt-6 max-w-3xl space-y-4 text-base leading-7 text-zinc-400">{introductions.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
          <div className="mt-5 flex flex-wrap justify-center gap-x-6 gap-y-2 font-mono text-sm uppercase tracking-[0.12em] text-zinc-500">
            {effectiveDate && <span>Effective date: {effectiveDate}</span>}
            <span>Last updated: {updated}</span>
            {jurisdiction && <span>Governing jurisdiction: {jurisdiction}</span>}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-6 py-12 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="h-fit border border-white/10 bg-zinc-950 p-5 lg:sticky lg:top-28">
          <h2 className="border-b border-white/10 pb-3 text-base font-bold uppercase tracking-wide">Contents</h2>
          <nav aria-label="Policy contents" className="mt-4 flex flex-col gap-3">{sections.map((section, index) => <a key={section.id} href={`#${section.id}`} className="text-base leading-6 text-zinc-400 transition hover:text-white">{index + 1}. {section.title}</a>)}</nav>
        </aside>

        <article className="min-w-0 space-y-6 break-words">{sections.map((section, index) => <section key={section.id} id={section.id} className="scroll-mt-28 border border-white/10 bg-zinc-950 p-6 sm:p-8">
          <h2 className="border-b border-white/10 pb-4 text-xl font-bold">{index + 1}. {section.title}</h2>
          <div className="mt-5 space-y-4 text-base leading-7 text-zinc-400">
            {section.paragraphs?.map((paragraph, paragraphIndex) => <p key={paragraphIndex}>{paragraph}</p>)}
            {section.bullets && <ul className="space-y-3 pl-5">{section.bullets.map((item, itemIndex) => <li key={itemIndex} className="list-disc pl-1">{item}</li>)}</ul>}
            {section.note && <div className="border-l-2 border-zinc-500 bg-zinc-900 px-4 py-3 text-zinc-300">{section.note}</div>}
            {section.links && <ul className="flex flex-wrap gap-x-5 gap-y-2">{section.links.map(link => <li key={link.href}><Link href={link.href} className="text-zinc-300 underline underline-offset-4 hover:text-white">{link.label}</Link></li>)}</ul>}
          </div>
        </section>)}

          {sources.length > 0 && <section className="border border-white/10 bg-zinc-950 p-6 sm:p-8"><h2 className="text-xl font-bold">Provider and regulatory references</h2><p className="mt-3 text-base leading-7 text-zinc-400">These official resources describe provider practices and applicable frameworks. Public documentation does not establish IrisOS account settings or an executed contract.</p><ul className="mt-4 grid gap-3 sm:grid-cols-2">{sources.map(source => <li key={source.href}><a href={source.href} target="_blank" rel="noreferrer" className="text-base text-zinc-300 underline decoration-zinc-700 underline-offset-4 hover:text-white">{source.label}</a></li>)}</ul></section>}
        </article>
      </section>
    </main>

    <footer className="border-t border-white/5 px-6 py-10"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-5"><Image src="/iris-logo-black-bg.png" alt="IrisOS" width={120} height={49} className="h-10 w-auto opacity-70" /><p className="text-sm text-zinc-500">© 2026 IrisOS. All rights reserved.</p><nav aria-label="Legal documents" className="flex flex-wrap gap-5 text-sm text-zinc-400">{LEGAL_LINKS.map(link => <Link key={link.href} href={link.href} className="hover:text-white">{link.label}</Link>)}</nav></div></footer>
  </div>;
}
