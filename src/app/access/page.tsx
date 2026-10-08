import Link from 'next/link';

export default async function AccessPage({ searchParams }: { searchParams: Promise<{ token?: string; error?: string }> }) {
  const { token, error } = await searchParams;
  const validShape = typeof token === 'string' && token.length >= 32 && token.length <= 256;
  return <main className="grid min-h-svh place-items-center bg-zinc-950 p-6 text-zinc-100">
    <section className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.04] p-8 text-center shadow-2xl">
      <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">IrisOS secure access</p>
      <h1 className="mt-3 text-2xl font-bold">Confirm this device</h1>
      {error === 'invalid' || !validShape ? <>
        <p className="mt-4 text-sm leading-6 text-zinc-400">This access link is invalid, expired, or has already been used.</p>
        <Link href="/login" className="mt-6 inline-flex rounded-xl bg-white px-5 py-3 text-sm font-bold text-zinc-950">Continue to login</Link>
      </> : <>
        <p className="mt-4 text-sm leading-6 text-zinc-400">Continue to authorize this browser to open the IrisOS signup or login page. You will still need your account credentials.</p>
        <form action="/api/auth/access-activate" method="post" className="mt-6">
          <input type="hidden" name="token" value={token} />
          <button type="submit" className="w-full rounded-xl bg-white px-5 py-3 text-sm font-bold text-zinc-950">Continue to IrisOS</button>
        </form>
      </>}
    </section>
  </main>;
}
