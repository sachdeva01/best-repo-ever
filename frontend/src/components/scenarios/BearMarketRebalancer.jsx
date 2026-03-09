/**
 * BearMarketRebalancer.jsx
 *
 * Portfolio Rebalancing Scenario Planner
 * Models the impact of shifting capital from growth sleeve → cash reserve,
 * then deploying into equities during a market pullback.
 *
 * Context: ~$8.6M portfolio, two-sleeve strategy (preservation + growth),
 * $325K annual income target, early retirement planning.
 *
 * Usage:
 *   import BearMarketRebalancer from './BearMarketRebalancer';
 *   <BearMarketRebalancer />
 *
 * Props (all optional — sensible defaults provided):
 *   totalPortfolio   {number}  Total portfolio value (default: 8600000)
 *   growthPct         {number}  Current growth sleeve % (default: 40)
 *   incomeTarget      {number}  Annual income target (default: 325000)
 *
 * Dependencies: React (hooks), no external UI libs required.
 * Styling: Inline styles for portability. Replace with your design system as needed.
 */

import { useState, useMemo, useCallback } from "react";

// ─── Holdings Configuration ──────────────────────────────────────────────────
const HOLDINGS = {
  growth: [
    { name: "VOO",  label: "S&P 500",       yield: 1.3, bearDraw: [-25, -35], recoveryMo: [18, 30], weight: 0.35 },
    { name: "VXF",  label: "Ext. Market",    yield: 1.2, bearDraw: [-30, -45], recoveryMo: [24, 42], weight: 0.15 },
    { name: "SCHD", label: "Dividend Eq.",    yield: 3.5, bearDraw: [-25, -33], recoveryMo: [18, 30], weight: 0.25 },
    { name: "JEPI", label: "Eq. Premium Inc", yield: 7.5, bearDraw: [-12, -18], recoveryMo: [10, 18], weight: 0.25 },
  ],
  preservation: [
    { name: "VTEB", label: "Muni Bond",  yield: 3.36, bearDraw: [-5, -10], recoveryMo: [6, 12],  weight: 0.40 },
    { name: "VTES", label: "ST Muni",    yield: 2.34, bearDraw: [-1, -3],  recoveryMo: [2, 6],   weight: 0.25 },
    { name: "JAAA", label: "AAA CLO",    yield: 5.30, bearDraw: [-2, -5],  recoveryMo: [3, 6],   weight: 0.35 },
  ],
};

const PARKING_VEHICLES = [
  { id: "VMSXX", label: "Muni MMF",     yield: 2.50, taxFree: true  },
  { id: "VTES",  label: "ST Muni ETF",  yield: 2.34, taxFree: true  },
  { id: "VMFXX", label: "Fed MMF",      yield: 3.60, taxFree: false },
  { id: "SPAXX", label: "Fidelity Gov", yield: 3.30, taxFree: false },
];

const SEVERITY_LABELS = [
  { max: 20, label: "Mild Correction", color: "#27AE60" },
  { max: 45, label: "Moderate Bear",   color: "#F39C12" },
  { max: 70, label: "Severe Bear",     color: "#E67E22" },
  { max: 90, label: "Deep Recession",  color: "#C0392B" },
  { max: 100, label: "Crisis / Crash",  color: "#7B241C" },
];

// ─── Utility Functions ───────────────────────────────────────────────────────
const fmt  = (n) => "$" + Math.round(n).toLocaleString();
const fmtK = (n) => {
  if (Math.abs(n) >= 1_000_000) return "$" + (n / 1_000_000).toFixed(2) + "M";
  return "$" + (n / 1000).toFixed(0) + "K";
};
const pct  = (n) => (n >= 0 ? "+" : "") + n.toFixed(1) + "%";

const getSeverityMeta = (val) => SEVERITY_LABELS.find(s => val <= s.max) || SEVERITY_LABELS.at(-1);

const weightedDraw = (holdings, severity) =>
  holdings.reduce((sum, h) => sum + h.weight * (h.bearDraw[0] + (h.bearDraw[1] - h.bearDraw[0]) * severity), 0);

const weightedYield = (holdings) =>
  holdings.reduce((sum, h) => sum + h.weight * h.yield, 0);

