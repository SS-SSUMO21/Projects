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

exports.handler = async () => {
  try {
    const data = await requestGuerrillaMail({ f: "get_email_address" });
    const email = data?.email_addr;
    const sidToken = data?.sid_token;

    if (!email || !sidToken) {
      const payload = JSON.stringify(data);
      return {
        statusCode: 502,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: "Failed to generate temporary email.",
          details: `Invalid response: ${payload}`,
        }),
      };
    }

    const [login, domain] = email.split("@");
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, login, domain, token: sidToken }),
    };
  } catch (error) {
    return {
      statusCode: 502,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "Failed to generate temporary email.",
        details: error.message,
      }),
    };
  }
};
