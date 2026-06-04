import { useState, useCallback } from "react";
import { CATEGORIES } from "../lib/dashboards";
import {
  parseXml,
  extractUnits,
  checkApiSuccess,
  analyzeField,
  scoreDashboard,
  scoreCategory,
  scoreLabel,
  scoreColor,
  scoreBg,
} from "../lib/analysis";

// ─── API fetch (via proxy) ────────────────────────────────────────────────────

async function fetchPage(tenantHost, token, limit, offset) {
  const res = await fetch("/api/franconnect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tenantHost, token, limit, offset }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  const xml = await res.text();
  const doc = parseXml(xml);
  checkApiSuccess(doc);
  return extractUnits(doc);
}

async function fetchAllUnits(tenantHost, token, onProgress) {
  const BATCH = 200;
  const MAX = 2000;
  let allUnits = [];

  for (let offset = 0; offset < MAX; offset += BATCH) {
    onProgress(`Fetching records ${offset + 1}–${offset + BATCH}…`);
    const batch = await fetchPage(tenantHost, token, BATCH, offset);
    allUnits = allUnits.concat(batch);
    if (batch.length < BATCH) break;
  }

  return allUnits;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ScoreBadge({ rate, size = "sm" }) {
  const color = scoreColor(rate);
  const bg = scoreBg(rate);
  const label = scoreLabel(rate);
  const fontSize = size === "lg" ? 13 : 11;
  const padding = size === "lg" ? "4px 12px" : "2px 8px";

  return (
    <span style={{
      fontSize,
      fontWeight: 700,
      color,
      background: bg,
      border: `1px solid ${color}22`,
      padding,
      borderRadius: 20,
      letterSpacing: "0.02em",
      whiteSpace: "nowrap",
    }}>
      {rate != null ? `${rate}% ` : ""}{label}
    </span>
  );
}

function ProgressBar({ rate }) {
  const color = scoreColor(rate ?? 0);
  return (
    <div style={{
      background: "#e2e8f0",
      borderRadius: 4,
      height: 6,
      overflow: "hidden",
      width: "100%",
      minWidth: 80,
    }}>
      <div style={{
        height: "100%",
        width: `${rate ?? 0}%`,
        background: color,
        borderRadius: 4,
        transition: "width 0.8s cubic-bezier(0.4,0,0.2,1)",
      }} />
    </div>
  );
}

function FieldRow({ field, result, isLast }) {
  const isManual = result?.manual;
  const rate = result?.rate ?? null;

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "1fr 160px 100px",
      gap: 16,
      alignItems: "center",
      padding: "11px 0",
      borderBottom: isLast ? "none" : "1px solid #f1f5f9",
    }}>
      {/* Field info */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 500, color: "#1e293b", lineHeight: 1.3 }}>
          {field.label}
        </div>
        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{field.tab}</div>
        {isManual && (
          <div style={{
            fontSize: 11,
            color: "#92400e",
            background: "#fffbeb",
            border: "1px solid #fde68a",
            borderRadius: 4,
            padding: "3px 8px",
            marginTop: 5,
            display: "inline-block",
            lineHeight: 1.4,
          }}>
            ⚠ {result.note}
          </div>
        )}
      </div>

      {/* Population bar */}
      <div>
        {isManual ? (
          <span style={{ fontSize: 12, color: "#cbd5e1" }}>Manual check required</span>
        ) : result ? (
          <div>
            <ProgressBar rate={rate} />
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>
              {result.populated} of {result.total} units populated
            </div>
          </div>
        ) : (
          <span style={{ fontSize: 12, color: "#e2e8f0" }}>—</span>
        )}
      </div>

      {/* Badge */}
      <div style={{ textAlign: "right" }}>
        {isManual ? (
          <span style={{
            fontSize: 11, fontWeight: 600,
            color: "#92400e", background: "#fffbeb",
            border: "1px solid #fde68a",
            padding: "2px 8px", borderRadius: 20,
          }}>Manual</span>
        ) : result ? (
          <ScoreBadge rate={rate} />
        ) : null}
      </div>
    </div>
  );
}

