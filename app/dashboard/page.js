"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";

/* ───────────────────────── helpers ───────────────────────── */
async function postJSON(path, body) {
  // Try POST first; some hosts require GET for simple routes
  let res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (res.status === 405) {
    const q = new URLSearchParams(Object.entries(body || {}));
    res = await fetch(`${path}?${q.toString()}`, { method: "GET" });
  }
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  if (!res.ok) throw new Error(json?.error || text || `HTTP ${res.status}`);
  return json;
}

const s = (v) => (v === null || v === undefined ? "" : String(v));
const n = (v) => {
  const num = typeof v === "number" ? v : Number(v ?? 0);
  return Number.isFinite(num) ? num : 0;
};

// € formatter (no locale assumptions about comma/point—always shows € and 2 decimals)
const euro = (v) => `€${n(v).toFixed(2)}`;
const pct1  = (v) => `${n(v).toFixed(1)}%`;

function bytesToGB(val) {
  return `${(n(val) / (1024 ** 3)).toFixed(2)} GB`;
}

/* ───────────────────────── styles ───────────────────────── */
const wrap = { maxWidth: 1280, margin: "0 auto", padding: 24 };
const card = { background: "#151a2e", borderRadius: 16, padding: 16 };
const kpiNum = { fontSize: 28, fontWeight: 700, color: "#e9ecf1" };

const tableShell = { ...card, padding: 0, overflowX: "auto" };
const table = { width: "100%", borderCollapse: "separate", borderSpacing: 0, fontSize: 13, color: "#e9ecf1" };

const thTopGroup = {
  position: "sticky", top: 0, zIndex: 3,
  background: "#12172a", color: "#e9ecf1",
  textAlign: "left", fontWeight: 800,
  padding: "10px 12px", borderBottom: "1px solid #2a3356",
  whiteSpace: "nowrap",
};
const thSub = {
  position: "sticky", top: 42, zIndex: 2,
  background: "#12172a", color: "#e9ecf1",
  textAlign: "left", fontWeight: 700,
  padding: "10px 12px", borderBottom: "1px solid #2a3356",
  whiteSpace: "nowrap",
};
const tdBase = {
  padding: "8px 12px", borderBottom: "1px solid #2a3356",
  whiteSpace: "nowrap", verticalAlign: "middle", color: "#e9ecf1",
};
const tdMono  = { ...tdBase, fontFamily: "ui-monospace,SFMono-Regular,Menlo,Monaco" };
const tdRight = { ...tdBase, textAlign: "right" };

