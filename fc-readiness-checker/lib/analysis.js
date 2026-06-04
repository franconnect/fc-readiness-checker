// ─── XML Parsing ──────────────────────────────────────────────────────────────

export function parseXml(xmlString) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, "application/xml");
  const parseError = doc.querySelector("parsererror");
  if (parseError) throw new Error("Failed to parse API response as XML.");
  return doc;
}

export function extractUnits(xmlDoc) {
  return Array.from(xmlDoc.querySelectorAll("fimFranchisee"));
}

export function checkApiSuccess(xmlDoc) {
  const status = xmlDoc.querySelector("responseStatus");
  if (!status || status.textContent.trim() !== "Success") {
    const msg = xmlDoc.querySelector("responseMessage");
    throw new Error(msg?.textContent || "API returned a non-success status. Check credentials.");
  }
}

// ─── Field Extraction ─────────────────────────────────────────────────────────

function getTopField(unit, key) {
  const el = unit.querySelector(`:scope > ${key}`);
  return el ? el.textContent.trim() : null;
}

function getChildCollection(unit, collectionTag, valueKey) {
  const items = Array.from(unit.querySelectorAll(`:scope > ${collectionTag}`));
  return items.map((item) => {
    const el = item.querySelector(valueKey);
    return el ? el.textContent.trim() : "";
  });
}

// ─── Field Analysis ───────────────────────────────────────────────────────────

export function analyzeField(units, field) {
  if (field.type === "manual" || field.type === "sales") {
    return {
      manual: true,
      note: field.note,
      populated: null,
      empty: null,
      total: units.length,
      rate: null,
    };
  }

  let populated = 0;
  let empty = 0;

  for (const unit of units) {
    if (field.type === "top") {
      const val = getTopField(unit, field.key);
      val && val.length > 0 ? populated++ : empty++;
    } else if (field.type === "child") {
      const values = getChildCollection(unit, field.key, field.childKey);
      values.some((v) => v.length > 0) ? populated++ : empty++;
    }
  }

  const total = populated + empty;
  const rate = total > 0 ? Math.round((populated / total) * 100) : 0;
  return { populated, empty, total, rate, manual: false };
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

export function scoreDashboard(dashboard, fieldResults) {
  const autoFields = dashboard.fields.filter((f) => f.type !== "manual" && f.type !== "sales");
  const rates = autoFields
    .map((f) => fieldResults[f.key]?.rate)
    .filter((r) => r != null);
  if (rates.length === 0) return null;
  return Math.round(rates.reduce((a, b) => a + b, 0) / rates.length);
}

export function scoreCategory(category, categoryResults) {
  const allRates = [];
  for (const dashboard of category.dashboards) {
    const dResults = categoryResults[dashboard.id] ?? {};
    for (const field of dashboard.fields.filter((f) => f.type !== "manual" && f.type !== "sales")) {
      const r = dResults[field.key]?.rate;
      if (r != null) allRates.push(r);
    }
  }
  if (allRates.length === 0) return null;
  return Math.round(allRates.reduce((a, b) => a + b, 0) / allRates.length);
}

export function scoreLabel(rate) {
  if (rate == null) return "—";
  if (rate >= 80) return "Ready";
  if (rate >= 50) return "Partial";
  return "At Risk";
}

export function scoreColor(rate) {
  if (rate == null) return "#94a3b8";
  if (rate >= 80) return "#16a34a";
  if (rate >= 50) return "#e07300";
  return "#dc2626";
}

export function scoreBg(rate) {
  if (rate == null) return "#f1f5f9";
  if (rate >= 80) return "#f0fdf4";
  if (rate >= 50) return "#fff7ed";
  return "#fef2f2";
}