function DashboardCard({ dashboard, fieldResults, isLoaded }) {
  const [open, setOpen] = useState(true);
  const score = isLoaded ? scoreDashboard(dashboard, fieldResults) : null;

  return (
    <div style={{
      border: "1px solid #e2e8f0",
      borderRadius: 8,
      overflow: "hidden",
      marginBottom: 16,
      background: "#fff",
    }}>
      {/* Card header — clickable to collapse */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          background: "#134564",
          padding: "14px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          cursor: "pointer",
          userSelect: "none",
        }}
      >
        <div>
          <div style={{ color: "#fff", fontWeight: 700, fontSize: 14, letterSpacing: "0.01em" }}>
            {dashboard.name}
          </div>
          <div style={{ color: "#7aafc7", fontSize: 12, marginTop: 3 }}>
            {dashboard.description}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {isLoaded && score != null && (
            <div style={{ textAlign: "right" }}>
              <div style={{
                fontSize: 26, fontWeight: 900,
                color: scoreColor(score), lineHeight: 1,
              }}>
                {score}%
              </div>
              <div style={{ fontSize: 10, color: "#7aafc7", marginTop: 2, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {scoreLabel(score)}
              </div>
            </div>
          )}
          <div style={{
            color: "#7aafc7",
            fontSize: 16,
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s",
          }}>▾</div>
        </div>
      </div>

      {/* Field table */}
      {open && (
        <div style={{ padding: "0 20px" }}>
          {/* Column headers */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 160px 100px",
            gap: 16,
            padding: "10px 0 6px",
            borderBottom: "2px solid #e2e8f0",
          }}>
            {["Field / Location", "Population Rate", "Status"].map((h, i) => (
              <div key={h} style={{
                fontSize: 10,
                fontWeight: 700,
                color: "#94a3b8",
                textTransform: "uppercase",
                letterSpacing: "0.07em",
                textAlign: i === 2 ? "right" : "left",
              }}>{h}</div>
            ))}
          </div>

          {dashboard.fields.map((field, idx) => (
            <FieldRow
              key={field.key}
              field={field}
              result={fieldResults[field.key] ?? null}
              isLast={idx === dashboard.fields.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CategoryTab({ category, isActive, onClick, catScore }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "10px 20px",
        border: "none",
        borderBottom: isActive ? "3px solid #e07300" : "3px solid transparent",
        background: "none",
        cursor: category.status === "coming_soon" ? "default" : "pointer",
        fontFamily: "inherit",
        fontSize: 13,
        fontWeight: isActive ? 700 : 500,
        color: category.status === "coming_soon"
          ? "#cbd5e1"
          : isActive ? "#134564" : "#64748b",
        whiteSpace: "nowrap",
        display: "flex",
        alignItems: "center",
        gap: 8,
        transition: "color 0.15s",
      }}
    >
      <span>{category.icon}</span>
      <span>{category.label}</span>
      {category.status === "coming_soon" && (
        <span style={{
          fontSize: 9,
          fontWeight: 700,
          color: "#94a3b8",
          background: "#f1f5f9",
          padding: "1px 5px",
          borderRadius: 10,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
        }}>Soon</span>
      )}
      {catScore != null && (
        <span style={{
          fontSize: 10,
          fontWeight: 800,
          color: scoreColor(catScore),
          background: scoreBg(catScore),
          padding: "1px 6px",
          borderRadius: 10,
        }}>{catScore}%</span>
      )}
    </button>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function ReadinessChecker() {
  const [instanceUrl, setInstanceUrl] = useState("");
  const [token, setToken]             = useState("");
  const [runStatus, setRunStatus]     = useState("idle"); // idle | loading | done | error
  const [progressMsg, setProgressMsg] = useState("");
  const [errorMsg, setErrorMsg]       = useState("");
  const [results, setResults]         = useState({}); // { categoryId: { dashboardId: { fieldKey: result } } }
  const [unitCount, setUnitCount]     = useState(0);
  const [fetchedAt, setFetchedAt]     = useState(null);
  const [activeTab, setActiveTab]     = useState("opener");

  // Extract hostname from whatever the CSM pastes
  const getTenantHost = (url) =>
    url.replace(/^https?:\/\//, "").replace(/\/.*$/, "").trim();

  const runCheck = useCallback(async () => {
    if (!instanceUrl || !token) return;
    setRunStatus("loading");
    setErrorMsg("");
    setResults({});

    try {
      const tenantHost = getTenantHost(instanceUrl);
      const units = await fetchAllUnits(tenantHost, token, setProgressMsg);

      if (units.length === 0) {
        throw new Error("No franchisee records returned. Verify the instance URL and token.");
      }

      setUnitCount(units.length);
      setProgressMsg("Analyzing fields…");

      const newResults = {};
      for (const category of CATEGORIES.filter(c => c.status === "active")) {
        newResults[category.id] = {};
        for (const dashboard of category.dashboards) {
          newResults[category.id][dashboard.id] = {};
          for (const field of dashboard.fields) {
            newResults[category.id][dashboard.id][field.key] = analyzeField(units, field);
          }
        }
      }

      setResults(newResults);
      setFetchedAt(new Date().toLocaleString());
      setRunStatus("done");
    } catch (err) {
      setErrorMsg(err.message);
      setRunStatus("error");
    }
  }, [instanceUrl, token]);

  const activeCategory = CATEGORIES.find(c => c.id === activeTab);
  const catResults     = results[activeTab] ?? {};

  // Overall score across all active categories
  const overallScore = (() => {
    if (runStatus !== "done") return null;
    const allRates = [];
    for (const cat of CATEGORIES.filter(c => c.status === "active")) {
      for (const db of cat.dashboards) {
        const dRes = results[cat.id]?.[db.id] ?? {};
        for (const f of db.fields.filter(f => f.type !== "manual" && f.type !== "sales")) {
          const r = dRes[f.key]?.rate;
          if (r != null) allRates.push(r);
        }
      }
    }
    return allRates.length > 0
      ? Math.round(allRates.reduce((a, b) => a + b, 0) / allRates.length)
      : null;
  })();

  return (
    <div style={{
      fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
      background: "#f8fafc",
      minHeight: "100vh",
      paddingBottom: 60,
    }}>

      {/* ── Page header ── */}
      <div style={{
        background: "#134564",
        padding: "0 32px",
        boxShadow: "0 2px 12px rgba(0,0,0,0.18)",
      }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "20px 0 16px",
          }}>
            <div>
              <div style={{
                fontSize: 10,
                fontWeight: 800,
                color: "#e07300",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                marginBottom: 6,
              }}>
                FranConnect Best Practice Blueprint
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: "-0.01em" }}>
                Dashboard Readiness Checker
              </div>
              <div style={{ fontSize: 13, color: "#7aafc7", marginTop: 4 }}>
                Verify field population before enabling Analytics dashboards
              </div>
            </div>

            {runStatus === "done" && overallScore != null && (
              <div style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 10,
                padding: "14px 24px",
                textAlign: "center",
              }}>
                <div style={{
                  fontSize: 42,
                  fontWeight: 900,
                  color: scoreColor(overallScore),
                  lineHeight: 1,
                  letterSpacing: "-0.02em",
                }}>
                  {overallScore}%
                </div>
                <div style={{ fontSize: 11, color: "#7aafc7", marginTop: 4, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Overall Readiness
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: scoreColor(overallScore), marginTop: 2 }}>
                  {scoreLabel(overallScore)}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 32px" }}>

        {/* ── Connection panel ── */}
        <div style={{
          background: "#fff",
          border: "1px solid #e2e8f0",
          borderRadius: 8,
          padding: "20px 24px",
          marginTop: 24,
          marginBottom: 24,
        }}>
          <div style={{
            fontSize: 11,
            fontWeight: 700,
            color: "#134564",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginBottom: 16,
          }}>
            Instance Connection
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr auto",
            gap: 14,
            alignItems: "flex-end",
          }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#475569", display: "block", marginBottom: 6 }}>
                Customer Instance URL
              </label>
              <input
                type="text"
                placeholder="https://customername.franconnect.net"
                value={instanceUrl}
                onChange={e => setInstanceUrl(e.target.value)}
                disabled={runStatus === "loading"}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  border: "1px solid #cbd5e1",
                  borderRadius: 6,
                  fontSize: 13,
                  fontFamily: "inherit",
                  outline: "none",
                  boxSizing: "border-box",
                  background: runStatus === "loading" ? "#f8fafc" : "#fff",
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#475569", display: "block", marginBottom: 6 }}>
                Bearer Access Token
                <span style={{
                  marginLeft: 8,
                  fontSize: 10,
                  fontWeight: 500,
                  color: "#94a3b8",
                  textTransform: "none",
                }}>
                  (OAuth token — replacing with login flow after Client ID/Secret issued)
                </span>
              </label>
              <input
                type="password"
                placeholder="Paste Bearer token"
                value={token}
                onChange={e => setToken(e.target.value)}
                disabled={runStatus === "loading"}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  border: "1px solid #cbd5e1",
                  borderRadius: 6,
                  fontSize: 13,
                  fontFamily: "inherit",
                  outline: "none",
                  boxSizing: "border-box",
                  background: runStatus === "loading" ? "#f8fafc" : "#fff",
                }}
              />
            </div>

            <button
              onClick={runCheck}
              disabled={!instanceUrl || !token || runStatus === "loading"}
              style={{
                background: (!instanceUrl || !token || runStatus === "loading") ? "#94a3b8" : "#e07300",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                padding: "9px 24px",
                fontSize: 13,
                fontWeight: 700,
                cursor: (!instanceUrl || !token || runStatus === "loading") ? "not-allowed" : "pointer",
                fontFamily: "inherit",
                whiteSpace: "nowrap",
                letterSpacing: "0.02em",
                transition: "background 0.15s",
                height: 38,
              }}
            >
              {runStatus === "loading" ? "Checking…" : "Run Check"}
            </button>
          </div>

          {/* Status messages */}
          {runStatus === "loading" && (
            <div style={{
              marginTop: 12,
              fontSize: 12,
              color: "#64748b",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}>
              <span style={{
                display: "inline-block",
                width: 12, height: 12,
                border: "2px solid #e07300",
                borderTopColor: "transparent",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
              }} />
              {progressMsg || "Connecting…"}
            </div>
          )}

          {runStatus === "done" && (
            <div style={{ marginTop: 12, fontSize: 12, color: "#16a34a", fontWeight: 500 }}>
              ✓ {unitCount.toLocaleString()} unit records analyzed · {fetchedAt}
            </div>
          )}

          {runStatus === "error" && (
            <div style={{
              marginTop: 12,
              padding: "10px 14px",
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: 6,
              fontSize: 13,
              color: "#dc2626",
            }}>
              ✗ {errorMsg}
            </div>
          )}

          {/* Info callout */}
          <div style={{
            marginTop: 14,
            padding: "10px 14px",
            background: "#f0f9ff",
            borderLeft: "3px solid #134564",
            borderRadius: "0 6px 6px 0",
            fontSize: 12,
            color: "#475569",
            lineHeight: 1.6,
          }}>
            <strong style={{ color: "#134564" }}>How it works:</strong> Pulls franchisee unit records via{" "}
            <code style={{ fontSize: 11, background: "#e2e8f0", padding: "1px 5px", borderRadius: 3 }}>
              POST /fc/rest/dataservices/retrieve?module=fim&subModule=franchisee
            </code>{" "}
            (up to 2,000 records). Fields marked <strong>Manual</strong> cannot be verified via API and require direct inspection in FranConnect.
          </div>
        </div>

        {/* ── Score legend ── */}
        {runStatus === "done" && (
          <div style={{
            display: "flex",
            gap: 24,
            marginBottom: 20,
            padding: "10px 18px",
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: 8,
            fontSize: 12,
            alignItems: "center",
          }}>
            <span style={{ fontWeight: 700, color: "#475569", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Readiness
            </span>
            {[
              ["#16a34a", "#f0fdf4", "Ready",   "≥ 80%"],
              ["#e07300", "#fff7ed", "Partial",  "50–79%"],
              ["#dc2626", "#fef2f2", "At Risk",  "< 50%"],
              ["#92400e", "#fffbeb", "Manual",   "Verify in FC"],
            ].map(([color, bg, label, range]) => (
              <span key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{
                  width: 10, height: 10, borderRadius: 2,
                  background: bg, border: `1.5px solid ${color}`,
                  display: "inline-block",
                }} />
                <span style={{ fontWeight: 700, color }}>{label}</span>
                <span style={{ color: "#94a3b8" }}>{range}</span>
              </span>
            ))}
          </div>
        )}

        {/* ── Category tabs ── */}
        <div style={{
          display: "flex",
          gap: 0,
          borderBottom: "2px solid #e2e8f0",
          marginBottom: 24,
          overflowX: "auto",
        }}>
          {CATEGORIES.map(cat => (
            <CategoryTab
              key={cat.id}
              category={cat}
              isActive={activeTab === cat.id}
              onClick={() => cat.status !== "coming_soon" && setActiveTab(cat.id)}
              catScore={
                runStatus === "done" && results[cat.id]
                  ? scoreCategory(cat, results[cat.id])
                  : null
              }
            />
          ))}
        </div>

        {/* ── Active category content ── */}
        {activeCategory?.status === "coming_soon" ? (
          <div style={{
            textAlign: "center",
            padding: "60px 20px",
            color: "#94a3b8",
          }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>{activeCategory.icon}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#cbd5e1", marginBottom: 8 }}>
              {activeCategory.label} Dashboards — Coming Soon
            </div>
            <div style={{ fontSize: 13, color: "#cbd5e1", maxWidth: 420, margin: "0 auto" }}>
              {activeCategory.description}
            </div>
          </div>
        ) : (
          activeCategory?.dashboards.map(dashboard => (
            <DashboardCard
              key={dashboard.id}
              dashboard={dashboard}
              fieldResults={catResults[dashboard.id] ?? {}}
              isLoaded={runStatus === "done"}
            />
          ))
        )}
      </div>

      {/* ── Footer ── */}
      <div style={{
        textAlign: "center",
        fontSize: 11,
        color: "#cbd5e1",
        marginTop: 40,
        paddingBottom: 20,
      }}>
        FranConnect Internal Tool · Dashboard Readiness Checker · v1.0-opener
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        input:focus {
          border-color: #134564 !important;
          box-shadow: 0 0 0 3px rgba(19,69,100,0.1);
        }
        button:hover:not(:disabled) {
          background: #c46500 !important;
        }
      `}</style>
    </div>
  );
}
