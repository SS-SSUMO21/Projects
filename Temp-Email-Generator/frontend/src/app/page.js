import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 items-center justify-center px-6 py-10 sm:px-10">
      <main className="glass-panel max-w-5xl px-6 py-12 sm:px-12">
        <section className="grid gap-10 md:grid-cols-2 md:items-center">
          <div className="space-y-6">
            <p className="text-sm uppercase tracking-[0.2em] text-accent">
              Developer Tools • Free
            </p>
            <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
              Instant Temporary Email Inbox for Fast Testing
            </h1>
            <p className="text-muted-strong">
              Generate disposable mailboxes in one click and monitor incoming
              messages live. Great for sign-up tests, QA flows, and quick
              verification.
            </p>
            <p className="text-sm text-muted">
              Temporary inboxes expire after about 1 hour of inactivity. Save anything
              important before it disappears.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/dashboard" className="btn-primary">
                Open Dashboard
              </Link>
            </div>
          </div>
          <div className="rounded-3xl p-6 shadow-2xl backdrop-blur-md surface-panel">
            <p className="mb-3 text-xs uppercase tracking-[0.2em] text-accent">
              Sample inbox
            </p>
            <p className="mb-4 rounded-lg p-3 text-sm surface-panel">
              user12345@guerrillamail.com
            </p>
            <ul className="space-y-3 text-sm text-muted-strong">
              <li className="rounded-lg p-3 surface-card">
                Verify your account — 2 min ago
              </li>
              <li className="rounded-lg p-3 surface-card">
                Welcome to Guerrilla Mail — 7 min ago
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
              className="rounded-2xl p-5 text-sm text-muted-strong backdrop-blur surface-card"
            >
              {item}
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
