import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const IG_API_KEY = Deno.env.get("IG_API_KEY") ?? "";
const IG_USERNAME = Deno.env.get("IG_USERNAME") ?? "";
const IG_PASSWORD = Deno.env.get("IG_PASSWORD") ?? "";
const IG_ACC_NUMBER = Deno.env.get("IG_ACC_NUMBER") ?? "";
const IG_BASE = "https://api.ig.com/gateway/deal";
const ALLOWED_USER = Deno.env.get("ALLOWED_TRADING_USER_ID") ?? "";

const SB_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const RISK = {
  maxRiskPerTrade: 0.02,
  maxConcurrentPositions: 6,
  maxCorrelatedPositions: 2,
  maxTotalExposurePct: 0.20,
  drawdownHaltPct: 0.12,
  dailyLossLimit: 50,
  maxConsecutiveLosses: 5,
  kellyFraction: 0.15,
  mandatoryStopMultiple: 2.0,
  takeProfitMultiple: 3.0,
  minSignalStrength: 0.6,
};

function calcEMA(prices: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const ema: number[] = [prices[0]];
  for (let i = 1; i < prices.length; i++) {
    ema.push(prices[i] * k + ema[i - 1] * (1 - k));
  }
  return ema;
}

function calcRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) return 50;
  let gains = 0, losses = 0;
  for (let i = prices.length - period; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff > 0) gains += diff;
    else losses -= diff;
  }
  if (losses === 0) return 100;
  const rs = (gains / period) / (losses / period);
  return 100 - (100 / (1 + rs));
}

function calcATR(highs: number[], lows: number[], closes: number[], period: number = 14): number {
  if (highs.length < period + 1) return 0;
  let atr = 0;
  for (let i = highs.length - period; i < highs.length; i++) {
    const tr = Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1])
    );
    atr += tr;
  }
  return atr / period;
}

function calcBollingerBands(prices: number[], period: number = 20, mult: number = 2): { upper: number; middle: number; lower: number } {
  if (prices.length < period) return { upper: 0, middle: 0, lower: 0 };
  const slice = prices.slice(-period);
  const mean = slice.reduce((a, b) => a + b, 0) / period;
  const variance = slice.reduce((a, b) => a + (b - mean) ** 2, 0) / period;
  const std = Math.sqrt(variance);
  return { upper: mean + mult * std, middle: mean, lower: mean - mult * std };
}

interface Signal {
  direction: "BUY" | "SELL" | "NONE";
  strength: number;
  reasoning: string;
  rsi: number;
  emaFast: number;
  emaSlow: number;
  atr: number;
}

function generateSignal(closes: number[], highs: number[], lows: number[]): Signal {
  if (closes.length < 50) {
    return { direction: "NONE", strength: 0, reasoning: "Insufficient data", rsi: 50, emaFast: 0, emaSlow: 0, atr: 0 };
  }

  const rsi = calcRSI(closes, 14);
  const emaFast = calcEMA(closes, 9);
  const emaSlow = calcEMA(closes, 21);
  const atr = calcATR(highs, lows, closes, 14);
  const bb = calcBollingerBands(closes, 20, 2);
  const currentPrice = closes[closes.length - 1];
  const emaFastNow = emaFast[emaFast.length - 1];
  const emaSlowNow = emaSlow[emaSlow.length - 1];
  const emaFastPrev = emaFast[emaFast.length - 2];
  const emaSlowPrev = emaSlow[emaSlow.length - 2];

  let buyScore = 0;
  let sellScore = 0;
  const reasons: string[] = [];

  if (rsi < 30) { buyScore += 0.35; reasons.push(`RSI oversold (${rsi.toFixed(1)})`); }
  else if (rsi < 40) { buyScore += 0.15; reasons.push(`RSI low (${rsi.toFixed(1)})`); }
  else if (rsi > 70) { sellScore += 0.35; reasons.push(`RSI overbought (${rsi.toFixed(1)})`); }
  else if (rsi > 60) { sellScore += 0.15; reasons.push(`RSI high (${rsi.toFixed(1)})`); }

  const crossUp = emaFastPrev <= emaSlowPrev && emaFastNow > emaSlowNow;
  const crossDown = emaFastPrev >= emaSlowPrev && emaFastNow < emaSlowNow;
  if (crossUp) { buyScore += 0.30; reasons.push("EMA 9/21 bullish cross"); }
  else if (crossDown) { sellScore += 0.30; reasons.push("EMA 9/21 bearish cross"); }
  else if (emaFastNow > emaSlowNow) { buyScore += 0.10; reasons.push("EMA trend up"); }
  else if (emaFastNow < emaSlowNow) { sellScore += 0.10; reasons.push("EMA trend down"); }

  if (currentPrice <= bb.lower && rsi < 40) {
    buyScore += 0.25; reasons.push("Price at lower Bollinger + low RSI");
  } else if (currentPrice >= bb.upper && rsi > 60) {
    sellScore += 0.25; reasons.push("Price at upper Bollinger + high RSI");
  }

  if (currentPrice > emaFastNow && emaFastNow > emaSlowNow) {
    buyScore += 0.10; reasons.push("Price > EMA9 > EMA21");
  } else if (currentPrice < emaFastNow && emaFastNow < emaSlowNow) {
    sellScore += 0.10; reasons.push("Price < EMA9 < EMA21");
  }

  const netScore = buyScore - sellScore;
  let direction: "BUY" | "SELL" | "NONE" = "NONE";
  let strength = 0;

  if (netScore > 0 && buyScore >= RISK.minSignalStrength) {
    direction = "BUY";
    strength = Math.min(buyScore, 1);
  } else if (netScore < 0 && sellScore >= RISK.minSignalStrength) {
    direction = "SELL";
    strength = Math.min(sellScore, 1);
  }

  return { direction, strength, reasoning: reasons.join(" | ") || "No signal", rsi, emaFast: emaFastNow, emaSlow: emaSlowNow, atr };
}

