import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 items-center justify-center px-6 py-10 sm:px-10">
      <main className="glass-panel max-w-5xl px-6 py-12 sm:px-12">
        <section className="grid gap-10 md:grid-cols-2 md:items-center">
          <div className="space-y-6">
            <p className="text-sm uppercase tracking-[0.2em] text-cyan-200">
              Developer Tools • Free
            </p>
            <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
              Instant Temporary Email Inbox for Fast Testing
            </h1>
            <p className="text-cyan-100/85">
              Generate disposable mailboxes in one click and monitor incoming
              messages live. Great for sign-up tests, QA flows, and quick
              verification.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/dashboard" className="btn-primary">
                Open Dashboard
              </Link>
              <a
                href="#features"
                className="rounded-full border border-white/30 px-6 py-3 text-sm font-semibold text-cyan-100 transition hover:border-cyan-200 hover:text-white"
              >
                Explore Features
              </a>
            </div>
          </div>
          <div className="rounded-3xl border border-white/20 bg-white/10 p-6 shadow-2xl backdrop-blur-md">
            <p className="mb-3 text-xs uppercase tracking-[0.2em] text-cyan-200">
              Sample inbox
            </p>
            <p className="mb-4 rounded-lg border border-white/20 bg-slate-950/40 p-3 text-sm">
              yourname@1secmail.com
            </p>
            <ul className="space-y-3 text-sm text-cyan-100/85">
              <li className="rounded-lg border border-white/15 bg-white/5 p-3">
                Verify your account — 2 min ago
              </li>
              <li className="rounded-lg border border-white/15 bg-white/5 p-3">
                Welcome to your test workspace — 7 min ago
              </li>
            </ul>
          </div>
        </section>

        <section id="features" className="mt-14 grid gap-4 sm:grid-cols-3">
          {[
            "One-click random mailbox generation",
            "Inbox refresh with message previews",
            "Detailed message reader on dashboard",
          ].map((item) => (
            <article
              key={item}
              className="rounded-2xl border border-white/20 bg-white/10 p-5 text-sm text-cyan-100/90 backdrop-blur"
            >
              {item}
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
