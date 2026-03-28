import { useState, useEffect, useRef, useCallback } from "react";

/* ─── Market config ────────────────────────────────────────────────────── */
const CRYPTO = {
  "BTC/USD": { cgId: "bitcoin",  base: 68000,  dec: 1, spread: 15,      vol: 400,  contract: 1,      cat: "crypto", icon: "₿", color: "#F7931A" },
  "ETH/USD": { cgId: "ethereum", base: 3500,   dec: 2, spread: 1.5,     vol: 40,   contract: 1,      cat: "crypto", icon: "Ξ", color: "#627EEA" },
  "SOL/USD": { cgId: "solana",   base: 180,    dec: 3, spread: 0.08,    vol: 3,    contract: 1,      cat: "crypto", icon: "◎", color: "#9945FF" },
  "XRP/USD": { cgId: "ripple",   base: 0.52,   dec: 5, spread: 0.0003,  vol: 0.006,contract: 1000,   cat: "crypto", icon: "✕", color: "#00AAE4" },
};

const FOREX = {
  "XAU/USD": { base: 2320,   dec: 2, spread: 0.5,     vol: 3.0,    contract: 100,    cat: "gold",  icon: "Au", color: "#FFD700" },
  "EUR/USD": { base: 1.0845, dec: 5, spread: 0.00012, vol: 0.0003, contract: 100000, cat: "forex", icon: "€",  color: "#4FC3F7" },
  "GBP/USD": { base: 1.2710, dec: 5, spread: 0.00015, vol: 0.0004, contract: 100000, cat: "forex", icon: "£",  color: "#81C784" },
  "USD/JPY": { base: 149.85, dec: 3, spread: 0.015,   vol: 0.04,   contract: 100000, cat: "forex", icon: "¥",  color: "#FF8A65" },
  "AUD/USD": { base: 0.6540, dec: 5, spread: 0.00014, vol: 0.0003, contract: 100000, cat: "forex", icon: "A$", color: "#FFD54F" },
  "USD/CAD": { base: 1.3620, dec: 5, spread: 0.00016, vol: 0.0003, contract: 100000, cat: "forex", icon: "C$", color: "#F48FB1" },
  "USD/CHF": { base: 0.9020, dec: 5, spread: 0.00014, vol: 0.0003, contract: 100000, cat: "forex", icon: "Fr", color: "#CE93D8" },
  "EUR/GBP": { base: 0.8535, dec: 5, spread: 0.00015, vol: 0.0002, contract: 100000, cat: "forex", icon: "€£", color: "#80DEEA" },
  "EUR/JPY": { base: 162.40, dec: 3, spread: 0.018,   vol: 0.05,   contract: 100000, cat: "forex", icon: "€¥", color: "#FFAB91" },
  "GBP/JPY": { base: 190.25, dec: 3, spread: 0.022,   vol: 0.06,   contract: 100000, cat: "forex", icon: "£¥", color: "#A5D6A7" },
  "NZD/USD": { base: 0.6115, dec: 5, spread: 0.00018, vol: 0.0003, contract: 100000, cat: "forex", icon: "NZ", color: "#90CAF9" },
};

const ALL_PAIRS = { ...CRYPTO, ...FOREX };
const STARTING_BALANCE = 10000;

function isForexOpen() {
  const now = new Date();
  const day = now.getUTCDay();
  const hour = now.getUTCHours();
  if (day === 0) return false;
  if (day === 6) return false;
  if (day === 5 && hour >= 22) return false;
  return true;
}

function genCandles(sym, base, count = 80) {
  const { vol, dec } = ALL_PAIRS[sym];
  let price = base;
  return Array.from({ length: count }, () => {
    const o = price;
    const c = +(o + (Math.random() - 0.499) * vol * 3).toFixed(dec);
    const h = +(Math.max(o, c) + Math.random() * vol).toFixed(dec);
    const l = +(Math.min(o, c) - Math.random() * vol).toFixed(dec);
    price = c;
    return { o, h, l, c };
  });
}

