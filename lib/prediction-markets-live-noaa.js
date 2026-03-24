import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url))
const WORKSPACE_ROOT = path.resolve(MODULE_DIR, '..', '..')
const CSV_PATH = path.join(WORKSPACE_ROOT, 'LIVE-NOAA-PREDICTION-MARKET-LEDGER.csv')

function parseCsvLine(line = '') {
  const out = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }
    if (ch === ',' && !inQuotes) {
      out.push(cur)
      cur = ''
      continue
    }
    cur += ch
  }
  out.push(cur)
  return out.map((v) => String(v || '').trim())
}

function parseNum(v) {
  const n = Number(String(v || '').replace(/[$,%]/g, '').trim())
  return Number.isFinite(n) ? n : null
}

function fmtPct(v) {
  const n = Number(v)
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null
}

function fmtUsd(v) {
  const n = Number(v)
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null
}

function mapLegacyTrade(cols) {
  const [
    EntryTimestamp, TradeDateEST, MarketKey, Contract,
    City, ChosenOption, Side, StakeUSD, EntryPrice, Shares, AmountToWinUSD,
    NOAAEstProb, MarketProb, EdgePct, DecisionReason, Status, ExitTimestamp,
    ActualPayoutUSD, NetPnLUSD, Outcome, SettlementSource, SettlementNotes,
    CoinbaseTransactionRef, RunId, Notes
  ] = cols

  return {
    EntryTimestamp,
    TradeDateEST,
    EntryTimeLocal: '',
    MarketKey,
    Contract,
    City,
    CurrentTempAtEntryF: '',
    OfficialHighSoFarAtEntryF: '',
    MinutesToSunsetAtEntry: '',
    CurrentWeatherAtEntry: '',
    MarketURL: '',
    ChosenOption,
    Side,
    StakeUSD,
    EntryPrice,
    Shares,
    AmountToWinUSD,
    NOAAEstProb,
    MarketProb,
    EdgePct,
    DecisionReason,
    ExecutionStage: '',
    Status,
    ExitTimestamp,
    ActualPayoutUSD,
    NetPnLUSD,
    Outcome,
    SettlementSource,
    SettlementNotes,
    CoinbaseTransactionRef,
    RunId,
    Notes
  }
}

function mapRow(headers, cols) {
  if (cols.length === headers.length) {
    const row = {}
    for (let i = 0; i < headers.length; i++) row[headers[i]] = cols[i] ?? ''
    return row
  }

  if (cols.length >= 17 && cols.length <= 26) {
    return mapLegacyTrade(cols)
  }

  const row = {}
  for (let i = 0; i < headers.length; i++) row[headers[i]] = cols[i] ?? ''
  return row
}

function readCsvStructured() {
  if (!fs.existsSync(CSV_PATH)) return { headers: [], rows: [] }
  const raw = fs.readFileSync(CSV_PATH, 'utf8').replace(/^\uFEFF/, '')
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0)
  if (!lines.length) return { headers: [], rows: [] }
  const headers = parseCsvLine(lines[0])
  const rows = lines.slice(1).map((line) => mapRow(headers, parseCsvLine(line)))
  return { headers, rows }
}

function calcBankroll(rows = []) {
  const stakeOpen = rows.filter((r) => String(r.Status || '').toUpperCase() === 'OPEN').reduce((s, r) => s + (parseNum(r.StakeUSD) || 0), 0)
  const realizedPnl = rows.filter((r) => String(r.Status || '').toUpperCase() === 'RESOLVED').reduce((s, r) => s + (parseNum(r.NetPnLUSD) || 0), 0)
  const totalStaked = rows.reduce((s, r) => s + (parseNum(r.StakeUSD) || 0), 0)
  return {
    configuredBudget: 300,
    maxPerTrade: 20,
    totalStaked: fmtUsd(totalStaked) || 0,
    openStake: fmtUsd(stakeOpen) || 0,
    realizedPnl: fmtUsd(realizedPnl) || 0,
    availableToDeploy: fmtUsd(300 - stakeOpen + realizedPnl) || 0
  }
}

export async function getLivePredictionMarketsOverview() {
  if (!fs.existsSync(CSV_PATH)) {
    return {
      trades: [],
      metrics: { totalTrades: 0, openTrades: 0, resolvedTrades: 0, wins: 0, losses: 0, winRate: null, grossPayout: 0, netPnl: 0 },
      bankroll: { configuredBudget: 300, maxPerTrade: 20, totalStaked: 0, openStake: 0, realizedPnl: 0, availableToDeploy: 300 },
      updatedAtMs: null
    }
  }

  const { rows } = readCsvStructured()
  const commitRows = rows.filter((r) => {
    const status = String(r.Status || '').toUpperCase()
    return status === 'OPEN' || status === 'RESOLVED'
  })

  const trades = commitRows.map((r) => {
    const stake = parseNum(r.StakeUSD)
    const payout = parseNum(r.ActualPayoutUSD)
    const net = parseNum(r.NetPnLUSD)
    const amountToWin = parseNum(r.AmountToWinUSD)
    const marketProb = parseNum(r.MarketProb)
    const estProb = parseNum(r.NOAAEstProb)
    const edge = parseNum(r.EdgePct)
    return {
      ...r,
      stakeUSD: stake,
      actualPayoutUSD: payout,
      netPnLUSD: net,
      amountToWinUSD: amountToWin,
      marketProb: marketProb != null ? fmtPct(marketProb * (marketProb <= 1 ? 100 : 1)) : null,
      noaaEstProb: estProb != null ? fmtPct(estProb * (estProb <= 1 ? 100 : 1)) : null,
      edgePct: edge,
      isOpen: String(r.Status || '').toUpperCase() === 'OPEN',
      isResolved: String(r.Status || '').toUpperCase() === 'RESOLVED',
      isWin: String(r.Outcome || '').toUpperCase() === 'WIN',
      isLoss: String(r.Outcome || '').toUpperCase() === 'LOSS'
    }
  })

  trades.sort((a, b) => Date.parse(b.EntryTimestamp || 0) - Date.parse(a.EntryTimestamp || 0))

  const resolved = trades.filter((t) => t.isResolved)
  const wins = resolved.filter((t) => t.isWin).length
  const losses = resolved.filter((t) => t.isLoss).length
  const grossPayout = resolved.reduce((s, t) => s + (t.actualPayoutUSD || 0), 0)
  const netPnl = resolved.reduce((s, t) => s + (t.netPnLUSD || 0), 0)

  return {
    trades,
    metrics: {
      totalTrades: trades.length,
      openTrades: trades.filter((t) => t.isOpen).length,
      resolvedTrades: resolved.length,
      wins,
      losses,
      winRate: resolved.length ? fmtPct((wins / resolved.length) * 100) : null,
      grossPayout: fmtUsd(grossPayout) || 0,
      netPnl: fmtUsd(netPnl) || 0
    },
    bankroll: calcBankroll(commitRows),
    updatedAtMs: fs.statSync(CSV_PATH).mtimeMs
  }
}
