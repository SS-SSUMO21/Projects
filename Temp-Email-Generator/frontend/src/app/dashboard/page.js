"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

const resolveApiBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_API_BASE_URL) {
    return process.env.NEXT_PUBLIC_API_BASE_URL;
  }
  if (typeof window !== "undefined" && window.location.hostname === "localhost") {
    return "http://localhost:5000";
  }
  return "/.netlify/functions";
};

const apiBaseUrl = resolveApiBaseUrl();
const apiPrefix = apiBaseUrl.includes("/.netlify/functions") ? "" : "/api";
const asArray = (value) => (Array.isArray(value) ? value : []);
const STORAGE_KEY = "temp-email-dashboard-state";
const LOCAL_MESSAGE_ID = "local-welcome";

const createLocalWelcomeMessage = (email) => ({
  id: LOCAL_MESSAGE_ID,
  subject: "Welcome to your Blacksipher inbox",
  from: "Blacksipher Team",
  date: new Date().toISOString(),
  isLocal: true,
  textBody: `Dear Valued User,\n\nThank you for choosing Blacksipher, your temporary email address friend and spam fighter's ally.\n\nYour disposable email address has been created and is ready for use.\n\nEmail: ${email || ""}\n\nTips & Notes:\n\n- Waiting for your mail? There is no need to refresh the page. New emails will be added to the list as they come in.\n\n- All emails are deleted after 1 hour.\n\nThanks,\n\nBlacksipher Team`.trim(),
});

const isGuerrillaWelcome = (message) => {
  const subject = String(message?.subject || "").toLowerCase();
  const from = String(message?.from || "").toLowerCase();
  return subject.includes("welcome to guerrilla mail") ||
    from.includes("guerrillamail.com");
};