function Chart({ candles, sym }) {
  if (!candles.length) return null;
  const W = 380, H = 160, PL = 56, PB = 16, PT = 8, PR = 4;
  const cW = W - PL - PR, cH = H - PT - PB;
  const maxP = Math.max(...candles.map(c => c.h));
  const minP = Math.min(...candles.map(c => c.l));
  const range = maxP - minP || 0.001;
  const sy = p => PT + cH - ((p - minP) / range) * cH;
  const n = candles.length;
  const bw = Math.max(1.5, cW / n - 1);
  const col = ALL_PAIRS[sym].color;
  const areaPoints = candles.map((c, i) => `${PL + (i / (n - 1)) * cW},${sy(c.c)}`).join(" ");
  const lastY = sy(candles[candles.length - 1].c);
  const gradId = `area-${sym.replace("/", "")}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "100%", display: "block" }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={col} stopOpacity="0.18" />
          <stop offset="100%" stopColor={col} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 1, 2, 3].map(i => {
        const p = minP + (range / 3) * i;
        const y = sy(p);
        return (
          <g key={i}>
            <line x1={PL} y1={y} x2={W - PR} y2={y} stroke="#ffffff08" strokeWidth="1" />
            <text x={PL - 4} y={y + 3.5} fill="#ffffff30" fontSize="8.5" textAnchor="end" fontFamily="JetBrains Mono, monospace">
              {p.toFixed(ALL_PAIRS[sym].dec)}
            </text>
          </g>
        );
      })}
      <polygon points={`${PL},${PT + cH} ${areaPoints} ${PL + cW},${PT + cH}`} fill={`url(#${gradId})`} />
      {candles.map((c, i) => {
        const x = PL + (i / (n - 1)) * cW;
        const bull = c.c >= c.o;
        const color = bull ? "#34d399" : "#f87171";
        const top = sy(Math.max(c.o, c.c));
        const bot = sy(Math.min(c.o, c.c));
        return (
          <g key={i}>
            <line x1={x} y1={sy(c.h)} x2={x} y2={sy(c.l)} stroke={color} strokeWidth="0.7" opacity="0.7" />
            <rect x={x - bw / 2} y={top} width={bw} height={Math.max(1, bot - top)} fill={color} rx="0.5" opacity="0.9" />
          </g>
        );
      })}
      <line x1={PL} y1={lastY} x2={W - PR} y2={lastY} stroke={col} strokeWidth="0.8" strokeDasharray="4,4" opacity="0.5" />
    </svg>
  );
}