const weightedRecovery = (holdings, severity) =>
  holdings.reduce((sum, h) => sum + h.weight * (h.recoveryMo[0] + (h.recoveryMo[1] - h.recoveryMo[0]) * severity), 0);

// ─── Styles ──────────────────────────────────────────────────────────────────
const S = {
  root:      { fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", background: "#f4f5f7", minHeight: "100vh", padding: "24px 16px" },
  container: { maxWidth: 960, margin: "0 auto" },
  header:    { textAlign: "center", marginBottom: 28 },
  h1:        { fontSize: 24, color: "#1a1a2e", margin: 0, fontWeight: 800, letterSpacing: -0.5 },
  subtitle:  { fontSize: 13, color: "#888", margin: "6px 0 0 0" },
  card:      (accent) => ({ background: "#fff", borderRadius: 12, padding: "20px 24px", marginBottom: 18, border: "1px solid #e8e8e8", borderTop: `3px solid ${accent}`, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }),
  cardTitle: (color) => ({ margin: "0 0 14px 0", fontSize: 15, color, fontWeight: 700 }),
  grid2:     { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 },
  grid3:     { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 },
  label:     { fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 4 },
  slider:    { width: "100%", accentColor: "#3498DB" },
  bigNum:    (color) => ({ fontSize: 22, fontWeight: 800, color, lineHeight: 1 }),
  smallLabel:{ fontSize: 11, color: "#888", marginTop: 2 },
  pill:      (bg, color) => ({ display: "inline-block", padding: "3px 10px", borderRadius: 12, background: bg, color, fontSize: 11, fontWeight: 700 }),
  btn:       (active) => ({ padding: "8px 14px", borderRadius: 8, border: active ? "2px solid #3498DB" : "1px solid #ddd", background: active ? "#EBF5FB" : "#fff", color: active ? "#2980B9" : "#666", fontWeight: 600, fontSize: 12, cursor: "pointer", transition: "all 0.15s" }),
  divider:   { height: 1, background: "#eee", margin: "16px 0", border: "none" },
  callout:   (bg, border, color) => ({ padding: "14px 16px", background: bg, borderRadius: 8, border: `1px solid ${border}`, marginTop: 12 }),
  table:     { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th:        (i) => ({ background: "#2C3E50", color: "#fff", padding: "9px 12px", textAlign: i === 0 ? "left" : "right", fontWeight: 600, fontSize: 12 }),
  td:        (i, highlight) => ({ padding: "8px 12px", textAlign: i === 0 ? "left" : "right", borderBottom: "1px solid #f0f0f0", fontWeight: i === 0 ? 600 : 400, color: highlight ? highlight : "#333", fontSize: 13 }),
  bar:       { background: "#f0f0f0", borderRadius: 4, height: 12, overflow: "hidden", marginTop: 4 },
  barFill:   (w, color) => ({ width: `${Math.min(w, 100)}%`, background: color, height: "100%", borderRadius: 4, transition: "width 0.4s ease" }),
};

// ─── Sub-Components ──────────────────────────────────────────────────────────
function Card({ title, accent = "#2C3E50", children }) {
  return (
    <div style={S.card(accent)}>
      <h3 style={S.cardTitle(accent)}>{title}</h3>
      {children}
    </div>
  );
}

function MetricBox({ label, value, sub, color = "#2C3E50" }) {
  return (
    <div style={{ textAlign: "center", padding: "12px 8px", background: "#fafafa", borderRadius: 8 }}>
      <div style={S.bigNum(color)}>{value}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: "#555", marginTop: 6 }}>{label}</div>
      {sub && <div style={S.smallLabel}>{sub}</div>}
    </div>
  );
}

