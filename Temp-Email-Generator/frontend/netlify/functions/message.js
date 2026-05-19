const apiBaseUrl =
  process.env.TEMP_EMAIL_API_BASE || "https://api.guerrillamail.com/ajax.php";

const requestGuerrillaMail = async (params) => {
  const url = new URL(apiBaseUrl);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
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

exports.handler = async (event) => {
  try {
    const params = event.queryStringParameters || {};
    const id = params.id;
    const login = params.login;
    const domain = params.domain;
    const token = params.sid_token || params.token;

    if (!id || !login || !domain || !token) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: "id, login, domain, and sid_token query params are required.",
        }),
      };
    }

    const message = await requestGuerrillaMail({
      f: "fetch_email",
      email_id: String(id),
      sid_token: token,
    });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: message.id,
        subject: message?.mail_subject || "",
        from: message?.mail_from || "",
        date: message?.mail_date || "",
        textBody: message?.mail_body || "",
        htmlBody: message?.mail_body_html || "",
      }),
    };
  } catch (error) {
    return {
      statusCode: 502,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "Failed to fetch message.",
        details: error.message,
      }),
    };
  }
};