function calcStakeSize(equity: number, atr: number, price: number, marginFactor: number): number {
  const riskAmount = equity * RISK.maxRiskPerTrade;
  const stopDistance = atr * RISK.mandatoryStopMultiple;
  if (stopDistance <= 0) return 0;
  let stake = riskAmount / stopDistance;
  stake *= RISK.kellyFraction / 0.25;
  stake = Math.max(stake, 0.01);
  const maxByMargin = (equity * 0.05) / (price * marginFactor);
  stake = Math.min(stake, maxByMargin);
  return Math.round(stake * 100) / 100;
}

interface IGSession {
  accessToken: string;
  cst: string;
  securityToken: string;
}

async function igAuth(): Promise<IGSession | null> {
  try {
    const resp = await fetch(`${IG_BASE}/session`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=UTF-8",
        "Accept": "application/json; charset=UTF-8",
        "X-IG-API-KEY": IG_API_KEY,
        "VERSION": "3",
      },
      body: JSON.stringify({ identifier: IG_USERNAME, password: IG_PASSWORD }),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    return {
      accessToken: data.oauthToken?.access_token ?? "",
      cst: resp.headers.get("CST") ?? "",
      securityToken: resp.headers.get("X-SECURITY-TOKEN") ?? "",
    };
  } catch { return null; }
}

function igHeaders(session: IGSession, version = "2"): Record<string, string> {
  const h: Record<string, string> = {
    "Content-Type": "application/json; charset=UTF-8",
    "Accept": "application/json; charset=UTF-8",
    "X-IG-API-KEY": IG_API_KEY,
    "VERSION": version,
  };
  if (session.accessToken) {
    h["Authorization"] = `Bearer ${session.accessToken}`;
    h["IG-ACCOUNT-ID"] = IG_ACC_NUMBER;
  }
  if (session.cst) h["CST"] = session.cst;
  if (session.securityToken) h["X-SECURITY-TOKEN"] = session.securityToken;
  return h;
}

async function igLogout(session: IGSession): Promise<void> {
  try { await fetch(`${IG_BASE}/session`, { method: "DELETE", headers: igHeaders(session) }); } catch {}
}

