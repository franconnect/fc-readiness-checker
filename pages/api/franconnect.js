// pages/api/franconnect.js
// Proxies requests to the FranConnect API server-side.
// Keeps the Bearer token out of the browser.
//
// POST /api/franconnect
// Body: { tenantHost, token, module, subModule, filterXML, limit, offset }

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const {
    tenantHost,   // e.g. "acme.franconnect.net"
    token,        // Bearer access token (temporary — will be replaced by OAuth flow)
    module = "fim",
    subModule = "franchisee",
    filterXML = `<?xml version='1.0' encoding='utf-8'?><fcRequest><filter></filter></fcRequest>`,
    limit = 200,
    offset = 0,
  } = req.body;

  if (!tenantHost || !token) {
    return res.status(400).json({ error: "tenantHost and token are required." });
  }

  // Sanitize tenantHost — strip protocol and path if pasted in full
  const host = tenantHost
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .trim();

  const url = `https://${host}/fc/rest/dataservices/retrieve?module=${module}&subModule=${subModule}&responseType=XML&limit=${limit}&offset=${offset}`;

  try {
    const fcRes = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "X-TenantID": host,
      },
      body: new URLSearchParams({ filterXML }),
    });

    if (!fcRes.ok) {
      const body = await fcRes.text().catch(() => "");
      return res.status(fcRes.status).json({
        error: `FranConnect API error ${fcRes.status}: ${fcRes.statusText}`,
        detail: body.slice(0, 500),
      });
    }

    const xml = await fcRes.text();
    res.setHeader("Content-Type", "application/xml");
    return res.status(200).send(xml);
  } catch (err) {
    console.error("FranConnect proxy error:", err);
    return res.status(502).json({ error: `Proxy error: ${err.message}` });
  }
}
