# FranConnect Dashboard Readiness Checker

Internal tool for FranConnect CSMs to assess field population readiness before enabling Analytics dashboards.

## Project Structure

```
fc-readiness-checker/
├── lib/
│   ├── dashboards.js     ← Field definitions for all dashboard categories
│   └── analysis.js       ← XML parsing, field analysis, scoring engine
├── pages/
│   ├── index.jsx         ← Main UI
│   └── api/
│       └── franconnect.js ← Server-side API proxy (keeps token out of browser)
├── package.json
└── README.md
```

## Local Development

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Deploy to Vercel

```bash
npm install -g vercel
vercel
```

No environment variables required for the current token-paste flow.

---

## Auth — Current vs. Future

### Now (token paste)
CSMs obtain a Bearer token from the tech group (generated via Postman against `https://auth.franconnect.net/userauth/oauth/token`) and paste it into the tool. The token is sent to the Vercel API route server-side — never stored.

### Later (OAuth popup — once Client ID/Secret are issued)

1. Submit ticket to helpdesk@franconnect.com:
   > "Please issue an OAuth Client ID and Secret for an internal web application. We need the `authorization_code` grant type enabled. Redirect URI: `https://[your-vercel-url]/api/auth/callback`"

2. Add to Vercel environment variables:
   ```
   FC_CLIENT_ID=your_client_id
   FC_CLIENT_SECRET=your_client_secret
   ```

3. The `pages/api/franconnect.js` proxy is already structured to accept tokens — the OAuth swap is a frontend auth flow addition only, no changes to the analysis engine.

---

## Adding New Dashboards

All field definitions live in `lib/dashboards.js`. To add a new dashboard:

1. Find the relevant category in `CATEGORIES` (or add a new one)
2. Change `status: "coming_soon"` to `status: "active"` if activating a category
3. Add a dashboard object to the `dashboards` array:

```js
{
  id: "my_dashboard",
  name: "My Dashboard Name",
  description: "Short description for CSMs",
  fields: [
    { key: "xmlFieldName", label: "Human Label", type: "top", tab: "Module → Tab" },
    { key: "childCollection", label: "Child Label", type: "child", childKey: "value", tab: "Module → Tab" },
    { key: "_manualField", label: "Manual Field", type: "manual", tab: "Location", note: "Why it's manual." },
  ],
}
```

**Field types:**
- `top` — direct child element of `<fimFranchisee>` in the API response
- `child` — child collection (e.g., `<fimReferenceDates>`, `<fimOwner>`)
- `manual` — cannot be checked via API; CSM must verify in FranConnect directly
- `sales` — requires `fs/salesLead` module pull (not yet implemented)

If the new dashboard requires a different API module (e.g., `fs` for Sales), add `apiModule` and `apiSubModule` to the category and update `pages/api/franconnect.js` to accept those params.

---

## Known Limitations

| Field | Issue |
|---|---|
| Project Status | Stored as a hashed custom field (`_projectStatusNew853720490`) — name varies per instance |
| New Expiration Date | Often a custom field — verify in Admin → Info Mgr → Manage Form Generator |
| Opener Checklist Tasks | Not available via `fim/franchisee` — requires manual verification |
| Sales lead fields | Require `fs/salesLead` API pull — planned for Sales dashboard release |

---

## Version History

| Version | Date | Notes |
|---|---|---|
| v1.0-opener | 2026-06-04 | Opener dashboards: Awarding, Unit Openings, Opening Tasks, System Growth |
