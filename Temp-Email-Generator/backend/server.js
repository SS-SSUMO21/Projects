const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;
const apiBaseUrl =
  process.env.TEMP_EMAIL_API_BASE || "https://www.1secmail.com/api/v1/";

app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(",").map((item) => item.trim()) || [
      "http://localhost:3000",
      "http://127.0.0.1:3000",
    ],
  })
);
app.use(express.json());

const fetchFromTempMailApi = async (params) => {
  const url = new URL(apiBaseUrl);
  url.search = new URLSearchParams(params).toString();

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Temp email API error: ${response.status}`);
  }

  return response.json();
};

const parseMailbox = async () => {
  const mailboxes = await fetchFromTempMailApi({
    action: "genRandomMailbox",
    count: "1",
  });

  const email = Array.isArray(mailboxes) ? mailboxes[0] : "";
  if (!email || !email.includes("@")) {
    throw new Error("Unable to generate temporary email.");
  }

  const [login, domain] = email.split("@");
  return { email, login, domain };
};

app.get("/api/new", async (_req, res) => {
  try {
    const mailbox = await parseMailbox();
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
    const messages = await fetchFromTempMailApi({
      action: "getMessages",
      login: String(login),
      domain: String(domain),
    });
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

  try {
    const message = await fetchFromTempMailApi({
      action: "readMessage",
      id: String(id),
      login: String(login),
      domain: String(domain),
    });
    return res.json(message);
  } catch (error) {
    return res.status(502).json({
      error: "Failed to fetch message.",
      details: error.message,
    });
  }
});

app.use((error, _req, res, _next) => {
  res.status(500).json({
    error: "Unexpected server error.",
    details: error.message,
  });
});

app.listen(port, () => {
  console.log(`Temp email backend listening on http://localhost:${port}`);
});

