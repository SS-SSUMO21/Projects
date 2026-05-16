"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";

export default function DashboardPage() {
  const [mailbox, setMailbox] = useState(null);
  const [messages, setMessages] = useState([]);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const hasMailbox = Boolean(mailbox?.login && mailbox?.domain);

  const mailboxLabel = useMemo(() => {
    if (!mailbox?.email) return "No email generated yet.";
    return mailbox.email;
  }, [mailbox]);

  const fetchNewMailbox = async () => {
    setLoading(true);
    setError("");
    setSelectedMessage(null);

    try {
      const response = await fetch(`${apiBaseUrl}/api/new`);
      if (!response.ok) throw new Error("Unable to generate temporary email.");

      const data = await response.json();
      setMailbox(data);
      setMessages([]);
    } catch (_err) {
      setMailbox(null);
      setMessages([]);
      setError(
        "Could not reach backend right now. Start backend server and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const refreshInbox = async () => {
    if (!hasMailbox) return;
    setLoading(true);
    setError("");

    try {
      const { login, domain } = mailbox;
      const response = await fetch(
        `${apiBaseUrl}/api/messages?login=${encodeURIComponent(
          login
        )}&domain=${encodeURIComponent(domain)}`
      );
      if (!response.ok) throw new Error("Unable to load inbox.");

      const data = await response.json();
      setMessages(Array.isArray(data) ? data : []);
    } catch (_err) {
      setMessages([]);
      setError("Could not load inbox messages.");
    } finally {
      setLoading(false);
    }
  };

  const openMessage = async (id) => {
    if (!hasMailbox) return;
    setLoading(true);
    setError("");

    try {
      const { login, domain } = mailbox;
      const response = await fetch(
        `${apiBaseUrl}/api/message?id=${encodeURIComponent(
          id
        )}&login=${encodeURIComponent(login)}&domain=${encodeURIComponent(
          domain
        )}`
      );
      if (!response.ok) throw new Error("Unable to load message.");

      const data = await response.json();
      setSelectedMessage(data);
    } catch (_err) {
      setSelectedMessage(null);
      setError("Could not open this message.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-10 sm:px-10">
      <header className="glass-panel flex flex-wrap items-center justify-between gap-4 p-6">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">
            Temp Email Generator
          </p>
          <h1 className="text-2xl font-bold">Dashboard</h1>
        </div>
        <Link href="/" className="text-sm text-cyan-200 hover:text-white">
          ← Back to Landing
        </Link>
      </header>

      <section className="glass-panel p-6">
        <p className="mb-2 text-sm text-cyan-100/80">Current mailbox</p>
        <p className="mb-4 rounded-lg border border-white/20 bg-slate-950/40 p-3 text-sm">
          {mailboxLabel}
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            className="btn-primary disabled:opacity-50"
            onClick={fetchNewMailbox}
            disabled={loading}
          >
            {loading ? "Working..." : "Generate New Email"}
          </button>
          <button
            className="rounded-full border border-white/30 px-5 py-2 text-sm font-semibold text-cyan-100 transition hover:border-cyan-200 hover:text-white disabled:opacity-50"
            onClick={refreshInbox}
            disabled={!hasMailbox || loading}
          >
            Refresh Inbox
          </button>
        </div>
        {error && <p className="mt-4 text-sm text-rose-300">{error}</p>}
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="glass-panel p-6">
          <h2 className="mb-4 text-lg font-semibold">Inbox</h2>
          {!messages.length ? (
            <p className="text-sm text-cyan-100/80">
              No messages yet. Generate an email, then refresh inbox.
            </p>
          ) : (
            <ul className="space-y-3">
              {messages.map((message) => (
                <li key={message.id}>
                  <button
                    className="w-full rounded-xl border border-white/20 bg-white/10 p-3 text-left text-sm hover:border-cyan-200"
                    onClick={() => openMessage(message.id)}
                  >
                    <p className="font-semibold">{message.subject || "(No subject)"}</p>
                    <p className="text-cyan-100/75">{message.from}</p>
                    <p className="text-xs text-cyan-100/70">{message.date}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="glass-panel p-6">
          <h2 className="mb-4 text-lg font-semibold">Message Viewer</h2>
          {!selectedMessage ? (
            <p className="text-sm text-cyan-100/80">
              Select a message from inbox to view details.
            </p>
          ) : (
            <article className="space-y-2 text-sm">
              <p>
                <span className="font-semibold">Subject:</span>{" "}
                {selectedMessage.subject || "(No subject)"}
              </p>
              <p>
                <span className="font-semibold">From:</span>{" "}
                {selectedMessage.from || "-"}
              </p>
              <p>
                <span className="font-semibold">Date:</span>{" "}
                {selectedMessage.date || "-"}
              </p>
              <hr className="my-3 border-white/20" />
              <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-lg border border-white/20 bg-slate-950/40 p-3 text-cyan-100/90">
                {selectedMessage.textBody ||
                  selectedMessage.htmlBody ||
                  "Message body is empty."}
              </pre>
            </article>
          )}
        </div>
      </section>
    </div>
  );
}

