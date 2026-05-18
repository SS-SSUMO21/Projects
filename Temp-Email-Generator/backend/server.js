const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;
const apiBaseUrl =
  process.env.TEMP_EMAIL_API_BASE || "https://api.guerrillamail.com/ajax.php";
const resendApiKey = process.env.RESEND_API_KEY?.trim();
const resendFrom = process.env.RESEND_FROM?.trim();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(",").map((item) => item.trim()) || [
      "http://localhost:3000",
      "http://127.0.0.1:3000",
    ],
  })
);
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({
    status: "ok",
    message: "Temp email backend is running.",
  });
});

const mailboxStore = new Map();

const requestGuerrillaMail = async (params) => {
  const url = new URL(apiBaseUrl);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value));
    }
  });

  const response = await fetch(url, { method: "GET" });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(
      `GuerrillaMail API error: ${response.status} ${details || ""}`.trim()
    );
  }

  return response.json();
};

const createMailbox = async () => {
  const data = await requestGuerrillaMail({ f: "get_email_address" });
  const email = data?.email_addr;
  const sidToken = data?.sid_token;

  if (!email || !sidToken) {
    const payload = JSON.stringify(data);
    throw new Error(`Unable to generate temporary email. Response: ${payload}`);
  }

  const [login, domain] = email.split("@");
  mailboxStore.set(email, {
    token: sidToken,
    createdAt: new Date().toISOString(),
  });

  return { email, login, domain };
};

const getMailboxToken = (login, domain) => {
  const address = `${login}@${domain}`;
  return mailboxStore.get(address)?.token;
};

const sendTestEmail = async (to) => {
  if (!resendApiKey) {
    throw new Error("Missing RESEND_API_KEY.");
  }
  if (!resendFrom) {
    throw new Error("Missing RESEND_FROM.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: resendFrom,
      to: [to],
      subject: "Temp inbox test message",
      text: "This is a test message from your Temp Email Generator.",
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(
      `Resend API error: ${response.status} ${details || ""}`.trim()
    );
  }

  return response.json();
};

app.get("/api/new", async (_req, res) => {
  try {
    const mailbox = await createMailbox();
    res.json(mailbox);
  } catch (error) {
    res.status(502).json({
      error: "Failed to generate temporary email.",
      details: error.message,
    });
  }
});

app.get("/api/messages", async (req, res) => {
  const { login, domain } = req.query;

  if (!login || !domain) {
    return res
      .status(400)
      .json({ error: "Both login and domain query params are required." });
  }

  try {
    console.log(`[messages] request login=${login} domain=${domain}`);
    const token = getMailboxToken(String(login), String(domain));
    if (!token) {
      return res.status(404).json({
        error: "Mailbox token not found. Generate a new email first.",
      });
    }

    const data = await requestGuerrillaMail({
      f: "get_email_list",
      offset: 0,
      sid_token: token,
    });
    const messages = Array.isArray(data?.list) ? data.list : [];

    const normalized = messages.map((message) => ({
      id: message.mail_id,
      subject: message.mail_subject || "",
      from: message.mail_from || "",
      date: message.mail_date || "",
    }));

    console.log(`[messages] fetched ${normalized.length} items`);
    return res.json(normalized);
  } catch (error) {
    return res.status(502).json({
      error: "Failed to fetch inbox messages.",
      details: error.message,
    });
  }
});

app.get("/api/diagnostic", async (req, res) => {
  const { login, domain } = req.query;

  if (!login || !domain) {
    return res.status(400).json({
      error: "login and domain query params are required.",
    });
  }

  const token = getMailboxToken(String(login), String(domain));
  if (!token) {
    return res.status(404).json({
      error: "Mailbox token not found. Generate a new email first.",
      apiBaseUrl,
      tokenPresent: false,
    });
  }

  try {
    const data = await requestGuerrillaMail({
      f: "get_email_list",
      offset: 0,
      sid_token: token,
    });
    const messages = Array.isArray(data?.list) ? data.list : [];

    return res.json({
      apiBaseUrl,
      tokenPresent: true,
      messageCount: messages.length,
    });
  } catch (error) {
    return res.status(502).json({
      error: "Diagnostic check failed.",
      details: error.message,
      apiBaseUrl,
      tokenPresent: true,
    });
  }
});

app.post("/api/send-test", async (req, res) => {
  const { login, domain } = req.body || {};

  if (!login || !domain) {
    return res.status(400).json({
      error: "login and domain are required in request body.",
    });
  }

  const token = getMailboxToken(String(login), String(domain));
  if (!token) {
    return res.status(404).json({
      error: "Mailbox token not found. Generate a new email first.",
    });
  }

  const toAddress = `${login}@${domain}`;

  try {
    const data = await sendTestEmail(toAddress);
    return res.json({
      status: "sent",
      to: toAddress,
      providerResponse: data,
    });
  } catch (error) {
    return res.status(502).json({
      error: "Failed to send test email.",
      details: error.message,
    });
  }
});

app.get("/api/message", async (req, res) => {
  const { id, login, domain } = req.query;

  if (!id || !login || !domain) {
    return res.status(400).json({
      error: "id, login, and domain query params are required.",
    });
  }

  try {
    const token = getMailboxToken(String(login), String(domain));
    if (!token) {
      return res.status(404).json({
        error: "Mailbox token not found. Generate a new email first.",
      });
    }

    const message = await requestGuerrillaMail({
      f: "fetch_email",
      email_id: String(id),
      sid_token: token,
    });
    const htmlBody = message?.mail_body_html || "";

    return res.json({
      id: message.id,
      subject: message?.mail_subject || "",
      from: message?.mail_from || "",
      date: message?.mail_date || "",
      textBody: message?.mail_body || "",
      htmlBody,
    });
  } catch (error) {
    return res.status(502).json({
      error: "Failed to fetch message.",
      details: error.message,
    });
  }
});

app.listen(port, () => {
  console.log(`Temp email backend listening on http://localhost:${port}`);
  console.log(`Temp email API base: ${apiBaseUrl}`);
});
