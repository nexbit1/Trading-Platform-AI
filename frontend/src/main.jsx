import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const API_BASE = import.meta.env.VITE_API_URL || "";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const number = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
});

const traderAccents = ["#00b8d9", "#25c06d", "#f2b84b", "#e2557c"];

async function fetchJson(path) {
  const response = await fetch(`${API_BASE}${path}`);
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }
  return response.json();
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Stat({ label, value, tone = "neutral" }) {
  return (
    <div className={`stat stat-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function MiniLineChart({ data, accent }) {
  const points = useMemo(() => {
    if (!data?.length) return [];
    const values = data.map((item) => Number(item.value || 0));
    const min = Math.min(...values);
    const max = Math.max(...values);
    const spread = max - min || 1;
    return data.map((item, index) => {
      const x = data.length === 1 ? 50 : (index / (data.length - 1)) * 100;
      const y = 92 - ((Number(item.value || 0) - min) / spread) * 78;
      return { x, y, value: item.value, datetime: item.datetime };
    });
  }, [data]);

  if (!points.length) {
    return <div className="empty-chart">No portfolio history yet</div>;
  }

  const path = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");
  const area = `${path} L 100 100 L 0 100 Z`;
  const first = points[0];
  const last = points[points.length - 1];

  return (
    <div className="chart-wrap">
      <svg className="chart" viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="Portfolio value chart">
        <defs>
          <linearGradient id={`fill-${accent.replace("#", "")}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity="0.32" />
            <stop offset="100%" stopColor={accent} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#fill-${accent.replace("#", "")})`} />
        <path d={path} fill="none" stroke={accent} strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
        <circle cx={last.x} cy={last.y} r="2.4" fill={accent} vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="chart-axis">
        <span>{formatDate(first.datetime)}</span>
        <span>{formatDate(last.datetime)}</span>
      </div>
    </div>
  );
}

function Logs({ logs }) {
  return (
    <div className="logs">
      {logs?.length ? (
        logs.map((log, index) => (
          <div className="log-line" key={`${log.datetime}-${index}`} style={{ color: log.color }}>
            <span>{formatDate(log.datetime)}</span>
            <b>[{log.type}]</b>
            <p>{log.message}</p>
          </div>
        ))
      ) : (
        <div className="empty-state">No recent logs</div>
      )}
    </div>
  );
}

function TraderCard({ trader, index }) {
  const accent = traderAccents[index % traderAccents.length];
  const pnl = Number(trader.pnl || 0);
  const pnlTone = pnl >= 0 ? "positive" : "negative";
  const holdingsValue = trader.holdings?.reduce((sum, item) => sum + Number(item.market_value || 0), 0) || 0;

  return (
    <article className="trader-card" style={{ "--accent": accent }}>
      <header className="trader-header">
        <div>
          <h2>{trader.name}</h2>
          <p>
            {trader.lastname} · {trader.model_name}
          </p>
        </div>
        <div className={`pnl-pill ${pnlTone}`}>{pnl >= 0 ? "+" : ""}{money.format(pnl)}</div>
      </header>

      <section className="value-band">
        <span>Portfolio Value</span>
        <strong>{money.format(Number(trader.portfolio_value || 0))}</strong>
      </section>

      <div className="stats-grid">
        <Stat label="Cash" value={money.format(Number(trader.balance || 0))} />
        <Stat label="Holdings" value={money.format(holdingsValue)} />
        <Stat label="Positions" value={trader.holdings?.length || 0} />
      </div>

      <MiniLineChart data={trader.time_series} accent={accent} />

      <div className="strategy">
        <span>Strategy</span>
        <p>{trader.strategy || "No strategy saved yet."}</p>
      </div>

      <div className="tables">
        <section>
          <div className="section-title">Holdings</div>
          <div className="table-shell compact">
            <table>
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Qty</th>
                  <th>Price</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                {trader.holdings?.length ? (
                  trader.holdings.map((holding) => (
                    <tr key={holding.symbol}>
                      <td>{holding.symbol}</td>
                      <td>{number.format(holding.quantity)}</td>
                      <td>{money.format(Number(holding.price || 0))}</td>
                      <td>{money.format(Number(holding.market_value || 0))}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4">No holdings</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <div className="section-title">Recent Transactions</div>
          <div className="table-shell">
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Symbol</th>
                  <th>Qty</th>
                  <th>Price</th>
                </tr>
              </thead>
              <tbody>
                {trader.transactions?.length ? (
                  trader.transactions.slice(-6).reverse().map((transaction, itemIndex) => (
                    <tr key={`${transaction.timestamp}-${transaction.symbol}-${itemIndex}`}>
                      <td>{formatDate(transaction.timestamp)}</td>
                      <td>{transaction.symbol}</td>
                      <td className={Number(transaction.quantity) >= 0 ? "buy" : "sell"}>
                        {number.format(transaction.quantity)}
                      </td>
                      <td>{money.format(Number(transaction.price || 0))}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4">No transactions</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section>
        <div className="section-title">Live Logs</div>
        <Logs logs={trader.logs} />
      </section>
    </article>
  );
}

function App() {
  const [market, setMarket] = useState(null);
  const [traders, setTraders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadDashboard = useCallback(async () => {
    try {
      setError("");
      const [marketState, roster] = await Promise.all([fetchJson("/api/market"), fetchJson("/api/traders")]);
      const traderDetails = await Promise.all(
        roster.map(async (trader) => {
          const [detail, logs] = await Promise.all([
            fetchJson(`/api/traders/${encodeURIComponent(trader.name)}`),
            fetchJson(`/api/traders/${encodeURIComponent(trader.name)}/logs`),
          ]);
          return { ...detail, logs };
        }),
      );
      setMarket(marketState);
      setTraders(traderDetails);
      setLastUpdated(new Date());
    } catch (err) {
      setError(`Could not load trading data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
    const timer = window.setInterval(loadDashboard, 30000);
    return () => window.clearInterval(timer);
  }, [loadDashboard]);

  const totalValue = traders.reduce((sum, trader) => sum + Number(trader.portfolio_value || 0), 0);
  const totalPnl = traders.reduce((sum, trader) => sum + Number(trader.pnl || 0), 0);

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">AI Trading Platform</p>
          <h1>Trading Floor</h1>
        </div>
        <div className="top-actions">
          <div className={`market-badge ${market?.is_market_open ? "open" : "closed"}`}>
            <span />
            {market?.is_market_open ? "Market Open" : "Market Closed"}
          </div>
          <button type="button" onClick={loadDashboard}>Refresh</button>
        </div>
      </header>

      <section className="overview">
        <Stat label="Total Portfolio Value" value={money.format(totalValue)} />
        <Stat label="Total P/L" value={`${totalPnl >= 0 ? "+" : ""}${money.format(totalPnl)}`} tone={totalPnl >= 0 ? "positive" : "negative"} />
        <Stat label="Price Source" value={market?.source || "-"} />
        <Stat label="Last Updated" value={lastUpdated ? lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-"} />
      </section>

      {error && (
        <div className="error-box">
          {error}. Make sure FastAPI is running on port 8000.
        </div>
      )}

      {loading ? (
        <div className="loading">Loading trading floor...</div>
      ) : (
        <section className="trader-grid">
          {traders.map((trader, index) => (
            <TraderCard trader={trader} index={index} key={trader.name} />
          ))}
        </section>
      )}
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