/* ───────────────────────── page ───────────────────────── */
export default function Dashboard() {
  const [accountId, setAccountId] = useState(3771);
  const [listData, setListData] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingReport, setLoadingReport] = useState(false);
  const [error, setError] = useState("");

  // Quick list for KPIs
  const loadList = async () => {
    setLoading(true); setError("");
    try {
      const json = await postJSON("/api/ocs/list-subscribers", { accountId });
      const list = json?.listSubscriber?.subscriberList;
      setListData(Array.isArray(list) ? list : []);
    } catch (e) {
      setError(String(e)); setListData([]);
    } finally { setLoading(false); }
  };

  // Detailed report (packages, weekly usage, costs)
  const loadReport = async () => {
    setLoadingReport(true); setError("");
    try {
      const json = await postJSON("/api/ocs/report", { accountId, startDate: "2025-06-01" });
      const incomingCols = json.columns || [];
      const rawRows = Array.isArray(json.rows) ? json.rows : [];

      // Detect weekly columns from the dataset
      const weeklyResCols  = incomingCols.filter((c) => /^resellerCost_/.test(c));
      const weeklyUsedCols = incomingCols.filter((c) => /^usedData_/.test(c));

      const enhanced = rawRows.map((r) => {
        const resellerWeeklyTotal = weeklyResCols.reduce((acc, k) => acc + n(r[k]), 0);
        const usedWeeklyTotalBytes = weeklyUsedCols.reduce((acc, k) => acc + n(r[k]), 0);

        const subscriberCost = n(r.subscriberCost);
        const resellerCost   = n(r.resellerCost); // base cost, optional to display

        // ✅ Correct calculation in EUROS:
        // Profit/Loss = subscriberCost − resellerCostWeeklyTotal
        const profit = subscriberCost - resellerWeeklyTotal;

        // Margin (%) = profit / subscriberCost * 100
        const margin = subscriberCost > 0 ? (profit / subscriberCost) * 100 : 0;

        return {
          // Subscriber
          subscriberId: s(r.subscriberId),
          iccid: s(r.iccid),
          lastUsageDate: s(r.lastUsageDate || ""),

          // Package
          templateName: s(r.templateName || ""),
          activationDate: s(r.activationDate || r.tstartactivationutc || ""),
          expiryDate: s(r.expiryDate || r.tsexpirationutc || ""),

          // Usage (bytes numeric; formatted on render)
          usedDataByte: n(r.usedDataByte),
          pckDataByte: n(r.pckDataByte),
          usedDataWeeklyTotalBytes: usedWeeklyTotalBytes,

          // Costs & results
          subscriberCost,
          resellerCost,                        // optional display
          resellerCostWeeklyTotal: resellerWeeklyTotal,
          profit,                               // can be negative
          margin,                               // number
        };
      });

      setRows(enhanced);
    } catch (e) {
      setError(String(e)); setRows([]);
    } finally { setLoadingReport(false); }
  };

  useEffect(() => { loadList(); }, []);

  // KPIs
  const kpis = useMemo(() => {
    const total = listData.length;
    const active = listData.filter(
      (r) => Array.isArray(r?.status) && r.status.some((x) => String(x?.status).toUpperCase() === "ACTIVE")
    ).length;
    return { total, active, inactive: total - active };
  }, [listData]);

  // Column groups
  const groups = [
    {
      title: "Subscriber",
      cols: [
        { key: "subscriberId",  label: "Subscriber ID", style: tdBase },
        { key: "iccid",         label: "ICCID",         style: tdMono },
        { key: "lastUsageDate", label: "Last Usage",    style: tdMono },
      ],
    },
    {
      title: "Package",
      cols: [
        { key: "templateName",  label: "Template Name", style: tdBase },
        { key: "activationDate",label: "Activated",     style: tdMono },
        { key: "expiryDate",    label: "Expires",       style: tdMono },
      ],
    },
    {
      title: "Usage",
      cols: [
        { key: "usedDataByte",            label: "Used (Package)",     style: tdRight, fmt: (v)=>bytesToGB(v) },
        { key: "pckDataByte",             label: "Package Size",       style: tdRight, fmt: (v)=>bytesToGB(v) },
        { key: "usedDataWeeklyTotalBytes",label: "Used (Weekly Tot.)", style: tdRight, fmt: (v)=>bytesToGB(v) },
      ],
    },
    {
      title: "Costs (EUR)",
      cols: [
        { key: "subscriberCost",         label: "Subscriber Cost",        style: tdRight, fmt: (v)=>euro(v) },
        { key: "resellerCost",           label: "Reseller Cost",          style: tdRight, fmt: (v)=>euro(v) }, // optional base
        { key: "resellerCostWeeklyTotal",label: "Reseller Cost (Weekly)", style: tdRight, fmt: (v)=>euro(v) },
        { key: "profit",                 label: "Profit/Loss (€)",        style: tdRight, fmt: (v)=>euro(v) },
        { key: "margin",                 label: "Margin (%)",             style: tdRight, fmt: (v)=>pct1(v) },
      ],
    },
  ];

  const allCols = groups.flatMap((g) => g.cols);

  // Totals row (helps you verify)
  const totals = useMemo(() => {
    return rows.reduce(
      (acc, r) => {
        acc.subscriber += n(r.subscriberCost);
        acc.resWeekly  += n(r.resellerCostWeeklyTotal);
        acc.profit     += n(r.profit);
        return acc;
      },
      { subscriber: 0, resWeekly: 0, profit: 0 }
    );
  }, [rows]);

  return (
    <div style={wrap}>
      {/* Top—logo & controls */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Image src="/teltrip-logo.png" alt="Teltrip" width={160} height={40} priority />
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#e9ecf1" }}>OCS Dashboard</h1>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="number"
            value={accountId}
            onChange={(e) => setAccountId(Number(e.target.value))}
            style={{ width: 180, padding: 10, borderRadius: 10, border: "1px solid #2a3356", background: "#0f1428", color: "#e9ecf1" }}
          />
          <button
            onClick={loadList}
            style={{ padding: "10px 16px", borderRadius: 10, border: 0, background: "#4b74ff", color: "#fff", fontWeight: 700 }}
          >
            {loading ? "Loading…" : "Refresh"}
          </button>
          <button
            onClick={loadReport}
            style={{ padding: "10px 16px", borderRadius: 10, border: 0, background: "#22c55e", color: "#0b1020", fontWeight: 800 }}
          >
            {loadingReport ? "Building…" : "Build Excel-like report"}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ ...card, background: "#3a2030", color: "#ffd4d4", marginBottom: 16 }}>
          <strong>API error:</strong> {error}
        </div>
      )}

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 16 }}>
        <div style={card}>
          <div style={{ opacity: 0.7, color: "#cfd5e1" }}>Total Subscribers</div>
          <div style={kpiNum}>{kpis.total}</div>
        </div>
        <div style={card}>
          <div style={{ opacity: 0.7, color: "#cfd5e1" }}>Active</div>
          <div style={kpiNum}>{kpis.active}</div>
        </div>
        <div style={card}>
          <div style={{ opacity: 0.7, color: "#cfd5e1" }}>Inactive</div>
          <div style={kpiNum}>{kpis.inactive}</div>
        </div>
      </div>

      {/* Main table */}
      <div style={tableShell}>
        <table style={table}>
          <thead>
            {/* Group headers */}
            <tr>
              {groups.map((g, idx) => (
                <th key={`g-${idx}`} style={thTopGroup} colSpan={g.cols.length}>
                  {g.title}
                </th>
              ))}
            </tr>
            {/* Column headers */}
            <tr>
              {allCols.map((c) => (
                <th key={`h-${c.key}`} style={thSub}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.map((r, i) => (
              <tr key={i} style={{ background: i % 2 ? "#141a30" : "transparent" }}>
                {allCols.map((c) => {
                  const raw = r[c.key];
                  const val = c.fmt ? c.fmt(raw) : s(raw);
                  const style = c.style || tdBase;

                  // color profit & margin cells
                  const colorize =
                    (c.key === "profit" || c.key === "margin")
                      ? { color: n(raw) < 0 ? "#ef4444" : "#22c55e", fontWeight: 700 }
                      : null;

                  return (
                    <td key={`${i}-${c.key}`} title={s(raw)} style={{ ...style, ...colorize }}>
                      {val}
                    </td>
                  );
                })}
              </tr>
            ))}

            {/* Totals row */}
            {rows.length > 0 && (
              <tr style={{ background: "#0f1428" }}>
                <td
                  colSpan={
                    groups[0].cols.length + groups[1].cols.length + groups[2].cols.length
                  }
                  style={{ ...tdBase, fontWeight: 700 }}
                >
                  Totals
                </td>
                <td style={{ ...tdRight, fontWeight: 700 }}>{euro(totals.subscriber)}</td>
                <td style={{ ...tdRight, fontWeight: 700 }}>{euro(0) /* base reseller (optional column) */}</td>
                <td style={{ ...tdRight, fontWeight: 700 }}>{euro(totals.resWeekly)}</td>
                <td style={{
                  ...tdRight, fontWeight: 700,
                  color: totals.profit < 0 ? "#ef4444" : "#22c55e"
                }}>
                  {euro(totals.profit)}
                </td>
                <td style={{ ...tdRight, fontWeight: 700 }}>
                  {
                    pct1(
                      rows.reduce(
                        (acc, r) => acc + (n(r.subscriberCost) > 0 ? (n(r.profit) / n(r.subscriberCost)) * 100 : 0),
                        0
                      ) / rows.length
                    )
                  }
                </td>
              </tr>
            )}

            {!loadingReport && rows.length === 0 && (
              <tr>
                <td colSpan={allCols.length} style={{ ...tdBase, padding: 16, opacity: 0.8 }}>
                  Click <em>Build Excel-like report</em> to fetch packages & weekly usage.
                </td>
              </tr>
            )}
            {loadingReport && (
              <tr>
                <td colSpan={allCols.length} style={{ ...tdBase, padding: 16 }}>Working…</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
