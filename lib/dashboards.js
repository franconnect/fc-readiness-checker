// ─── Dashboard Configuration ──────────────────────────────────────────────────
// Each category groups related dashboards. Each dashboard lists required fields.
//
// Field types:
//   "top"    — top-level XML field in fimFranchisee response
//   "child"  — child collection (fimReferenceDates, fimOwner, fimCustomProfile)
//   "manual" — cannot be checked via API; requires CSM manual verification
//   "sales"  — requires separate fs/salesLead API pull (future)
//
// To add a new dashboard: add a category object or push into an existing one.
// No changes to the engine required.

export const CATEGORIES = [
  {
    id: "opener",
    label: "Opener",
    icon: "🏗",
    status: "active",
    apiModule: "fim",
    apiSubModule: "franchisee",
    dashboards: [
      {
        id: "awarding",
        name: "Franchise Awarding & Opening Progress",
        description: "Awarded leads, projected vs. actual openings, revenue tracking",
        fields: [
          { key: "lifecycleStage",       label: "Lifecycle Stage",        type: "top",    tab: "Center Info → Center Details" },
          { key: "expectedOpeningDate",  label: "Expected Opening Date",  type: "top",    tab: "Center Info → Center Details" },
          { key: "openingDate",          label: "Opening Date",           type: "top",    tab: "Center Info → Center Details" },
          // Sales-side fields for this dashboard — separate pull, flagged for future
          {
            key: "_franchiseAwarded",
            label: "Franchise Awarded (checkbox + date)",
            type: "manual",
            tab: "Sales → Lead Management → Primary Info",
            note: "Requires Sales module pull (fs/salesLead) — coming in Sales dashboard release.",
          },
          {
            key: "_forecastRevenue",
            label: "Forecast Revenue",
            type: "manual",
            tab: "Sales → Lead Management → Forecast Details",
            note: "Requires Sales module pull — coming in Sales dashboard release.",
          },
        ],
      },
      {
        id: "unit_openings",
        name: "Unit Openings",
        description: "In-development pipeline, project status, milestone tracking",
        fields: [
          { key: "lifecycleStage",      label: "Lifecycle Stage",                              type: "top",   tab: "Center Info → Center Details" },
          { key: "expectedOpeningDate", label: "Expected Opening Date",                        type: "top",   tab: "Center Info → Center Details" },
          { key: "openingDate",         label: "Opening Date",                                 type: "top",   tab: "Center Info → Center Details" },
          { key: "division",            label: "Division",                                     type: "top",   tab: "Center Info → Center Details" },
          { key: "areaID",              label: "Area / Region",                                type: "top",   tab: "Center Info → Center Details" },
          { key: "city",                label: "City",                                         type: "top",   tab: "Center Info → Center Details" },
          { key: "state",               label: "State",                                        type: "top",   tab: "Center Info → Center Details" },
          { key: "country",             label: "Country",                                      type: "top",   tab: "Center Info → Center Details" },
          { key: "fbc",                 label: "FBC (Franchise Business Consultant)",          type: "top",   tab: "Center Info → Center Details" },
          { key: "fimReferenceDates",   label: "Reference Dates (6th, 9th, 12th, Lease)",     type: "child", childKey: "value",       tab: "Center Info → Reference Dates" },
          { key: "fimCustomProfile",    label: "Custom Profiles",                              type: "child", childKey: "displayName", tab: "Center Info → Custom Profiles" },
          { key: "fimOwner",            label: "Owner Name",                                   type: "child", childKey: "firstName",   tab: "Owners" },
          {
            key: "_projectStatus",
            label: "Project Status",
            type: "manual",
            tab: "Center Info → Center Details",
            note: "Stored as a hashed custom field — name varies per instance. Verify via Admin → Projects (Opener).",
          },
        ],
      },
      {
        id: "opening_tasks",
        name: "Opening Task Analysis",
        description: "Task execution status, department breakdown, timeline views",
        fields: [
          { key: "lifecycleStage",      label: "Lifecycle Stage",       type: "top",   tab: "Center Info → Center Details" },
          { key: "expectedOpeningDate", label: "Expected Opening Date", type: "top",   tab: "Center Info → Center Details" },
          { key: "fimReferenceDates",   label: "Reference Dates (all)", type: "child", childKey: "value", tab: "Center Info → Reference Dates" },
          {
            key: "_openerChecklist",
            label: "Opener Checklist Tasks (Dept, Status, Owner, Dates)",
            type: "manual",
            tab: "Opener → Opener Checklist",
            note: "Checklist task data is not available via fim/franchisee. Requires manual verification in Opener → Store Summary → Opener Checklist tab.",
          },
        ],
      },
      {
        id: "system_growth",
        name: "System Growth Analysis",
        description: "Unit distribution, geographic spread, renewal tracking",
        fields: [
          { key: "lifecycleStage", label: "Lifecycle Stage", type: "top", tab: "Center Info → Center Details" },
          { key: "division",       label: "Division",        type: "top", tab: "Center Info → Center Details" },
          { key: "country",        label: "Country",         type: "top", tab: "Center Info → Center Details" },
          { key: "state",          label: "State",           type: "top", tab: "Center Info → Center Details" },
          { key: "openingDate",    label: "Opening Date",    type: "top", tab: "Center Info → Center Details" },
          { key: "fbc",            label: "FBC",             type: "top", tab: "Center Info → Center Details" },
          {
            key: "_newExpirationDate",
            label: "New Expiration Date",
            type: "manual",
            tab: "Center Info → Center Details",
            note: "Often configured as a custom field — verify field name in this instance via Admin → Info Mgr → Manage Form Generator.",
          },
        ],
      },
    ],
  },

  // ── Future categories — shell only ──────────────────────────────────────────
  {
    id: "sales",
    label: "Sales",
    icon: "📈",
    status: "coming_soon",
    description: "FSI, FSO, Lead Activity, Lead Engagement, Scorecard, Broker Performance",
    dashboards: [],
  },
  {
    id: "operations",
    label: "Operations",
    icon: "⚙️",
    status: "coming_soon",
    description: "Site Visits, Incident Reporting, Playbook Tracker, Franchise Engagement",
    dashboards: [],
  },
  {
    id: "financial",
    label: "Financial",
    icon: "💰",
    status: "coming_soon",
    description: "Systemwide Financial Performance, P&L, Sales & Royalty Trends, Leaderboard",
    dashboards: [],
  },
];