function AllocationBar({ label, value, total, color, sub }) {
  const w = (value / total) * 100;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#555" }}>
        <span>{label} <span style={{ color: "#aaa" }}>({w.toFixed(0)}%)</span></span>
        <span style={{ fontWeight: 700, color }}>{fmtK(value)}</span>
      </div>
      <div style={S.bar}><div style={S.barFill(w, color)} /></div>
      {sub && <div style={{ fontSize: 10, color: "#aaa", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function DataTable({ columns, rows }) {
  return (
    <table style={S.table}>
      <thead>
        <tr>{columns.map((c, i) => <th key={i} style={S.th(i)}>{c}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map((row, ri) => (
          <tr key={ri} style={{ background: ri % 2 === 0 ? "#fafafa" : "#fff" }}>
            {row.map((cell, ci) => {
              const highlight = typeof cell === "string" && cell.startsWith("-") ? "#C0392B" : typeof cell === "string" && cell.startsWith("+") ? "#27AE60" : null;
              return <td key={ci} style={S.td(ci, highlight)}>{cell}</td>;
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function BearMarketRebalancer({
  totalPortfolio = 8_600_000,
  growthPct = 40,
  incomeTarget = 325_000,
}) {
  const [rebalancePct, setRebalancePct] = useState(10);
  const [bearSeverity, setBearSeverity] = useState(50);
  const [deployTrigger, setDeployTrigger] = useState(15);
  const [deployTranches, setDeployTranches] = useState(4);
  const [parkingId, setParkingId] = useState("VMSXX");
  const [showDeployDetail, setShowDeployDetail] = useState(false);

  const parking = PARKING_VEHICLES.find(v => v.id === parkingId);
  const severity = bearSeverity / 100;
  const sevMeta = getSeverityMeta(bearSeverity);

  const model = useMemo(() => {
    const rebalanceAmt = totalPortfolio * (rebalancePct / 100);

    // Current allocations
    const curGrowth  = totalPortfolio * (growthPct / 100);
    const curPreserv = totalPortfolio * (1 - growthPct / 100);

    // After rebalance
    const newGrowth  = curGrowth - rebalanceAmt;
    const newPreserv = curPreserv; // unchanged
    const cashReserve = rebalanceAmt;

    // Weighted drawdowns
    const growthDraw  = weightedDraw(HOLDINGS.growth, severity);
    const preservDraw = weightedDraw(HOLDINGS.preservation, severity);

    // Losses — current vs rebalanced
    const origGrowthLoss  = curGrowth * (growthDraw / 100);
    const origPreservLoss = curPreserv * (preservDraw / 100);
    const origTotalLoss   = origGrowthLoss + origPreservLoss;

    const newGrowthLoss  = newGrowth * (growthDraw / 100);
    const newPreservLoss = newPreserv * (preservDraw / 100);
    const newTotalLoss   = newGrowthLoss + newPreservLoss;

    const capitalSaved = Math.abs(origTotalLoss) - Math.abs(newTotalLoss);

    const origBottom = totalPortfolio + origTotalLoss;
    const newBottom  = totalPortfolio + newTotalLoss; // cash excluded from loss

    // Income analysis
    const growthYield  = weightedYield(HOLDINGS.growth) / 100;
    const preservYield = weightedYield(HOLDINGS.preservation) / 100;

    const curIncome = curGrowth * growthYield + curPreserv * preservYield;
    const newIncome = newGrowth * growthYield + newPreserv * preservYield + cashReserve * (parking.yield / 100);
    const incDelta  = newIncome - curIncome;

    // Recovery timeline
    const growthRecovery  = weightedRecovery(HOLDINGS.growth, severity);
    const preservRecovery = weightedRecovery(HOLDINGS.preservation, severity);

    // Deployment math
    const perTranche = cashReserve / deployTranches;
    const tranches = Array.from({ length: deployTranches }, (_, i) => {
      const pctFromPeak = deployTrigger + (i * (deployTrigger * 0.6 / Math.max(deployTranches - 1, 1)));
      const discount = pctFromPeak;
      const sharesGain = ((1 / (1 - discount / 100)) - 1) * 100;
      return { num: i + 1, pctFromPeak, discount, sharesGain, amount: perTranche };
    });
    const avgDiscount = tranches.reduce((s, t) => s + t.discount, 0) / tranches.length;
    const deployGain = cashReserve * (avgDiscount / 100) * 0.60; // conservative: capture 60% of discount

    // Opportunity cost if NO bear
    const missedReturn = rebalanceAmt * 0.10; // assume 10% equity return
    const cashReturn   = rebalanceAmt * (parking.yield / 100);
    const oppCost      = missedReturn - cashReturn;

    // Post-deployment portfolio (bear happens, you deploy, market recovers)
    const postDeployPortfolio = totalPortfolio + deployGain;

    // Scenario comparison table
    const scenarios = [
      { name: "No Bear Market",     portfolioVal: totalPortfolio * 1.10,          income: curIncome * 1.05, note: "10% growth year" },
      { name: "Stay Invested (Bear)", portfolioVal: origBottom,                   income: curIncome * 0.85, note: "Full drawdown" },
      { name: "Rebalance + Deploy",   portfolioVal: newBottom + cashReserve + deployGain, income: newIncome * 0.92, note: "This strategy" },
    ];

    return {
      rebalanceAmt, curGrowth, curPreserv, newGrowth, newPreserv, cashReserve,
      growthDraw, preservDraw,
      origGrowthLoss, origPreservLoss, origTotalLoss, origBottom,
      newGrowthLoss, newPreservLoss, newTotalLoss, newBottom,
      capitalSaved,
      curIncome, newIncome, incDelta,
      growthRecovery, preservRecovery,
      tranches, perTranche, avgDiscount, deployGain,
      oppCost, missedReturn, cashReturn,
      postDeployPortfolio, scenarios,
    };
  }, [totalPortfolio, growthPct, rebalancePct, severity, deployTrigger, deployTranches, parking]);

  return (
    <div style={S.root}>
      <div style={S.container}>
        {/* Header */}
        <div style={S.header}>
          <h1 style={S.h1}>Bear Market Rebalancing Scenario</h1>
          <p style={S.subtitle}>
            Model: Shift {rebalancePct}% from growth &rarr; {parkingId} &rarr; deploy on pullback
          </p>
        </div>

        {/* ── Controls ── */}
        <Card title="Strategy Parameters" accent="#3498DB">
          <div style={S.grid2}>
            <div>
              <label style={S.label}>Capital to Move from Growth Sleeve</label>
              <input type="range" min={5} max={25} step={1} value={rebalancePct} onChange={e => setRebalancePct(+e.target.value)} style={S.slider} />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                <span style={{ fontSize: 11, color: "#aaa" }}>5%</span>
                <span style={S.bigNum("#3498DB")}>{rebalancePct}% <span style={{ fontSize: 13, fontWeight: 400, color: "#888" }}>({fmtK(model.rebalanceAmt)})</span></span>
                <span style={{ fontSize: 11, color: "#aaa" }}>25%</span>
              </div>
            </div>
            <div>
              <label style={S.label}>Bear Market Severity</label>
              <input type="range" min={0} max={100} step={5} value={bearSeverity} onChange={e => setBearSeverity(+e.target.value)} style={{ ...S.slider, accentColor: sevMeta.color }} />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                <span style={{ fontSize: 11, color: "#aaa" }}>Mild</span>
                <span style={S.pill(sevMeta.color + "18", sevMeta.color)}>{sevMeta.label}</span>
                <span style={{ fontSize: 11, color: "#aaa" }}>Crisis</span>
              </div>
            </div>
            <div>
              <label style={S.label}>Deploy Trigger (decline from peak)</label>
              <input type="range" min={10} max={35} step={5} value={deployTrigger} onChange={e => setDeployTrigger(+e.target.value)} style={{ ...S.slider, accentColor: "#C0392B" }} />
              <div style={{ textAlign: "center", marginTop: 4 }}>
                <span style={S.bigNum("#C0392B")}>-{deployTrigger}%</span>
                <span style={{ fontSize: 11, color: "#888", marginLeft: 8 }}>before first tranche</span>
              </div>
            </div>
            <div>
              <label style={S.label}>Number of Deployment Tranches</label>
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                {[2, 3, 4, 5, 6].map(n => (
                  <button key={n} onClick={() => setDeployTranches(n)} style={S.btn(deployTranches === n)}>{n}</button>
                ))}
              </div>
              <div style={{ fontSize: 11, color: "#888", marginTop: 6 }}>{fmtK(model.perTranche)} per tranche</div>
            </div>
          </div>

          <hr style={S.divider} />

          <label style={S.label}>Cash Parking Vehicle</label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginTop: 4 }}>
            {PARKING_VEHICLES.map(v => (
              <button key={v.id} onClick={() => setParkingId(v.id)} style={{ ...S.btn(parkingId === v.id), textAlign: "left", padding: "10px 12px" }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{v.id}</div>
                <div style={{ fontSize: 10, color: "#888", marginTop: 2 }}>{v.yield}% {v.taxFree ? "(tax-free)" : "(taxable)"}</div>
              </button>
            ))}
          </div>
        </Card>

        {/* ── Allocation Shift Visual ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 36px 1fr", gap: 0, marginBottom: 18 }}>
          <Card title="Current Allocation" accent="#95A5A6">
            <AllocationBar label="Growth" value={model.curGrowth} total={totalPortfolio} color="#E74C3C" />
            <AllocationBar label="Preservation" value={model.curPreserv} total={totalPortfolio} color="#3498DB" />
            <AllocationBar label="Cash" value={0} total={totalPortfolio} color="#F39C12" />
            <div style={{ padding: "8px 10px", background: "#f9f9f9", borderRadius: 6, fontSize: 12, marginTop: 8 }}>
              Est. Income: <strong style={{ color: "#27AE60" }}>{fmtK(model.curIncome)}</strong>/yr
            </div>
          </Card>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, color: "#3498DB" }}>&rarr;</div>
          <Card title="After Rebalance" accent="#3498DB">
            <AllocationBar label="Growth" value={model.newGrowth} total={totalPortfolio} color="#E74C3C" />
            <AllocationBar label="Preservation" value={model.newPreserv} total={totalPortfolio} color="#3498DB" />
            <AllocationBar label={`Cash (${parkingId})`} value={model.cashReserve} total={totalPortfolio} color="#F39C12" sub={`Earning ${parking.yield}% while waiting`} />
            <div style={{ padding: "8px 10px", background: model.incDelta >= 0 ? "#eafaf1" : "#fef5f0", borderRadius: 6, fontSize: 12, marginTop: 8 }}>
              Est. Income: <strong style={{ color: model.incDelta >= 0 ? "#27AE60" : "#E67E22" }}>{fmtK(model.newIncome)}</strong>/yr
              <span style={{ color: "#888", marginLeft: 6 }}>({model.incDelta >= 0 ? "+" : ""}{fmtK(model.incDelta)})</span>
            </div>
          </Card>
        </div>

        {/* ── Key Metrics ── */}
        <div style={S.grid3}>
          <MetricBox label="Capital Preserved" value={fmtK(model.capitalSaved)} sub="vs staying fully invested" color="#27AE60" />
          <MetricBox label="Deployment Gain" value={fmtK(model.deployGain)} sub={`buying at avg ${model.avgDiscount.toFixed(0)}% discount`} color="#3498DB" />
          <MetricBox label="Net Advantage" value={fmtK(model.capitalSaved + model.deployGain)} sub="total benefit if bear materializes" color="#2C3E50" />
        </div>

        <div style={{ height: 18 }} />

        {/* ── Bear Market Impact ── */}
        <Card title="Bear Market Impact: Side-by-Side" accent="#C0392B">
          <DataTable
            columns={["", "Stay Invested", "Rebalance Strategy", "Delta"]}
            rows={[
              ["Growth loss", fmt(model.origGrowthLoss), fmt(model.newGrowthLoss), "+" + fmtK(Math.abs(model.origGrowthLoss) - Math.abs(model.newGrowthLoss))],
              ["Preservation loss", fmt(model.origPreservLoss), fmt(model.newPreservLoss), "$0"],
              ["Cash loss", "$0", "$0", fmtK(model.cashReserve) + " protected"],
              ["Total loss", fmt(model.origTotalLoss), fmt(model.newTotalLoss), "+" + fmtK(model.capitalSaved)],
              ["Portfolio at bottom", fmt(model.origBottom), fmt(model.newBottom + model.cashReserve), "+" + fmtK((model.newBottom + model.cashReserve) - model.origBottom)],
              ["Est. recovery", Math.round(model.growthRecovery) + " months", Math.round(model.growthRecovery * 0.75) + " months", "Faster (deploy at lows)"],
            ]}
          />
        </Card>

        {/* ── Deployment Plan ── */}
        <Card title="Pullback Deployment Schedule" accent="#27AE60">
          <div style={{ fontSize: 13, color: "#555", marginBottom: 12 }}>
            Deploy <strong>{fmtK(model.rebalanceAmt)}</strong> in <strong>{deployTranches} tranches</strong> of <strong>{fmtK(model.perTranche)}</strong> as market declines past <strong>-{deployTrigger}%</strong> from peak.
          </div>
          <DataTable
            columns={["Tranche", "Trigger Level", "Amount", "Discount", "Extra Shares vs Peak"]}
            rows={model.tranches.map(t => [
              `#${t.num}`,
              `-${t.pctFromPeak.toFixed(1)}%`,
              fmtK(t.amount),
              `${t.discount.toFixed(1)}% off`,
              `+${t.sharesGain.toFixed(1)}%`,
            ])}
          />
          <div style={S.callout("#EAFAF1", "#82E0AA", "#27AE60")}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#27AE60" }}>
              Estimated Recovery Bonus: {fmtK(model.deployGain)}
            </div>
            <div style={{ fontSize: 11, color: "#666", marginTop: 4 }}>
              Assumes market recovers to pre-drawdown levels. Conservative estimate captures 60% of the theoretical discount
              (accounting for imperfect timing and the fact that you won't buy at the exact bottom).
            </div>
          </div>
        </Card>

        {/* ── Scenario Comparison ── */}
        <Card title="3-Scenario Comparison (24-Month Horizon)" accent="#2C3E50">
          <DataTable
            columns={["Scenario", "Portfolio Value", "Est. Income", "Notes"]}
            rows={model.scenarios.map(s => [
              s.name,
              fmt(s.portfolioVal),
              fmtK(s.income),
              s.note,
            ])}
          />
        </Card>

        {/* ── Opportunity Cost ── */}
        <Card title="Opportunity Cost: What If No Bear Market?" accent="#E67E22">
          <div style={{ fontSize: 13, color: "#555", marginBottom: 14 }}>
            If equities return ~10% over the next 12 months and no meaningful pullback occurs:
          </div>
          <div style={S.grid3}>
            <MetricBox label="Missed Equity Return" value={fmtK(model.missedReturn)} color="#C0392B" sub="on parked cash" />
            <MetricBox label="Cash Yield Earned" value={fmtK(model.cashReturn)} color="#27AE60" sub={`${parking.yield}% from ${parkingId}`} />
            <MetricBox label="Net Opportunity Cost" value={fmtK(model.oppCost)} color="#E67E22" sub="cost of being wrong" />
          </div>
          <div style={S.callout("#FEF9E7", "#F9E79F", "#E67E22")}>
            <div style={{ fontSize: 12, color: "#7D6608" }}>
              <strong>Context:</strong> On {fmtK(totalPortfolio)}, a {fmtK(model.oppCost)} opportunity cost represents {(model.oppCost / totalPortfolio * 100).toFixed(2)}% of your portfolio.
              That's the "insurance premium" for having dry powder ready to deploy. If the bear materializes, the net advantage ({fmtK(model.capitalSaved + model.deployGain)}) far exceeds this cost.
            </div>
          </div>
        </Card>

        {/* ── Position Detail ── */}
        <Card title="Holding-Level Bear Impact" accent="#8E44AD">
          <DataTable
            columns={["Holding", "Sleeve", "Bear Drawdown", "Recovery", "Yield Impact"]}
            rows={[
              ...HOLDINGS.growth.map(h => {
                const draw = h.bearDraw[0] + (h.bearDraw[1] - h.bearDraw[0]) * severity;
                const rec = h.recoveryMo[0] + (h.recoveryMo[1] - h.recoveryMo[0]) * severity;
                return [h.name, "Growth", `${draw.toFixed(0)}%`, `${Math.round(rec)} mo`, `Yield may compress 10-15%`];
              }),
              ...HOLDINGS.preservation.map(h => {
                const draw = h.bearDraw[0] + (h.bearDraw[1] - h.bearDraw[0]) * severity;
                const rec = h.recoveryMo[0] + (h.recoveryMo[1] - h.recoveryMo[0]) * severity;
                return [h.name, "Preservation", `${draw.toFixed(0)}%`, `${Math.round(rec)} mo`, h.name === "JAAA" ? "Floating rate declines w/ cuts" : "Income largely stable"];
              }),
            ]}
          />
        </Card>

        {/* ── Footer ── */}
        <div style={{ textAlign: "center", padding: "20px 0", fontSize: 11, color: "#bbb" }}>
          Portfolio Scenario Planner &bull; Not Financial Advice &bull; Consult a qualified professional &bull; Generated March 2026
        </div>
      </div>
    </div>
  );
}
