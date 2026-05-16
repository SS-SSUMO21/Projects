const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;
const apiBaseUrl = process.env.TEMP_EMAIL_API_BASE || "https://api.mail.tm";

app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(",").map((item) => item.trim()) || [
      "http://localhost:3000",
      "http://127.0.0.1:3000",
    ],
  })
);
app.use(express.json());

const mailboxStore = new Map();

const fetchJson = async (url, options = {}) => {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message = data?.message || data?.detail || response.statusText;
    throw new Error(`Temp email API error: ${response.status} ${message}`);
  }

  return data;
};

const getDomain = async () => {
  const url = new URL("/domains", apiBaseUrl);
  const domains = await fetchJson(url);
  const list = domains?.["hydra:member"] || domains?.items || [];
  const first = list[0];
  const domain = first?.domain || first?.name || first;

  if (!domain) {
    throw new Error("Unable to fetch a temp email domain.");
  }

  return domain;
};

const generateRandomLogin = () =>
  `user${Math.random().toString(36).slice(2, 10)}`;

const generatePassword = () =>
  `P@ss-${Math.random().toString(36).slice(2, 10)}`;

const createMailbox = async () => {
  const domain = await getDomain();

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const login = generateRandomLogin();
    const address = `${login}@${domain}`;
    const password = generatePassword();

    try {
      await fetchJson(new URL("/accounts", apiBaseUrl), {
        method: "POST",
        body: JSON.stringify({ address, password }),
      });

      const tokenResponse = await fetchJson(new URL("/token", apiBaseUrl), {
        method: "POST",
        body: JSON.stringify({ address, password }),
      });

      const token = tokenResponse?.token || tokenResponse?.access_token;
      if (!token) {
        throw new Error("Temp email API did not return an access token.");
      }

      const mailbox = { email: address, login, domain };
      mailboxStore.set(address, { address, login, domain, password, token });
      return mailbox;
    } catch (error) {
      if (attempt === 2) {
        throw error;
      }
    }
  }

  throw new Error("Unable to generate temporary email.");
};

const getMailboxRecord = (login, domain) => {
  const address = `${login}@${domain}`;
  return mailboxStore.get(address);
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

  const mailbox = getMailboxRecord(String(login), String(domain));
  if (!mailbox) {
    return res.status(400).json({
      error: "Unknown mailbox. Generate a new address first.",
    });
  }

  try {
    const messagesResponse = await fetchJson(
      new URL("/messages", apiBaseUrl),
      {
        headers: { Authorization: `Bearer ${mailbox.token}` },
      }
    );

    const messages =
      messagesResponse?.["hydra:member"] || messagesResponse?.items || [];

    return res.json(Array.isArray(messages) ? messages : []);
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

  const mailbox = getMailboxRecord(String(login), String(domain));
  if (!mailbox) {
    return res.status(400).json({
      error: "Unknown mailbox. Generate a new address first.",
    });
  }

  try {
    const message = await fetchJson(
      new URL(`/messages/${encodeURIComponent(String(id))}`, apiBaseUrl),
      {
        headers: { Authorization: `Bearer ${mailbox.token}` },
      }
    );
    return res.json(message);
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
