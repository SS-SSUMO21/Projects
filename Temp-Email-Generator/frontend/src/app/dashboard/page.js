"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";
const asArray = (value) => (Array.isArray(value) ? value : []);

export default function DashboardPage() {
  const [mailbox, setMailbox] = useState(null);
  const [messages, setMessages] = useState([]);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [error, setError] = useState("");
  const [lastRefreshAt, setLastRefreshAt] = useState(null);
  const [copyStatus, setCopyStatus] = useState("");

  const hasMailbox = Boolean(mailbox?.login && mailbox?.domain);

  const mailboxLabel = useMemo(() => {
    if (!mailbox?.email) return "No email generated yet.";
    return mailbox.email;
  }, [mailbox]);

  const fetchNewMailbox = async () => {
    setLoading(true);
    setError("");
    setSelectedMessage(null);
    setCopyStatus("");

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

  const refreshInbox = async ({ silent = false } = {}) => {
    if (!hasMailbox) return;
    if (!silent) setLoading(true);
    setIsRefreshing(true);
    setError("");
    setCopyStatus("");

    try {
      const { login, domain } = mailbox;
      const response = await fetch(
        `${apiBaseUrl}/api/messages?login=${encodeURIComponent(
          login
        )}&domain=${encodeURIComponent(domain)}`
      );
      if (!response.ok) throw new Error("Unable to load inbox.");

      const data = await response.json();
      setMessages(asArray(data));
      setLastRefreshAt(new Date());
    } catch (_err) {
      setMessages([]);
      setError("Could not load inbox messages.");
    } finally {
      if (!silent) setLoading(false);
      setIsRefreshing(false);
    }
  };

  const openMessage = async (id) => {
    if (!hasMailbox) return;
    setLoading(true);
    setError("");
    setCopyStatus("");

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

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!hasMailbox) return undefined;

    refreshInbox({ silent: true });
    const intervalId = setInterval(() => {
      refreshInbox({ silent: true });
    }, 12000);

    return () => clearInterval(intervalId);
  }, [hasMailbox, mailbox?.login, mailbox?.domain]);

  const inboxStatus = useMemo(() => {
    if (!hasMailbox) {
      return "Generate an email to start checking inbox.";
    }
    if (!messages.length && isRefreshing) {
      return "Checking inbox for new messages...";
    }
    if (!messages.length) {
      return "No messages yet. We will auto-refresh every 12s.";
    }
    if (lastRefreshAt) {
      return `Last checked at ${formatTime(lastRefreshAt)}. Auto-refresh every 12s.`;
    }
    return "Auto-refresh every 12s.";
  }, [hasMailbox, isRefreshing, lastRefreshAt, messages.length]);

  const canRefresh = isMounted && hasMailbox && !loading;

  function formatTime(value) {
    if (!value) return "";
    const timeOnlyMatch = String(value).trim().match(/^(\d{2}):(\d{2}):(\d{2})$/);
    if (timeOnlyMatch) {
      const [, hoursRaw, minutesRaw, secondsRaw] = timeOnlyMatch;
      const hours = Number(hoursRaw);
      const minutes = Number(minutesRaw);
      const seconds = Number(secondsRaw);
      if ([hours, minutes, seconds].every((part) => Number.isFinite(part))) {
        const period = hours >= 12 ? "PM" : "AM";
        const normalizedHours = ((hours + 11) % 12) + 1;
        return `${normalizedHours}:${String(minutes).padStart(2, "0")} ${period}`;
      }
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Toronto",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    }).format(parsed);
  }

  function formatDate(value) {
    if (!value) return "";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Toronto",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    }).format(parsed);
  }

  const copyMailbox = async () => {
    if (!mailbox?.email) return;
    try {
      await navigator.clipboard.writeText(mailbox.email);
      setCopyStatus("Copied.");
      setTimeout(() => setCopyStatus(""), 1500);
    } catch (_err) {
      setCopyStatus("Copy failed.");
    }
  };

  const toPlainText = (value) => {
    if (!value) return "";
    if (typeof window !== "undefined" && window.DOMParser) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(String(value), "text/html");
      doc.querySelectorAll("br").forEach((node) => {
        node.replaceWith("\n");
      });
      doc.querySelectorAll("p, div, li").forEach((node) => {
        node.appendChild(doc.createTextNode("\n"));
      });
      return doc.body.textContent || "";
    }
    return String(value).replace(/<[^>]*>/g, " ");
  };

  const messageBody = useMemo(() => {
    if (!selectedMessage) return "";
    const text = selectedMessage.textBody?.trim();
    const raw = text
      ? text.includes("<")
        ? toPlainText(text)
        : text
      : toPlainText(selectedMessage.htmlBody);

    return raw
      .split("\n")
      .map((line) => line.replace(/\s+$/g, ""))
      .map((line) => line.replace(/^\s+/g, ""))
      .reduce((acc, line) => {
        const last = acc[acc.length - 1];
        if (!line && !last) return acc;
        acc.push(line);
        return acc;
      }, [])
      .join("\n")
      .trim();
  }, [selectedMessage]);


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
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-white/20 bg-slate-950/40 p-3 text-sm">
          <span className="break-all">{mailboxLabel}</span>
          <button
            className="rounded-full border border-white/30 px-3 py-1 text-xs font-semibold text-cyan-100 transition hover:border-cyan-200 hover:text-white disabled:opacity-50"
            onClick={copyMailbox}
            disabled={!mailbox?.email}
            aria-label="Copy email address"
            title="Copy email address"
          >
            <span className="flex items-center gap-1">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <path d="M5 15V5a2 2 0 0 1 2-2h10" />
              </svg>
              Copy
            </span>
          </button>
          {copyStatus && <span className="text-xs text-emerald-200">{copyStatus}</span>}
        </div>
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
            disabled={!canRefresh}
          >
            {isRefreshing ? "Refreshing..." : "Refresh Inbox"}
          </button>
        </div>
        {error && <p className="mt-4 text-sm text-rose-300">{error}</p>}
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="glass-panel p-6">
          <h2 className="mb-4 text-lg font-semibold">Inbox</h2>
          <p className="mb-3 text-xs uppercase tracking-[0.2em] text-cyan-200/80">
            {inboxStatus}
          </p>
          {!messages.length ? (
            <p className="text-sm text-cyan-100/80">
              Generate an email and send a message to it from another mailbox.
            </p>
          ) : (
            <ul className="space-y-3">
              {messages.map((message) => (
                <li key={message.id}>
                  <button
                    className="w-full rounded-xl border border-white/20 bg-white/10 p-3 text-left text-sm hover:border-cyan-200"
                    onClick={() => openMessage(message.id)}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold">
                        {message.subject || "(No subject)"}
                      </p>
                      <p className="text-xs text-cyan-100/70">
                        {formatTime(message.date)}
                      </p>
                    </div>
                    <p className="mt-1 text-cyan-100/75">
                      {message.from || "Unknown sender"}
                    </p>
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
                {formatDate(selectedMessage.date) || "-"}
              </p>
              <hr className="my-3 border-white/20" />
              <div className="max-h-80 overflow-auto whitespace-pre-wrap rounded-lg border border-white/20 bg-slate-950/40 p-3 text-cyan-100/90">
                {messageBody || "Message body is empty."}
              </div>
            </article>
          )}
        </div>
      </section>
    </div>
  );
}