function Spark({ candles }) {
  if (candles.length < 2) return null;
  const vals = candles.map(c => c.c);
  const min = Math.min(...vals), max = Math.max(...vals);
  const range = max - min || 1;
  const W = 80, H = 32;
  const pts = vals.map((v, i) => `${(i / (vals.length - 1)) * W},${H - ((v - min) / range) * H}`).join(" ");
  const isUp = vals[vals.length - 1] >= vals[0];
  const col = isUp ? "#34d399" : "#f87171";
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="80" height="32">
      <polyline points={pts} fill="none" stroke={col} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function App() {
  const [tab, setTab] = useState("market");
  const [balance, setBalance] = useState(STARTING_BALANCE);
  const [equity, setEquity] = useState(STARTING_BALANCE);
  const [sym, setSym] = useState("BTC/USD");
  const [filter, setFilter] = useState("all");
  const [forexOpen] = useState(isForexOpen());

  const [prices, setPrices] = useState(() =>
    Object.fromEntries(Object.entries(ALL_PAIRS).map(([k, v]) => [k, v.base]))
  );
  const [prevPrices, setPrevPrices] = useState(() =>
    Object.fromEntries(Object.entries(ALL_PAIRS).map(([k, v]) => [k, v.base]))
  );
  const [candles, setCandles] = useState(() => genCandles("BTC/USD", ALL_PAIRS["BTC/USD"].base));
  const [candleMap, setCandleMap] = useState(() =>
    Object.fromEntries(Object.keys(ALL_PAIRS).map(k => [k, genCandles(k, ALL_PAIRS[k].base)]))
  );
  const [trades, setTrades] = useState([]);
  const [history, setHistory] = useState([]);
  const [lots, setLots] = useState(0.01);
  const [dir, setDir] = useState("BUY");
  const [toast, setToast] = useState(null);
  const [ad, setAd] = useState(false);
  const [adSec, setAdSec] = useState(5);
  const [liveStatus, setLiveStatus] = useState("loading");
  const [lastFetch, setLastFetch] = useState(null);
  const pendingRef = useRef(null);
  const tradeCount = useRef(0);
  const realRef = useRef({});

  // Inject Google Fonts once
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;600;700&display=swap";
    document.head.appendChild(link);
  }, []);

  const fetchCrypto = useCallback(async () => {
    try {
      const ids = Object.values(CRYPTO).map(v => v.cgId).join(",");
      const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`);
      const data = await res.json();
      const map = {};
      Object.entries(CRYPTO).forEach(([sym, cfg]) => {
        const val = data[cfg.cgId]?.usd;
        if (val) map[sym] = +val.toFixed(cfg.dec);
      });
      return map;
    } catch { return null; }
  }, []);

  const fetchForex = useCallback(async () => {
    if (!forexOpen) return null;
    try {
      const res = await fetch("https://api.frankfurter.app/latest?from=USD&to=EUR,GBP,JPY,AUD,CAD,CHF,NZD");
      const data = await res.json();
      const r = data.rates;
      const goldRes = await fetch("https://api.metals.live/v1/spot/gold");
      const goldData = await goldRes.json();
      return {
        "XAU/USD": +(goldData[0]?.gold ?? 2320).toFixed(2),
        "EUR/USD": +(1 / r.EUR).toFixed(5),
        "GBP/USD": +(1 / r.GBP).toFixed(5),
        "USD/JPY": +r.JPY.toFixed(3),
        "AUD/USD": +(1 / r.AUD).toFixed(5),
        "USD/CAD": +r.CAD.toFixed(5),
        "USD/CHF": +r.CHF.toFixed(5),
        "NZD/USD": +(1 / r.NZD).toFixed(5),
        "EUR/GBP": +((1 / r.EUR) * r.GBP).toFixed(5),
        "EUR/JPY": +((1 / r.EUR) * r.JPY).toFixed(3),
        "GBP/JPY": +((1 / r.GBP) * r.JPY).toFixed(3),
      };
    } catch { return null; }
  }, [forexOpen]);

  const loadPrices = useCallback(async () => {
    setLiveStatus("loading");
    const [crypto, forex] = await Promise.all([fetchCrypto(), fetchForex()]);
    const merged = { ...(crypto || {}), ...(forex || {}) };
    if (Object.keys(merged).length > 0) {
      realRef.current = { ...realRef.current, ...merged };
      setPrevPrices(p => ({ ...p }));
      setPrices(prev => ({ ...prev, ...merged }));
      setLiveStatus(Object.keys(crypto || {}).length > 0 ? "live" : "partial");
      setLastFetch(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    } else {
      setLiveStatus("sim");
    }
  }, [fetchCrypto, fetchForex]);

  useEffect(() => {
    loadPrices();
    const id = setInterval(loadPrices, 30000);
    return () => clearInterval(id);
  }, [loadPrices]);

  useEffect(() => {
    const id = setInterval(() => {
      setPrevPrices(p => ({ ...p }));
      setPrices(prev => {
        const next = { ...prev };
        Object.entries(ALL_PAIRS).forEach(([k, cfg]) => {
          if (cfg.cat !== "crypto" && !forexOpen) return;
          const base = realRef.current[k] ?? cfg.base;
          const noise = (Math.random() - 0.499) * cfg.vol * 0.6;
          const pull = (base - prev[k]) * 0.08;
          next[k] = +(prev[k] + noise + pull).toFixed(cfg.dec);
        });
        return next;
      });
      setCandleMap(prev => {
        const next = { ...prev };
        Object.entries(ALL_PAIRS).forEach(([k, cfg]) => {
          if (cfg.cat !== "crypto" && !forexOpen) return;
          const last = prev[k][prev[k].length - 1];
          const o = last.c;
          const c = +(o + (Math.random() - 0.499) * cfg.vol * 0.5).toFixed(cfg.dec);
          const h = +(Math.max(o, c) + Math.random() * cfg.vol * 0.3).toFixed(cfg.dec);
          const l = +(Math.min(o, c) - Math.random() * cfg.vol * 0.3).toFixed(cfg.dec);
          next[k] = [...prev[k].slice(-79), { o, h, l, c }];
        });
        return next;
      });
    }, 1500);
    return () => clearInterval(id);
  }, [forexOpen]);

  useEffect(() => {
    setCandles(candleMap[sym] || genCandles(sym, prices[sym] ?? ALL_PAIRS[sym].base));
  }, [sym, candleMap]);

  useEffect(() => {
    let unreal = 0;
    trades.forEach(t => {
      const cur = prices[t.sym] ?? t.entry;
      const delta = t.dir === "BUY" ? cur - t.entry : t.entry - cur;
      unreal += delta * ALL_PAIRS[t.sym].contract * t.lots;
    });
    setEquity(+(balance + unreal).toFixed(2));
  }, [prices, trades, balance]);

  useEffect(() => {
    if (!ad) return;
    if (adSec > 0) {
      const t = setTimeout(() => setAdSec(s => s - 1), 1000);
      return () => clearTimeout(t);
    }
    setAd(false);
    if (pendingRef.current) { doOpen(pendingRef.current); pendingRef.current = null; }
  }, [ad, adSec]);

  const showToast = (msg, type = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2600);
  };

  const doOpen = ({ sym, dir, lots, entry }) => {
    const cfg = ALL_PAIRS[sym];
    const margin = lots * cfg.contract * entry * 0.01;
    if (margin > balance) { showToast("Insufficient margin!", "err"); return; }
    setTrades(prev => [...prev, { id: Date.now(), sym, dir, lots, entry, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }]);
    showToast(`${dir} ${lots} lot ${sym} opened ✓`);
  };

  const openTrade = () => {
    const cfg = ALL_PAIRS[sym];
    if (cfg.cat !== "crypto" && !forexOpen) { showToast("Market is closed today 🔒", "warn"); return; }
    tradeCount.current++;
    const entry = dir === "BUY"
      ? +(prices[sym] + cfg.spread / 2).toFixed(cfg.dec)
      : +(prices[sym] - cfg.spread / 2).toFixed(cfg.dec);
    const tradeData = { sym, dir, lots, entry };
    if (tradeCount.current % 3 === 0) { pendingRef.current = tradeData; setAdSec(5); setAd(true); return; }
    doOpen(tradeData);
  };

  const closeTrade = (id) => {
    const t = trades.find(x => x.id === id); if (!t) return;
    const cur = prices[t.sym] ?? t.entry;
    const delta = t.dir === "BUY" ? cur - t.entry : t.entry - cur;
    const pnl = +(delta * ALL_PAIRS[t.sym].contract * t.lots).toFixed(2);
    setBalance(b => +(b + pnl).toFixed(2));
    setTrades(prev => prev.filter(x => x.id !== id));
    setHistory(prev => [{ ...t, exit: cur, pnl, closeTime: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }, ...prev]);
    showToast(`${pnl >= 0 ? "+" : ""}$${pnl.toFixed(2)} ${pnl >= 0 ? "🎉" : "📉"}`, pnl >= 0 ? "ok" : "err");
  };

  const totalPnL = +(equity - STARTING_BALANCE).toFixed(2);
  const wins = history.filter(h => h.pnl > 0).length;
  const winRate = history.length ? Math.round((wins / history.length) * 100) : 0;
  const cfg = ALL_PAIRS[sym];
  const bid = +(prices[sym] - cfg.spread / 2).toFixed(cfg.dec);
  const ask = +(prices[sym] + cfg.spread / 2).toFixed(cfg.dec);
  const isSymClosed = cfg.cat !== "crypto" && !forexOpen;

  const filteredPairs = Object.entries(ALL_PAIRS).filter(([, v]) =>
    filter === "all" || v.cat === filter || (filter === "gold" && v.cat === "gold")
  );

  const css = `
    * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
    body { margin: 0; background: #080B12; }
    ::-webkit-scrollbar { display: none; }
    @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.25} }
    @keyframes slideIn { from{opacity:0;transform:translateY(-10px)} to{opacity:1;transform:translateY(0)} }
    .pair-btn:hover { opacity: 0.85; transform: scale(0.98); }
    .card:hover { border-color: #ffffff18 !important; }
    .tab-btn { transition: all 0.2s; }
    .tab-btn:active { transform: scale(0.92); }
    .trade-btn:active { transform: scale(0.97); opacity: 0.9; }
  `;

  return (
    <div style={{ fontFamily: "'Outfit', sans-serif", background: "#080B12", minHeight: "100vh", color: "#E8F0FE", maxWidth: 430, margin: "0 auto", position: "relative", overflow: "hidden" }}>
      <style>{css}</style>

      {/* AD OVERLAY */}
      {ad && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(8,11,18,0.96)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: "#0F1724", border: "1px solid #ffffff12", borderRadius: 24, padding: 28, width: "100%", maxWidth: 340, textAlign: "center", animation: "fadeUp 0.3s ease" }}>
            <div style={{ fontSize: 9, color: "#ffffff30", letterSpacing: 3, marginBottom: 20, textTransform: "uppercase" }}>Sponsored</div>
            <div style={{ background: "linear-gradient(135deg,#1a0f30,#2d1b5e)", borderRadius: 16, padding: "32px 20px", marginBottom: 22, border: "1px solid #6C3EFF30" }}>
              <div style={{ fontSize: 44, marginBottom: 12 }}>🚀</div>
              <div style={{ fontSize: 19, fontWeight: 800, color: "#A78BFA", marginBottom: 8 }}>Crypto Pro Signals</div>
              <div style={{ fontSize: 13, color: "#7C5CBF", lineHeight: 1.7 }}>Live BTC & ETH signals with 78% accuracy. Join 100K+ traders.</div>
              <div style={{ marginTop: 18, background: "linear-gradient(135deg,#6C3EFF,#A78BFA)", color: "#fff", borderRadius: 10, padding: "10px 24px", fontWeight: 700, fontSize: 14, display: "inline-block" }}>Start Free →</div>
            </div>
            <div style={{ color: "#ffffff40", fontSize: 13 }}>
              {adSec > 0 ? <>Skip in <span style={{ color: "#A78BFA", fontWeight: 700 }}>{adSec}s</span></> : <span style={{ color: "#34d399" }}>Opening your trade…</span>}
            </div>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toast && (
        <div style={{
          position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)",
          background: toast.type === "err" ? "#2D0F0F" : toast.type === "warn" ? "#1F1A00" : "#0D2A1A",
          border: `1px solid ${toast.type === "err" ? "#f87171" : toast.type === "warn" ? "#FBBF24" : "#34d399"}44`,
          color: toast.type === "err" ? "#f87171" : toast.type === "warn" ? "#FBBF24" : "#34d399",
          padding: "11px 22px", borderRadius: 40, fontWeight: 600, fontSize: 13,
          zIndex: 8000, whiteSpace: "nowrap", animation: "slideIn 0.25s ease",
        }}>{toast.msg}</div>
      )}

      {/* HEADER */}
      <div style={{ padding: "20px 20px 0", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 11, color: "#ffffff30", letterSpacing: 3, textTransform: "uppercase", marginBottom: 2 }}>Paper Trading</div>
          <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: -1, background: "linear-gradient(135deg,#60A5FA,#A78BFA)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Aryan Trade App</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, background: "#0F1724", border: `1px solid ${liveStatus === "live" || liveStatus === "partial" ? "#34d39920" : "#ffffff10"}`, borderRadius: 20, padding: "4px 10px" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", display: "inline-block", background: liveStatus === "live" || liveStatus === "partial" ? "#34d399" : liveStatus === "loading" ? "#60A5FA" : "#6B7280", animation: liveStatus === "live" ? "pulse 2s infinite" : "none" }} />
            <span style={{ fontSize: 10, fontWeight: 600, color: liveStatus === "live" || liveStatus === "partial" ? "#34d399" : liveStatus === "loading" ? "#60A5FA" : "#6B7280", letterSpacing: 1 }}>
              {liveStatus === "live" ? "LIVE" : liveStatus === "partial" ? "CRYPTO LIVE" : liveStatus === "loading" ? "LOADING" : "SIMULATED"}
            </span>
          </div>
          {lastFetch && <div style={{ fontSize: 10, color: "#ffffff25" }}>Refreshed {lastFetch}</div>}
        </div>
      </div>

      {/* EQUITY CARD */}
      <div style={{ margin: "16px 16px 0", background: "linear-gradient(135deg,#0F1724,#131C2E)", border: "1px solid #ffffff0D", borderRadius: 20, padding: "20px 20px 18px", position: "relative", overflow: "hidden" }}>
        <div style={{ fontSize: 11, color: "#ffffff35", letterSpacing: 2, textTransform: "uppercase", marginBottom: 4 }}>Total Equity</div>
        <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: -1.5, color: equity >= STARTING_BALANCE ? "#E8F0FE" : "#f87171", marginBottom: 14 }}>
          ${equity.toLocaleString("en-US", { minimumFractionDigits: 2 })}
        </div>
        <div style={{ display: "flex" }}>
          {[
            { label: "Balance", val: `$${balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}`, col: "#E8F0FE" },
            { label: "P&L", val: `${totalPnL >= 0 ? "+" : ""}$${Math.abs(totalPnL).toFixed(2)}`, col: totalPnL >= 0 ? "#34d399" : "#f87171" },
            { label: "Win Rate", val: `${winRate}%`, col: "#60A5FA" },
            { label: "Closed", val: history.length, col: "#A78BFA" },
          ].map((x, i) => (
            <div key={i} style={{ flex: 1, borderRight: i < 3 ? "1px solid #ffffff08" : "none", paddingRight: 8, paddingLeft: i > 0 ? 8 : 0 }}>
              <div style={{ fontSize: 9, color: "#ffffff30", letterSpacing: 1, textTransform: "uppercase", marginBottom: 3 }}>{x.label}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: x.col, fontFamily: "'JetBrains Mono', monospace" }}>{x.val}</div>
            </div>
          ))}
        </div>
      </div>

      {/* WEEKEND NOTICE */}
      {!forexOpen && (
        <div style={{ margin: "10px 16px 0", background: "#1A1400", border: "1px solid #FBBF2420", borderRadius: 14, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 18 }}>🌙</span>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#FBBF24" }}>Forex & Gold Market Closed</div>
            <div style={{ fontSize: 11, color: "#FBBF2470" }}>Weekend — opens Monday 00:00 UTC. Crypto trades 24/7.</div>
          </div>
        </div>
      )}

      {/* TAB CONTENT */}
      <div style={{ padding: "14px 16px", paddingBottom: 90, overflowY: "auto", maxHeight: "calc(100vh - 260px)" }}>

        {/* MARKET */}
        {tab === "market" && (
          <div style={{ animation: "fadeUp 0.3s ease" }}>
            <div style={{ display: "flex", gap: 6, marginBottom: 14, overflowX: "auto", paddingBottom: 2 }}>
              {[["all", "All"], ["crypto", "🔥 Crypto"], ["forex", "💱 Forex"], ["gold", "🥇 Gold"]].map(([val, label]) => (
                <button key={val} onClick={() => setFilter(val)} className="pair-btn" style={{
                  padding: "6px 14px", borderRadius: 20, border: `1px solid ${filter === val ? "#60A5FA40" : "#ffffff0D"}`,
                  background: filter === val ? "#60A5FA15" : "transparent",
                  color: filter === val ? "#60A5FA" : "#ffffff40",
                  fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.2s",
                }}>{label}</button>
              ))}
            </div>
            {filteredPairs.map(([symbol, pcfg], idx) => {
              const price = prices[symbol] ?? pcfg.base;
              const diff = +(price - pcfg.base).toFixed(pcfg.dec);
              const pct = ((diff / pcfg.base) * 100).toFixed(2);
              const prev = prevPrices[symbol] ?? pcfg.base;
              const up = price >= prev;
              const closed = pcfg.cat !== "crypto" && !forexOpen;
              return (
                <div key={symbol} className="card" onClick={() => { setSym(symbol); setTab("trade"); }}
                  style={{ background: "#0F1724", border: "1px solid #ffffff08", borderRadius: 16, padding: "14px 16px", marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", transition: "border-color 0.2s", animation: `fadeUp ${0.1 + idx * 0.03}s ease`, opacity: closed ? 0.7 : 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: `${pcfg.color}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, color: pcfg.color, flexShrink: 0 }}>
                      {pcfg.icon}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>{symbol}</div>
                      <div style={{ fontSize: 11, color: "#ffffff35", marginTop: 1 }}>
                        {closed ? <span style={{ color: "#FBBF2470" }}>Market Closed</span> : pcfg.cat === "crypto" ? "Crypto · 24/7" : pcfg.cat === "gold" ? "Gold Spot" : "Forex"}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Spark candles={candleMap[symbol] || []} color={pcfg.color} />
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 15, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: closed ? "#ffffff50" : up ? "#34d399" : "#f87171" }}>
                        {price.toFixed(pcfg.dec)}
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: parseFloat(pct) >= 0 ? "#34d39990" : "#f8717190" }}>
                        {parseFloat(pct) >= 0 ? "+" : ""}{pct}%
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TRADE */}
        {tab === "trade" && (
          <div style={{ animation: "fadeUp 0.3s ease" }}>
            <div style={{ display: "flex", gap: 6, marginBottom: 14, overflowX: "auto", paddingBottom: 4 }}>
              {Object.keys(ALL_PAIRS).map(s => (
                <button key={s} onClick={() => setSym(s)} className="pair-btn" style={{
                  padding: "5px 12px", borderRadius: 20,
                  border: `1px solid ${sym === s ? `${ALL_PAIRS[s].color}50` : "#ffffff0D"}`,
                  background: sym === s ? `${ALL_PAIRS[s].color}15` : "transparent",
                  color: sym === s ? ALL_PAIRS[s].color : "#ffffff35",
                  fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.2s",
                }}>{s}</button>
              ))}
            </div>
            <div style={{ background: "#0F1724", border: "1px solid #ffffff08", borderRadius: 18, padding: 16, marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: `${cfg.color}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 800, color: cfg.color }}>
                    {cfg.icon}
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 18 }}>{sym}</div>
                    <div style={{ fontSize: 11, color: "#ffffff35" }}>
                      {isSymClosed ? <span style={{ color: "#FBBF24" }}>Market Closed · Weekend</span> : cfg.cat === "crypto" ? "Crypto · Live" : "Forex · Live"}
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: 26, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", color: cfg.color }}>
                  {prices[sym].toFixed(cfg.dec)}
                </div>
              </div>
              <div style={{ height: 160, borderRadius: 12, overflow: "hidden" }}>
                <Chart candles={candles} sym={sym} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              {[{ label: "SELL", price: bid, col: "#f87171", bg: "#1A0D0D" }, { label: "BUY", price: ask, col: "#34d399", bg: "#0D1A12" }].map(x => (
                <button key={x.label} onClick={() => setDir(x.label)} style={{
                  flex: 1, background: dir === x.label ? (x.label === "BUY" ? "#0D2A1A" : "#2A0D0D") : x.bg,
                  border: `1px solid ${dir === x.label ? x.col + "60" : "#ffffff08"}`,
                  borderRadius: 14, padding: 12, textAlign: "center", cursor: "pointer", transition: "all 0.2s",
                }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: x.col + "90", letterSpacing: 2, marginBottom: 4 }}>{x.label}</div>
                  <div style={{ fontSize: 17, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: x.col }}>{x.price}</div>
                </button>
              ))}
            </div>
            <div style={{ background: "#0F1724", border: "1px solid #ffffff08", borderRadius: 14, padding: 14, marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ fontSize: 12, color: "#ffffff40", fontWeight: 600, letterSpacing: 1 }}>LOT SIZE</div>
                <div style={{ fontSize: 12, color: "#ffffff30" }}>
                  Margin: <span style={{ color: "#FBBF24", fontWeight: 700 }}>${(lots * cfg.contract * prices[sym] * 0.01).toFixed(2)}</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {[0.01, 0.05, 0.1, 0.5, 1].map(l => (
                  <button key={l} onClick={() => setLots(l)} style={{
                    flex: 1, padding: "9px 4px", borderRadius: 10, cursor: "pointer", transition: "all 0.2s",
                    border: `1px solid ${lots === l ? cfg.color + "60" : "#ffffff0A"}`,
                    background: lots === l ? `${cfg.color}15` : "#0A1220",
                    color: lots === l ? cfg.color : "#ffffff40",
                    fontSize: 12, fontWeight: 700,
                  }}>{l}</button>
                ))}
              </div>
            </div>
            <button onClick={openTrade} className="trade-btn" style={{
              width: "100%", padding: 16, borderRadius: 16, border: "none", cursor: isSymClosed ? "not-allowed" : "pointer",
              background: isSymClosed ? "#1A1A1A" : dir === "BUY" ? "linear-gradient(135deg,#059669,#34d399)" : "linear-gradient(135deg,#DC2626,#f87171)",
              color: isSymClosed ? "#ffffff30" : "#fff",
              fontSize: 16, fontWeight: 800, transition: "all 0.2s",
              boxShadow: isSymClosed ? "none" : dir === "BUY" ? "0 4px 32px #34d39930" : "0 4px 32px #f8717130",
            }}>
              {isSymClosed ? "🔒 Market Closed" : `${dir === "BUY" ? "▲" : "▼"} ${dir} ${lots} Lot · ${dir === "BUY" ? ask : bid}`}
            </button>
          </div>
        )}

        {/* POSITIONS */}
        {tab === "positions" && (
          <div style={{ animation: "fadeUp 0.3s ease" }}>
            <div style={{ fontSize: 12, color: "#ffffff30", letterSpacing: 2, textTransform: "uppercase", marginBottom: 14 }}>Open Positions · {trades.length}</div>
            {!trades.length && (
              <div style={{ textAlign: "center", padding: "60px 20px" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>💼</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#ffffff30" }}>No open positions</div>
                <div style={{ fontSize: 12, color: "#ffffff20", marginTop: 4 }}>Go to Trade tab to open one</div>
              </div>
            )}
            {trades.map(t => {
              const tcfg = ALL_PAIRS[t.sym];
              const cur = prices[t.sym] ?? t.entry;
              const delta = t.dir === "BUY" ? cur - t.entry : t.entry - cur;
              const pnl = +(delta * tcfg.contract * t.lots).toFixed(2);
              const profit = pnl >= 0;
              return (
                <div key={t.id} style={{ background: "#0F1724", border: `1px solid ${profit ? "#34d39920" : "#f8717120"}`, borderRadius: 16, padding: 16, marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 38, height: 38, borderRadius: 10, background: `${tcfg.color}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 800, color: tcfg.color }}>
                        {tcfg.icon}
                      </div>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 3 }}>
                          <span style={{ fontSize: 15, fontWeight: 800 }}>{t.sym}</span>
                          <span style={{ background: t.dir === "BUY" ? "#34d39918" : "#f8717118", color: t.dir === "BUY" ? "#34d399" : "#f87171", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20 }}>{t.dir}</span>
                        </div>
                        <div style={{ fontSize: 11, color: "#ffffff30" }}>{t.lots} lot · {t.time}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 20, fontWeight: 800, color: profit ? "#34d399" : "#f87171", fontFamily: "'JetBrains Mono', monospace" }}>
                        {profit ? "+" : ""}${Math.abs(pnl).toFixed(2)}
                      </div>
                      <div style={{ fontSize: 11, color: "#ffffff30", fontFamily: "'JetBrains Mono', monospace" }}>@ {t.entry}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, padding: "10px 12px", background: "#080B12", borderRadius: 10 }}>
                    <div style={{ fontSize: 11, color: "#ffffff30" }}>Entry <span style={{ color: "#E8F0FE", fontFamily: "monospace" }}>{t.entry}</span></div>
                    <div style={{ fontSize: 11, color: "#ffffff30" }}>Now <span style={{ color: tcfg.color, fontFamily: "monospace" }}>{cur.toFixed(tcfg.dec)}</span></div>
                    <div style={{ fontSize: 11, color: "#ffffff30" }}>Lots <span style={{ color: "#E8F0FE" }}>{t.lots}</span></div>
                  </div>
                  <button onClick={() => closeTrade(t.id)} style={{
                    width: "100%", padding: 11, borderRadius: 12, cursor: "pointer", fontWeight: 700, fontSize: 13, transition: "all 0.2s",
                    background: profit ? "#0D2A1A" : "#2A0D0D", border: `1px solid ${profit ? "#34d39940" : "#f8717140"}`,
                    color: profit ? "#34d399" : "#f87171",
                  }}>
                    Close @ {cur.toFixed(tcfg.dec)} · {profit ? "+" : ""}${pnl.toFixed(2)}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* HISTORY */}
        {tab === "history" && (
          <div style={{ animation: "fadeUp 0.3s ease" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: "#ffffff30", letterSpacing: 2, textTransform: "uppercase" }}>Trade History</div>
              {history.length > 0 && <div style={{ fontSize: 12, color: "#ffffff30" }}><span style={{ color: "#34d399" }}>{wins}W</span> / <span style={{ color: "#f87171" }}>{history.length - wins}L</span></div>}
            </div>
            {!history.length && (
              <div style={{ textAlign: "center", padding: "60px 20px" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#ffffff30" }}>No closed trades</div>
                <div style={{ fontSize: 12, color: "#ffffff20", marginTop: 4 }}>Your trade history will appear here</div>
              </div>
            )}
            {history.map((h, i) => {
              const hcfg = ALL_PAIRS[h.sym];
              return (
                <div key={i} style={{ background: "#0F1724", border: `1px solid ${h.pnl >= 0 ? "#34d39915" : "#f8717115"}`, borderRadius: 14, padding: "14px 16px", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: `${hcfg.color}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: hcfg.color }}>
                      {hcfg.icon}
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                        <span style={{ fontWeight: 700, fontSize: 14 }}>{h.sym}</span>
                        <span style={{ background: h.dir === "BUY" ? "#34d39915" : "#f8717115", color: h.dir === "BUY" ? "#34d399" : "#f87171", fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 20 }}>{h.dir}</span>
                      </div>
                      <div style={{ fontSize: 10, color: "#ffffff25", fontFamily: "monospace" }}>{h.entry} → {h.exit?.toFixed?.(hcfg.dec) ?? h.exit}</div>
                      <div style={{ fontSize: 10, color: "#ffffff25" }}>{h.time} – {h.closeTime} · {h.lots} lot</div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: h.pnl >= 0 ? "#34d399" : "#f87171", fontFamily: "'JetBrains Mono', monospace" }}>
                      {h.pnl >= 0 ? "+" : ""}${Math.abs(h.pnl).toFixed(2)}
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: h.pnl >= 0 ? "#34d39960" : "#f8717160", marginTop: 2 }}>
                      {h.pnl >= 0 ? "✓ WIN" : "✗ LOSS"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* BOTTOM TAB BAR */}
      <div style={{
        position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: "100%", maxWidth: 430,
        background: "rgba(8,11,18,0.95)", backdropFilter: "blur(20px)",
        borderTop: "1px solid #ffffff08",
      }}>
        <div style={{ background: "#0F1724", borderBottom: "1px solid #ffffff06", padding: "8px 16px", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 9, color: "#ffffff20", flexShrink: 0, letterSpacing: 1 }}>AD</span>
          <span style={{ fontSize: 11, color: "#ffffff30", flex: 1, textAlign: "center" }}>
            ₿ <span style={{ color: "#F7931A", fontWeight: 700 }}>Bitcoin Signals Pro</span> — 78% win rate. Try free for 7 days!
          </span>
          <button style={{ background: "#F7931A", color: "#000", border: "none", borderRadius: 8, padding: "4px 10px", fontSize: 11, fontWeight: 800, cursor: "pointer" }}>TRY</button>
        </div>
        <div style={{ display: "flex", padding: "8px 0 4px" }}>
          {[
            { id: "market", icon: "◉", label: "Market" },
            { id: "trade", icon: "⬆", label: "Trade" },
            { id: "positions", icon: "◈", label: "Open" },
            { id: "history", icon: "≡", label: "History" },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} className="tab-btn" style={{
              flex: 1, background: "none", border: "none", cursor: "pointer", padding: "6px 4px",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
            }}>
              <div style={{ fontSize: 18, color: tab === t.id ? "#60A5FA" : "#ffffff25", transition: "color 0.2s" }}>{t.icon}</div>
              <div style={{ fontSize: 10, fontWeight: tab === t.id ? 700 : 500, color: tab === t.id ? "#60A5FA" : "#ffffff25", letterSpacing: 0.5 }}>{t.label}</div>
              {tab === t.id && <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#60A5FA", marginTop: 1 }} />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
