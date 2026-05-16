const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;
const apiBaseUrl =
  process.env.TEMP_EMAIL_API_BASE || "https://api.mail.tm";

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

const requestMailTm = async (path, { method = "GET", token, body } = {}) => {
  const url = new URL(path, apiBaseUrl);
  const headers = { Accept: "application/json" };
  if (body) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(
      `Mail.tm API error: ${response.status} ${details || ""}`.trim()
    );
  }

  return response.json();
};

const getDomain = async () => {
  const preferredDomain = process.env.TEMP_EMAIL_DOMAIN?.trim();
  if (preferredDomain) {
    return preferredDomain;
  }

  const data = await requestMailTm("/domains");
  const members =
    (Array.isArray(data["hydra:member"]) && data["hydra:member"]) ||
    (Array.isArray(data.member) && data.member) ||
    [];
  const domain = members[0]?.domain;
  if (!domain) {
    const payload = JSON.stringify(data);
    throw new Error(`No mail.tm domains available. Response: ${payload}`);
  }

  return domain;
};

const createMailbox = async () => {
  const domain = await getDomain();

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const login = `user${crypto.randomBytes(6).toString("hex")}`;
    const address = `${login}@${domain}`;
    const password = crypto.randomBytes(12).toString("hex");

    try {
      const account = await requestMailTm("/accounts", {
        method: "POST",
        body: { address, password },
      });
      const tokenData = await requestMailTm("/token", {
        method: "POST",
        body: { address, password },
      });

      if (!tokenData?.token) {
        throw new Error("Missing auth token for mailbox.");
      }

      mailboxStore.set(address, {
        token: tokenData.token,
        accountId: account?.id,
        createdAt: new Date().toISOString(),
      });

      return { email: address, login, domain };
    } catch (error) {
      if (attempt === 2) throw error;
    }
  }

  throw new Error("Unable to generate temporary email.");
};

const getMailboxToken = (login, domain) => {
  const address = `${login}@${domain}`;
  return mailboxStore.get(address)?.token;
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
    const token = getMailboxToken(String(login), String(domain));
    if (!token) {
      return res.status(404).json({
        error: "Mailbox token not found. Generate a new email first.",
      });
    }

    const data = await requestMailTm("/messages", { token });
    const messages = Array.isArray(data["hydra:member"])
      ? data["hydra:member"]
      : [];

    const normalized = messages.map((message) => ({
      id: message.id,
      subject: message.subject || "",
      from: message.from?.address || message.from?.name || "",
      date: message.createdAt || "",
    }));

    return res.json(normalized);
  } catch (error) {
    return res.status(502).json({
      error: "Failed to fetch inbox messages.",
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

    const message = await requestMailTm(`/messages/${String(id)}`, { token });
    const htmlBody = Array.isArray(message.html)
      ? message.html.join("\n")
      : message.html || "";

    return res.json({
      id: message.id,
      subject: message.subject || "",
      from: message.from?.address || message.from?.name || "",
      date: message.createdAt || "",
      textBody: message.text || "",
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
});