const ensureLocalWelcome = (messages, email) => {
  if (!email) return messages;
  const updated = messages.map((message) => {
    if (!message.isLocal) return message;
    return createLocalWelcomeMessage(email);
  });
  const hasLocal = updated.some((message) => message.isLocal);
  if (hasLocal) return updated;
  return [createLocalWelcomeMessage(email), ...updated];
};

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
  const hasHydratedRef = useRef(false);

  const requiresToken = apiBaseUrl.includes("/.netlify/functions");
  const hasMailbox = Boolean(
    mailbox?.login && mailbox?.domain && (!requiresToken || mailbox?.token)
  );

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
      const response = await fetch(`${apiBaseUrl}${apiPrefix}/new`);
      if (!response.ok) throw new Error("Unable to generate temporary email.");

      const data = await response.json();
      const welcomeMessage = createLocalWelcomeMessage(data?.email);
      setMailbox(data);
      setMessages([welcomeMessage]);
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
        `${apiBaseUrl}${apiPrefix}/messages?login=${encodeURIComponent(
          login
        )}&domain=${encodeURIComponent(domain)}&sid_token=${encodeURIComponent(
          mailbox?.token || ""
        )}`
      );
      if (!response.ok) throw new Error("Unable to load inbox.");

      const data = await response.json();
      const apiMessages = asArray(data).filter(
        (message) => !isGuerrillaWelcome(message)
      );
      setMessages((prev) => {
        const baseMessages = ensureLocalWelcome(prev.filter((message) => message.isLocal), mailbox?.email);
        const dedupedApi = apiMessages.filter(
          (message) => !baseMessages.some((local) => local.id === message.id)
        );
        return [...baseMessages, ...dedupedApi];
      });
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
    const localMessage = messages.find((message) => message.id === id && message.isLocal);
    if (localMessage) {
      setSelectedMessage({
        id: localMessage.id,
        subject: localMessage.subject,
        from: localMessage.from,
        date: localMessage.date,
        textBody: localMessage.textBody,
        htmlBody: "",
      });
      return;
    }
    setLoading(true);
    setError("");
    setCopyStatus("");

    try {
      const { login, domain } = mailbox;
      const response = await fetch(
        `${apiBaseUrl}${apiPrefix}/message?id=${encodeURIComponent(
          id
        )}&login=${encodeURIComponent(login)}&domain=${encodeURIComponent(
          domain
        )}&sid_token=${encodeURIComponent(mailbox?.token || "")}`
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

    if (typeof window === "undefined") return;

    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      hasHydratedRef.current = true;
      return;
    }

    try {
      const parsed = JSON.parse(stored);
      if (parsed?.mailbox) setMailbox(parsed.mailbox);
      if (Array.isArray(parsed?.messages)) {
        const nextMessages = ensureLocalWelcome(
          parsed.messages,
          parsed?.mailbox?.email
        );
        setMessages(nextMessages);
      }
      if (parsed?.selectedMessage) setSelectedMessage(parsed.selectedMessage);
      if (parsed?.lastRefreshAt) {
        const parsedDate = new Date(parsed.lastRefreshAt);
        if (!Number.isNaN(parsedDate.getTime())) {
          setLastRefreshAt(parsedDate);
        }
      }
    } catch (_err) {
      // Ignore invalid cached state.
    }

    hasHydratedRef.current = true;
  }, []);

  useEffect(() => {
    if (!hasHydratedRef.current || typeof window === "undefined") return;
    const payload = {
      mailbox,
      messages,
      selectedMessage,
      lastRefreshAt: lastRefreshAt?.toISOString?.() || null,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [lastRefreshAt, mailbox, messages, selectedMessage]);

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

  function parseApiDate(value) {
    if (!value) return null;
    const trimmed = String(value).trim();

    const dateTimeMatch = trimmed.match(
      /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/
    );
    if (dateTimeMatch) {
      const iso = `${dateTimeMatch[1]}-${dateTimeMatch[2]}-${dateTimeMatch[3]}T${dateTimeMatch[4]}:${dateTimeMatch[5]}:${dateTimeMatch[6]}Z`;
      const parsed = new Date(iso);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    const timeOnlyMatch = trimmed.match(/^(\d{2}):(\d{2}):(\d{2})$/);
    if (timeOnlyMatch) {
      const todayIso = new Date().toISOString().slice(0, 10);
      const iso = `${todayIso}T${timeOnlyMatch[1]}:${timeOnlyMatch[2]}:${timeOnlyMatch[3]}Z`;
      const parsed = new Date(iso);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  function formatTime(value) {
    if (!value) return "";
    const parsed = parseApiDate(value);
    if (!parsed) return String(value);
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Toronto",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
      .format(parsed)
      .replace(/\./g, "");
  }

  function formatDate(value) {
    if (!value) return "";
    const parsed = parseApiDate(value);
    if (!parsed) return value;
    const datePart = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Toronto",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(parsed);
    return `${datePart} ${formatTime(parsed)}`.trim();
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
          <p className="text-xs uppercase tracking-[0.2em] text-accent">
            Temp Email Generator
          </p>
          <h1 className="text-2xl font-bold">Dashboard</h1>
        </div>
      </header>

      <section className="glass-panel p-6">
        <p className="mb-2 text-sm text-muted">Current mailbox</p>
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg p-3 text-sm surface-panel">
          <span className="break-all">{mailboxLabel}</span>
          <button
            className="btn-outline rounded-full px-3 py-1 text-xs font-semibold transition disabled:opacity-50"
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
            className="btn-outline rounded-full px-5 py-2 text-sm font-semibold transition disabled:opacity-50"
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
          <p className="mb-3 text-xs uppercase tracking-[0.2em] text-accent-muted">
            {inboxStatus}
          </p>
          {!messages.length ? (
            <p className="text-sm text-muted">
              Generate an email and send a message to it from another mailbox.
            </p>
          ) : (
            <ul className="space-y-3">
              {messages.map((message) => (
                <li key={message.id}>
                  <button
                    className="surface-card w-full rounded-xl p-3 text-left text-sm transition hover:opacity-90"
                    onClick={() => openMessage(message.id)}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold">
                        {message.subject || "(No subject)"}
                      </p>
                      <p className="text-xs text-muted">
                        {formatTime(message.date)}
                      </p>
                    </div>
                    <p className="mt-1 text-muted">
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
            <p className="text-sm text-muted">
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
              <div className="surface-panel max-h-80 overflow-auto whitespace-pre-wrap rounded-lg p-3 text-muted-strong">
                {messageBody || "Message body is empty."}
              </div>
            </article>
          )}
        </div>
      </section>
    </div>
  );
}