async function igFetchPrices(session: IGSession, epic: string): Promise<{closes: number[], highs: number[], lows: number[], current: number} | null> {
  try {
    const resp = await fetch(`${IG_BASE}/prices/${epic}?resolution=HOUR&max=100&pageSize=100`, {
      headers: igHeaders(session, "3"),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    const prices = data.prices ?? [];
    if (prices.length < 20) return null;
    const closes: number[] = [];
    const highs: number[] = [];
    const lows: number[] = [];
    for (const p of prices) {
      const c = p.closePrice?.mid ?? p.closePrice?.bid ?? 0;
      const h = p.highPrice?.mid ?? p.highPrice?.bid ?? 0;
      const l = p.lowPrice?.mid ?? p.lowPrice?.bid ?? 0;
      if (c > 0) { closes.push(c); highs.push(h); lows.push(l); }
    }
    return { closes, highs, lows, current: closes[closes.length - 1] ?? 0 };
  } catch { return null; }
}

async function igGetPositions(session: IGSession): Promise<any[]> {
  try {
    const resp = await fetch(`${IG_BASE}/positions`, { headers: igHeaders(session) });
    if (!resp.ok) return [];
    const data = await resp.json();
    return data.positions ?? [];
  } catch { return []; }
}

async function igGetAccounts(session: IGSession): Promise<any> {
  try {
    const resp = await fetch(`${IG_BASE}/accounts`, { headers: igHeaders(session) });
    if (!resp.ok) return null;
    const data = await resp.json();
    return (data.accounts ?? []).find((a: any) => a.accountId === IG_ACC_NUMBER) ?? null;
  } catch { return null; }
}

async function igPlaceOrder(session: IGSession, epic: string, direction: string, size: number, stopLevel: number, limitLevel: number): Promise<any> {
  const payload = {
    epic, direction, size, orderType: "MARKET", currencyCode: "GBP",
    expiry: "-", forceOpen: true, guaranteedStop: false, stopLevel, limitLevel,
  };
  try {
    const resp = await fetch(`${IG_BASE}/positions/otc`, {
      method: "POST", headers: igHeaders(session), body: JSON.stringify(payload),
    });
    const data = await resp.json();
    const dealRef = data.dealReference ?? "";
    if (!dealRef) return { status: "REJECTED", reason: JSON.stringify(data) };
    await new Promise(r => setTimeout(r, 1000));
    const confResp = await fetch(`${IG_BASE}/confirms/${dealRef}`, { headers: igHeaders(session) });
    const conf = await confResp.json();
    return { status: conf.dealStatus ?? "UNKNOWN", dealId: conf.dealId ?? "", level: conf.level ?? 0, reason: conf.reason ?? "" };
  } catch (err) { return { status: "ERROR", reason: String(err) }; }
}

async function igClosePosition(session: IGSession, dealId: string, direction: string, size: number, epic: string): Promise<any> {
  const closeDir = direction === "BUY" ? "SELL" : "BUY";
  const payload = { dealId, direction: closeDir, size, orderType: "MARKET", expiry: "-" };
  try {
    const resp = await fetch(`${IG_BASE}/positions/otc`, {
      method: "POST",
      headers: { ...igHeaders(session), "_method": "DELETE" },
      body: JSON.stringify(payload),
    });
    return await resp.json();
  } catch (err) { return { error: String(err) }; }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "No auth" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const token = authHeader.replace("Bearer ", "");
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (ALLOWED_USER && payload.sub !== ALLOWED_USER) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const url = new URL(req.url);
    const action = url.pathname.split("/").pop() ?? "scan";
    const sb = createClient(SB_URL, SB_KEY);

    const { data: stateRows } = await sb.from("trading_system_state").select("*");
    const state: Record<string, string> = {};
    (stateRows ?? []).forEach((r: any) => { state[r.key] = r.value; });
    const mode = state.mode ?? "paper";
    const systemHalted = state.system_halted === "true";

    const session = await igAuth();
    if (!session) {
      return new Response(JSON.stringify({ error: "IG auth failed" }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let result: any = {};

    try {
      if (action === "scan" || action === "trading-engine") {
        const { data: instruments } = await sb.from("trading_instruments").select("*").eq("enabled", true);
        if (!instruments || instruments.length === 0) {
          result = { error: "No instruments configured" };
        } else {
          const account = await igGetAccounts(session);
          const equity = account?.balance?.balance ?? 1150;
          const available = account?.balance?.available ?? 0;
          const currentPositions = await igGetPositions(session);
          const { data: openPaperTrades } = await sb.from("trading_paper_trades").select("*").eq("status", "OPEN");

          const signals: any[] = [];
          const scanLimit = Math.min(instruments.length, 30);
          const toScan = instruments.slice(0, scanLimit);

          for (const inst of toScan) {
            const priceData = await igFetchPrices(session, inst.epic);
            if (!priceData) continue;

            const sig = generateSignal(priceData.closes, priceData.highs, priceData.lows);

            await sb.from("trading_signals").insert({
              instrument_id: inst.id, epic: inst.epic, signal_type: "technical",
              direction: sig.direction, strength: sig.strength, price_at_signal: priceData.current,
              rsi_value: sig.rsi, ema_fast: sig.emaFast, ema_slow: sig.emaSlow,
              atr_value: sig.atr, reasoning: sig.reasoning, acted_on: false,
            });

            if (sig.direction !== "NONE") {
              signals.push({ instrument: inst, signal: sig, price: priceData.current });
            }

            for (const pt of (openPaperTrades ?? [])) {
              if (pt.epic === inst.epic) {
                const hitStop = pt.direction === "BUY" ? priceData.current <= pt.stop_loss : priceData.current >= pt.stop_loss;
                const hitTP = pt.direction === "BUY" ? priceData.current >= pt.take_profit : priceData.current <= pt.take_profit;
                if (hitStop || hitTP) {
                  const pnl = pt.direction === "BUY"
                    ? (priceData.current - pt.entry_price) * pt.stake
                    : (pt.entry_price - priceData.current) * pt.stake;
                  await sb.from("trading_paper_trades").update({
                    status: hitStop ? "STOPPED" : "TP_HIT", exit_price: priceData.current,
                    pnl, closed_at: new Date().toISOString(),
                  }).eq("id", pt.id);
                }
              }
            }

            await new Promise(r => setTimeout(r, 1500));
          }

          const openPaperCount = (openPaperTrades ?? []).filter((t: any) => t.status === "OPEN").length;
          const canTrade = !systemHalted && openPaperCount < RISK.maxConcurrentPositions;

          const newTrades: any[] = [];
          if (canTrade) {
            for (const s of signals) {
              const corrGroup = s.instrument.correlation_group;
              const sameGroupCount = (openPaperTrades ?? []).filter(
                (t: any) => t.status === "OPEN" && instruments.find((i: any) => i.epic === t.epic)?.correlation_group === corrGroup
              ).length;
              if (sameGroupCount >= RISK.maxCorrelatedPositions) continue;

              const stake = calcStakeSize(equity, s.signal.atr, s.price, s.instrument.margin_factor);
              if (stake <= 0) continue;

              const stopDistance = s.signal.atr * RISK.mandatoryStopMultiple;
              const tpDistance = s.signal.atr * RISK.takeProfitMultiple;
              const stopLoss = s.signal.direction === "BUY" ? s.price - stopDistance : s.price + stopDistance;
              const takeProfit = s.signal.direction === "BUY" ? s.price + tpDistance : s.price - tpDistance;

              if (mode === "paper") {
                await sb.from("trading_paper_trades").insert({
                  instrument_id: s.instrument.id, epic: s.instrument.epic,
                  direction: s.signal.direction, stake, entry_price: s.price,
                  stop_loss: Math.round(stopLoss * 100) / 100,
                  take_profit: Math.round(takeProfit * 100) / 100,
                  reasoning: s.signal.reasoning,
                });
                newTrades.push({ mode: "paper", instrument: s.instrument.id, direction: s.signal.direction, stake, entry: s.price });
              } else if (mode === "live") {
                const orderResult = await igPlaceOrder(session, s.instrument.epic, s.signal.direction, stake,
                  Math.round(stopLoss * 10) / 10, Math.round(takeProfit * 10) / 10);
                await sb.from("trading_live_trades").insert({
                  instrument_id: s.instrument.id, epic: s.instrument.epic,
                  direction: s.signal.direction, stake,
                  entry_price: orderResult.level || s.price,
                  stop_loss: Math.round(stopLoss * 100) / 100,
                  take_profit: Math.round(takeProfit * 100) / 100,
                  deal_id: orderResult.dealId || "", deal_reference: "",
                  status: orderResult.status === "ACCEPTED" ? "OPEN" : "REJECTED",
                  reasoning: s.signal.reasoning,
                });
                newTrades.push({ mode: "live", instrument: s.instrument.id, status: orderResult.status });
              }
            }
          }

          const totalPnl = currentPositions.reduce((sum: number, p: any) => {
            const pos = p.position ?? {}; const mkt = p.market ?? {};
            const dir = pos.direction ?? "BUY";
            const current = dir === "BUY" ? (mkt.bid ?? 0) : (mkt.offer ?? 0);
            return sum + (dir === "BUY" ? (current - (pos.level ?? 0)) * (pos.size ?? 0) : ((pos.level ?? 0) - current) * (pos.size ?? 0));
          }, 0);

          await sb.from("trading_equity_log").insert({
            equity: equity + totalPnl, cash: available, running_pnl: totalPnl,
            n_positions: currentPositions.length,
            drawdown_pct: totalPnl < 0 ? Math.abs(totalPnl) / equity : 0, mode,
          });

          result = { mode, systemHalted, equity, runningPnl: totalPnl,
            instrumentsScanned: scanLimit, signalsGenerated: signals.length, newTrades,
            openPositionsIG: currentPositions.length, openPaperTrades: openPaperCount,
            timestamp: new Date().toISOString() };
        }

      } else if (action === "positions") {
        const positions = await igGetPositions(session);
        const account = await igGetAccounts(session);
        const bal = account?.balance ?? {};
        const mapped = positions.map((pos: any) => {
          const mkt = pos.market ?? {}; const p = pos.position ?? {};
          const dir = p.direction ?? "BUY";
          const current = dir === "BUY" ? (mkt.bid ?? 0) : (mkt.offer ?? 0);
          const pnl = dir === "BUY" ? (current - (p.level ?? 0)) * (p.size ?? 0) : ((p.level ?? 0) - current) * (p.size ?? 0);
          return { epic: mkt.epic ?? "", name: mkt.instrumentName ?? "", direction: dir, size: p.size ?? 0, level: p.level ?? 0, bid: current, pnl: Math.round(pnl * 100) / 100, dealId: p.dealId ?? "", flags: [] as string[] };
        });
        const epicCounts: Record<string, number> = {};
        mapped.forEach((p: any) => { epicCounts[p.epic] = (epicCounts[p.epic] ?? 0) + 1; });
        mapped.forEach((p: any) => { if (epicCounts[p.epic] > 2) p.flags.push("CONCENTRATION"); });
        const { data: recentSignals } = await sb.from("trading_signals").select("*").neq("direction", "NONE").order("created_at", { ascending: false }).limit(20);
        const { data: paperTrades } = await sb.from("trading_paper_trades").select("*").order("opened_at", { ascending: false }).limit(20);
        result = {
          account: { balance: bal.balance ?? 0, profitLoss: bal.profitLoss ?? 0, available: bal.available ?? 0, deposit: bal.deposit ?? 0 },
          positions: mapped, recentSignals: recentSignals ?? [], paperTrades: paperTrades ?? [],
          mode: state.mode ?? "paper", systemHalted, timestamp: new Date().toISOString(),
        };

      } else if (action === "kill") {
        const body = await req.json();
        const level = body.level ?? "system";
        const reason = body.reason ?? "Manual kill from dashboard";
        if (level === "system") {
          await sb.from("trading_system_state").update({ value: "true", updated_at: new Date().toISOString() }).eq("key", "system_halted");
        } else if (level === "ig") {
          await sb.from("trading_system_state").update({ value: "true", updated_at: new Date().toISOString() }).eq("key", "ig_halted");
        }
        await sb.from("trading_kill_events").insert({ level, reason });
        result = { killed: true, level, reason };

      } else if (action === "resume") {
        const body = await req.json();
        if (body.confirmation === "CONFIRM_RESUME") {
          await sb.from("trading_system_state").update({ value: "false", updated_at: new Date().toISOString() }).eq("key", "system_halted");
          await sb.from("trading_system_state").update({ value: "false", updated_at: new Date().toISOString() }).eq("key", "ig_halted");
          await sb.from("trading_system_state").update({ value: "0", updated_at: new Date().toISOString() }).eq("key", "consecutive_losses");
          result = { resumed: true };
        } else {
          result = { resumed: false, error: "Wrong confirmation code" };
        }

      } else if (action === "set-mode") {
        const body = await req.json();
        const newMode = body.mode === "live" ? "live" : "paper";
        await sb.from("trading_system_state").update({ value: newMode, updated_at: new Date().toISOString() }).eq("key", "mode");
        result = { mode: newMode };

      } else if (action === "close-all") {
        const body = await req.json();
        if (!body.confirm) { result = { error: "Not confirmed" }; }
        else {
          const positions = await igGetPositions(session);
          const closeResults: any[] = [];
          for (const pos of positions) {
            const p = pos.position ?? {};
            const mkt = pos.market ?? {};
            const r = await igClosePosition(session, p.dealId ?? "", p.direction ?? "BUY", p.size ?? 0, mkt.epic ?? "");
            closeResults.push({ epic: mkt.epic, result: r });
            await new Promise(r => setTimeout(r, 2000));
          }
          result = { closed: closeResults.length, details: closeResults };
        }
      }

    } finally {
      await igLogout(session);
    }

    return new Response(JSON.stringify(result), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
