import fs from 'node:fs'
import path from 'node:path'
import { isSnapshotMode, readSnapshot } from './snapshot-store.js'

const ROOT = process.cwd()
const CSV_PATH = path.join(ROOT, 'NOAA-WEATHER-PAPER-TRADE-JOURNAL.csv')

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

function csvEscape(v = '') {
  const s = String(v ?? '')
  if (!/[",\n\r]/.test(s)) return s
  return `"${s.replaceAll('"', '""')}"`
}

function parseNum(v) {
  const n = Number(String(v || '').replace('%', '').trim())
  return Number.isFinite(n) ? n : null
}

function toTs(row) {
  const runTs = row.RunTimestamp || ''
  if (runTs) {
    const t = Date.parse(runTs)
    if (!Number.isNaN(t)) return t
  }

  const d = row.Date || ''
  const tm = row.Time || ''
  if (d && tm) {
    const guess = `${d}T${tm}`
    const t = Date.parse(guess)
    if (!Number.isNaN(t)) return t
  }

  return null
}

function decisionIsCommit(decision = '') {
  return /paper\s*commit/i.test(decision)
}

function normalizeOutcome(v = '') {
  const s = String(v || '').trim().toLowerCase()
  if (!s) return ''
  if (['win', 'won', 'w'].includes(s)) return 'WIN'
  if (['loss', 'lost', 'l'].includes(s)) return 'LOSS'
  if (['push', 'void', 'n/a', 'na'].includes(s)) return 'PUSH'
  return ''
}

function normalizeDecision(v = '', rawLine = '') {
  const s = String(v || '').trim().toLowerCase()
  if (/paper\s*commit/.test(s)) return 'PAPER COMMIT'
  if (s === 'monitor') return 'MONITOR'
  if (s === 'skip') return 'SKIP'

  if (/paper\s*commit/i.test(rawLine)) return 'PAPER COMMIT'
  if (/\bmonitor\b/i.test(rawLine)) return 'MONITOR'
  if (/\bskip\b/i.test(rawLine)) return 'SKIP'
  return ''
}

function safePct(n) {
  return n == null ? null : Math.round(n * 100) / 100
}

function calcPayoutForWager(commitMarketProbPct, position = 'YES', wager = 100) {
  const p = Number(commitMarketProbPct)
  if (!Number.isFinite(p) || p <= 0 || p >= 100) return null

  const yesPrice = p / 100
  const pos = String(position || 'YES').trim().toUpperCase()
  const unitPrice = pos === 'NO' ? (1 - yesPrice) : yesPrice
  if (unitPrice <= 0) return null

  const grossPayout = Number(wager) / unitPrice
  return Math.round(grossPayout * 100) / 100
}

function ensureColumns(headers = [], extra = []) {
  const set = new Set(headers)
  for (const col of extra) {
    if (!set.has(col)) {
      headers.push(col)
      set.add(col)
    }
  }
  return headers
}

function readCsvStructured() {
  if (!fs.existsSync(CSV_PATH)) return { headers: [], rows: [] }
  const raw = fs.readFileSync(CSV_PATH, 'utf8')
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0)
  if (lines.length === 0) return { headers: [], rows: [] }

  const headers = parseCsvLine(lines[0])
  const rows = lines.slice(1).map((line) => {
    const cols = parseCsvLine(line)
    const row = {}
    for (let i = 0; i < headers.length; i++) row[headers[i]] = cols[i] ?? ''
    return row
  })

  return { headers, rows }
}

function writeCsvStructured(headers = [], rows = []) {
  const line0 = headers.map(csvEscape).join(',')
  const body = rows.map((r) => headers.map((h) => csvEscape(r[h] ?? '')).join(','))
  fs.writeFileSync(CSV_PATH, [line0, ...body].join('\n') + '\n', 'utf8')
}

function optionFromHtml(html = '', options = []) {
  const txt = String(html || '').replace(/\s+/g, ' ').toLowerCase()
  if (!txt) return null

  const cues = ['resolved', 'settled', 'winning', 'winner', 'result', 'final outcome']

  for (const opt of options) {
    const o = String(opt || '').trim().toLowerCase()
    if (!o) continue
    const idx = txt.indexOf(o)
    if (idx < 0) continue

    const from = Math.max(0, idx - 120)
    const to = Math.min(txt.length, idx + o.length + 120)
    const around = txt.slice(from, to)
    if (cues.some((c) => around.includes(c))) return opt
  }

  return null
}

const CITY_COORDS = {
  'los angeles': { lat: 34.0522, lon: -118.2437, wttr: 'Los Angeles' },
  'la': { lat: 34.0522, lon: -118.2437, wttr: 'Los Angeles' },
  'austin': { lat: 30.2672, lon: -97.7431, wttr: 'Austin' },
  'atlanta': { lat: 33.749, lon: -84.388, wttr: 'Atlanta' },
  'miami': { lat: 25.7617, lon: -80.1918, wttr: 'Miami' },
  'denver': { lat: 39.7392, lon: -104.9903, wttr: 'Denver' },
  'las vegas': { lat: 36.1699, lon: -115.1398, wttr: 'Las Vegas' },
  'san francisco': { lat: 37.7749, lon: -122.4194, wttr: 'San Francisco' }
}

function parseMarketContract(contract = '') {
  const text = String(contract || '').trim()
  const m = text.match(/highest temperature in\s+(.+?)\s+on\s+([A-Za-z]{3,9})\s+(\d{1,2}),\s*(\d{4})\s*:\s*(.+)$/i)
  if (!m) return null

  const cityRaw = m[1].trim()
  const monRaw = m[2].trim()
  const day = Number(m[3])
  const year = Number(m[4])
  const optionText = m[5].trim()

  const monthLookup = {
    jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4,
    may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8,
    sep: 9, sept: 9, september: 9, oct: 10, october: 10, nov: 11, november: 11,
    dec: 12, december: 12
  }
  const month = monthLookup[monRaw.toLowerCase()]
  if (!month || !day || !year) return null

  const mm = String(month).padStart(2, '0')
  const dd = String(day).padStart(2, '0')
  return {
    city: cityRaw,
    dateIso: `${year}-${mm}-${dd}`,
    optionText
  }
}

function parseOptionSpec(optionText = '') {
  const t = String(optionText || '').trim().toLowerCase()
  let m = t.match(/(\d+)\s*or\s*above/)
  if (m) return { kind: 'atLeast', min: Number(m[1]) }

  m = t.match(/(\d+)\s*or\s*below/)
  if (m) return { kind: 'atMost', max: Number(m[1]) }

  m = t.match(/(\d+)\s*(?:to|-|–)\s*(\d+)/)
  if (m) return { kind: 'range', min: Number(m[1]), max: Number(m[2]) }

  m = t.match(/^(\d+)$/)
  if (m) return { kind: 'exact', value: Number(m[1]) }

  return null
}

function optionMatchesTemp(optionText = '', tempF = null) {
  if (tempF == null || Number.isNaN(Number(tempF))) return null
  const spec = parseOptionSpec(optionText)
  if (!spec) return null

  const t = Number(tempF)
  if (spec.kind === 'atLeast') return t >= spec.min
  if (spec.kind === 'atMost') return t <= spec.max
  if (spec.kind === 'range') return t >= spec.min && t <= spec.max
  if (spec.kind === 'exact') return t === spec.value
  return null
}

async function fetchOpenMeteoMaxTempF(lat, lon, dateIso) {
  try {
    const u = `https://archive-api.open-meteo.com/v1/archive?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}&start_date=${encodeURIComponent(dateIso)}&end_date=${encodeURIComponent(dateIso)}&daily=temperature_2m_max&temperature_unit=fahrenheit&timezone=America%2FNew_York`
    const res = await fetch(u, { cache: 'no-store', signal: AbortSignal.timeout(12000) })
    if (!res.ok) return null
    const json = await res.json()
    const v = json?.daily?.temperature_2m_max?.[0]
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  } catch {
    return null
  }
}

async function fetchWttrMaxTempF(cityName, dateIso) {
  try {
    const u = `https://wttr.in/${encodeURIComponent(cityName)}?format=j1`
    const res = await fetch(u, { cache: 'no-store', signal: AbortSignal.timeout(12000) })
    if (!res.ok) return null
    const json = await res.json()
    const day = (json?.weather || []).find((w) => String(w?.date || '') === dateIso)
    const n = Number(day?.maxtempF)
    return Number.isFinite(n) ? n : null
  } catch {
    return null
  }
}

function cityToTimeAndDatePath(cityName = '') {
  const c = String(cityName || '').trim().toLowerCase()
  if (c === 'la' || c === 'los angeles') return 'los-angeles'
  if (c === 'austin') return 'austin'
  if (c === 'atlanta') return 'atlanta'
  if (c === 'miami') return 'miami'
  if (c === 'denver') return 'denver'
  if (c === 'las vegas') return 'las-vegas'
  if (c === 'san francisco') return 'san-francisco'
  return ''
}

async function fetchTimeAndDateHighTempF(cityName, dateIso) {
  try {
    const cityPath = cityToTimeAndDatePath(cityName)
    if (!cityPath) return null
    const hd = String(dateIso || '').replaceAll('-', '')
    if (!/^\d{8}$/.test(hd)) return null

    const u = `https://www.timeanddate.com/weather/usa/${cityPath}/historic?hd=${hd}`
    const res = await fetch(u, {
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140 Safari/537.36'
      }
    })
    if (!res.ok) return null
    const html = await res.text()
    const text = String(html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')

    const m = text.match(/High\s*\:?\s*(\d{1,3})\s*°?\s*F/i)
    if (!m) return null
    const n = Number(m[1])
    return Number.isFinite(n) ? n : null
  } catch {
    return null
  }
}

async function estimateOutcomeFromWeather(commit = {}) {
  const parsed = parseMarketContract(commit.Contract || '')
  if (!parsed) return null

  const cityKey = String(parsed.city || '').trim().toLowerCase()
  const coord = CITY_COORDS[cityKey]
  if (!coord) return null

  const [openMeteoTemp, wttrTemp, timeAndDateTemp] = await Promise.all([
    fetchOpenMeteoMaxTempF(coord.lat, coord.lon, parsed.dateIso),
    fetchWttrMaxTempF(coord.wttr, parsed.dateIso),
    fetchTimeAndDateHighTempF(parsed.city, parsed.dateIso)
  ])

  const temps = [
    { src: 'timeanddate', val: timeAndDateTemp, weight: 1.4 },
    { src: 'open-meteo', val: openMeteoTemp, weight: 1.0 },
    { src: 'wttr', val: wttrTemp, weight: 0.8 }
  ].filter((x) => x.val != null)

  if (temps.length < 2) {
    return {
      outcomeEstimate: '',
      confidence: 'low',
      sourceNote: `Insufficient weather-source quorum for estimate: timeanddate=${timeAndDateTemp ?? 'n/a'}F, Open-Meteo=${openMeteoTemp ?? 'n/a'}F, wttr=${wttrTemp ?? 'n/a'}F for ${parsed.city} ${parsed.dateIso}.`
    }
  }

  const weighted = temps.reduce((acc, x) => {
    acc.sum += Number(x.val) * x.weight
    acc.w += x.weight
    return acc
  }, { sum: 0, w: 0 })

  const estTemp = weighted.w > 0 ? (weighted.sum / weighted.w) : null
  if (estTemp == null) return null

  const option = String(commit.Chosen_Option || parsed.optionText || '').trim()
  const match = optionMatchesTemp(option, Math.round(estTemp))
  if (match == null) return null

  const position = String(commit.Position || 'YES').trim().toUpperCase()
  const outcomeEstimate = position === 'NO' ? (match ? 'LOSS' : 'WIN') : (match ? 'WIN' : 'LOSS')

  let confidence = 'low'
  const vals = temps.map((x) => Number(x.val))
  const spread = Math.max(...vals) - Math.min(...vals)
  if (temps.length >= 2 && spread <= 2) confidence = 'high'
  else if (temps.length >= 2 && spread <= 4) confidence = 'medium'

  const sourceNote = `Estimated from weather sources (not Coinbase settlement): timeanddate=${timeAndDateTemp ?? 'n/a'}F, Open-Meteo=${openMeteoTemp ?? 'n/a'}F, wttr=${wttrTemp ?? 'n/a'}F, est_max=${Math.round(estTemp)}F for ${parsed.city} ${parsed.dateIso}.`

  return { outcomeEstimate, confidence, sourceNote }
}

async function fetchWinningOptionFromCoinbase(marketUrl = '', options = []) {
  const url = String(marketUrl || '').trim()
  if (!/^https?:\/\//i.test(url)) return null

  try {
    const res = await fetch(url, {
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140 Safari/537.36',
        accept: 'text/html,application/xhtml+xml'
      },
      cache: 'no-store'
    })

    if (!res.ok) return null
    const html = await res.text()
    const winner = optionFromHtml(html, options)
    if (!winner) return null

    return {
      winningOption: winner,
      sourceUrl: url,
      sourceNote: `Auto-settled from Coinbase market page. Winning option detected: ${winner}`
    }
  } catch {
    return null
  }
}

function rowToParsed(row = {}, rawLine = '') {
  const marketProb = parseNum(row.Current_Market_Prob) ?? parseNum(row.Market_Prob)
  const estProb = parseNum(row.Current_Est_Prob) ?? parseNum(row.Est_Prob)
  const edge = parseNum(row.Current_Edge) ?? parseNum(row.Edge)
  const contract = (row.Contract || '').trim()
  const marketKey = (row.Market_Key || contract).trim()

  return {
    ...row,
    _ts: toTs(row),
    _marketProb: marketProb,
    _estProb: estProb,
    _edge: edge,
    _decision: normalizeDecision(row.Decision || '', rawLine),
    _outcome: normalizeOutcome(row.Outcome || ''),
    _contract: contract,
    _marketKey: marketKey
  }
}

export async function runPredictionMarketSettlementCheck() {
  const { headers: baseHeaders, rows } = readCsvStructured()
  if (baseHeaders.length === 0 || rows.length === 0) {
    return { updatedRows: 0, checkedMarkets: 0, settledMarkets: 0, skippedMarkets: 0 }
  }

  const headers = ensureColumns([...baseHeaders], [
    'Market_URL',
    'Settlement_Winning_Option',
    'Settlement_Source_URL',
    'Settlement_Source_Note',
    'Outcome_Estimate',
    'Estimate_Confidence',
    'Estimate_Source_Note'
  ])
  for (const r of rows) {
    for (const h of headers) if (r[h] == null) r[h] = ''
  }

  const parsedRows = rows.map((r) => rowToParsed(r))
  const byMarket = new Map()
  for (let i = 0; i < parsedRows.length; i++) {
    const p = parsedRows[i]
    if (!p._marketKey) continue
    if (!byMarket.has(p._marketKey)) byMarket.set(p._marketKey, [])
    byMarket.get(p._marketKey).push({ idx: i, row: p })
  }

  let updatedRows = 0
  let checkedMarkets = 0
  let settledMarkets = 0
  let skippedMarkets = 0

  for (const entries of byMarket.values()) {
    const events = entries.map((e) => e.row).sort((a, b) => (a._ts || 0) - (b._ts || 0))
    const commit = events.find((e) => decisionIsCommit(e._decision))
    if (!commit) continue

    const alreadyResolved = events.some((e) => normalizeOutcome(e.Outcome || '') === 'WIN' || normalizeOutcome(e.Outcome || '') === 'LOSS')
    if (alreadyResolved) continue

    const marketUrl = String(commit.Market_URL || events[events.length - 1]?.Market_URL || '').trim()
    if (!marketUrl) {
      skippedMarkets += 1
      continue
    }

    checkedMarkets += 1

    const options = [commit.Option_1, commit.Option_2, commit.Option_3].filter(Boolean)
    const settled = await fetchWinningOptionFromCoinbase(marketUrl, options)
    if (!settled?.winningOption) {
      const estimate = await estimateOutcomeFromWeather(commit)
      if (estimate) {
        for (const e of entries) {
          const row = rows[e.idx]
          row.Outcome_Estimate = estimate.outcomeEstimate || 'UNCERTAIN'
          row.Estimate_Confidence = estimate.confidence || 'low'
          row.Estimate_Source_Note = estimate.sourceNote || 'Estimated from weather sources (Coinbase settlement unavailable).'
          updatedRows += 1
        }
      }
      skippedMarkets += 1
      continue
    }

    const chosen = String(commit.Chosen_Option || '').trim()
    const position = String(commit.Position || 'YES').trim().toUpperCase()

    let outcome = ''
    if (chosen) {
      if (position === 'NO') outcome = chosen === settled.winningOption ? 'LOSS' : 'WIN'
      else outcome = chosen === settled.winningOption ? 'WIN' : 'LOSS'
    }

    const nowIso = new Date().toISOString()
    for (const e of entries) {
      const row = rows[e.idx]
      row.Settlement_Winning_Option = settled.winningOption
      row.Settlement_Source_URL = settled.sourceUrl
      row.Settlement_Source_Note = settled.sourceNote
      row.Outcome_Estimate = ''
      row.Estimate_Confidence = ''
      row.Estimate_Source_Note = ''
      if (outcome) row.Outcome = outcome
      if (outcome && !row.ResolvedAt) row.ResolvedAt = nowIso
      updatedRows += 1
    }

    settledMarkets += 1
  }

  if (updatedRows > 0) writeCsvStructured(headers, rows)

  return { updatedRows, checkedMarkets, settledMarkets, skippedMarkets }
}

export async function getPredictionMarketsOverview() {
  if (isSnapshotMode()) {
    return readSnapshot('prediction-markets-noaa', { rows: [], trades: [], metrics: { totalRows: 0, totalCommits: 0, resolvedCommits: 0, wins: 0, losses: 0, winRate: null, avgCommitEdge: null, avgLatestEdge: null }, updatedAtMs: null })
  }
  if (!fs.existsSync(CSV_PATH)) {
    return {
      rows: [],
      trades: [],
      metrics: {
        totalRows: 0,
        totalCommits: 0,
        resolvedCommits: 0,
        wins: 0,
        losses: 0,
        winRate: null,
        avgCommitEdge: null,
        avgLatestEdge: null
      },
      updatedAtMs: null
    }
  }

  const { headers, rows: baseRows } = readCsvStructured()
  if (headers.length <= 1 || baseRows.length === 0) {
    return {
      rows: [],
      trades: [],
      metrics: {
        totalRows: 0,
        totalCommits: 0,
        resolvedCommits: 0,
        wins: 0,
        losses: 0,
        winRate: null,
        avgCommitEdge: null,
        avgLatestEdge: null
      },
      updatedAtMs: fs.statSync(CSV_PATH).mtimeMs
    }
  }

  const rows = baseRows.map((r) => rowToParsed(r)).filter((r) => !!r._contract)
  rows.sort((a, b) => (a._ts || 0) - (b._ts || 0))

  const byContract = new Map()
  for (const r of rows) {
    const key = r._marketKey || r._contract
    if (!byContract.has(key)) byContract.set(key, [])
    byContract.get(key).push(r)
  }

  const trades = []
  for (const [marketKey, events] of byContract.entries()) {
    const commit = events.find((e) => decisionIsCommit(e._decision)) || null
    const latest = events[events.length - 1]
    const outcome = normalizeOutcome((latest?.Outcome || '') || (commit?.Outcome || ''))
    const outcomeEstimate = normalizeOutcome((latest?.Outcome_Estimate || '') || (commit?.Outcome_Estimate || ''))
    const committed = !!commit
    const commitEvents = events.filter((e) => decisionIsCommit(e._decision))
    const positions = Array.from(new Set(commitEvents.map((e) => String(e.Position || '').trim()).filter(Boolean)))
    const chosenOptions = Array.from(new Set(commitEvents.map((e) => String(e.Chosen_Option || '').trim()).filter(Boolean)))

    const edgeTimeline = events
      .filter((e) => e._edge != null)
      .map((e) => ({ ts: e._ts, edge: safePct(e._edge), marketProb: safePct(e._marketProb), estProb: safePct(e._estProb), decision: e._decision }))

    const tradeDate = (commit?.Date || latest?.Date || '').trim()

    const estimatedWager = commit ? 100 : null
    const grossWinPayout = commit ? calcPayoutForWager(commit?._marketProb ?? null, commit?.Position || 'YES', estimatedWager) : null
    const payout = !commit
      ? null
      : outcome === 'WIN'
        ? grossWinPayout
        : outcome === 'LOSS'
          ? 0
          : null
    const payoutEstimate = !commit
      ? null
      : outcomeEstimate === 'WIN'
        ? grossWinPayout
        : outcomeEstimate === 'LOSS'
          ? 0
          : null

    trades.push({
      marketKey,
      tradeDate,
      contractLabel: (commit?._contract || latest?._contract || marketKey).trim(),
      option1: (latest?.Option_1 || commit?.Option_1 || '').trim(),
      option2: (latest?.Option_2 || commit?.Option_2 || '').trim(),
      option3: (latest?.Option_3 || commit?.Option_3 || '').trim(),
      chosenOption: (commit?.Chosen_Option || latest?.Chosen_Option || '').trim(),
      position: (commit?.Position || latest?.Position || '').trim(),
      positions,
      multiPosition: positions.length > 1,
      chosenOptions,
      committed,
      commitDate: (commit?.Date || '').trim(),
      latestDate: (latest?.Date || '').trim(),
      commitAtMs: commit?._ts || null,
      commitDecision: commit?._decision || '',
      estimatedWager,
      payout,
      payoutEstimate,
      commitMarketProb: safePct(commit?._marketProb ?? null),
      commitEstProb: safePct(commit?._estProb ?? null),
      commitEdge: safePct(commit?._edge ?? null),
      latestAtMs: latest?._ts || null,
      latestMarketProb: safePct(latest?._marketProb ?? null),
      latestEstProb: safePct(latest?._estProb ?? null),
      latestEdge: safePct(latest?._edge ?? null),
      edgeDrift: (commit?._edge != null && latest?._edge != null) ? safePct(latest._edge - commit._edge) : null,
      outcome,
      outcomeEstimate,
      estimateConfidence: (latest?.Estimate_Confidence || commit?.Estimate_Confidence || '').trim(),
      estimateSourceNote: (latest?.Estimate_Source_Note || commit?.Estimate_Source_Note || '').trim(),
      settlementWinningOption: (latest?.Settlement_Winning_Option || commit?.Settlement_Winning_Option || '').trim(),
      settlementSourceUrl: (latest?.Settlement_Source_URL || commit?.Settlement_Source_URL || '').trim(),
      settlementSourceNote: (latest?.Settlement_Source_Note || commit?.Settlement_Source_Note || '').trim(),
      marketUrl: (latest?.Market_URL || commit?.Market_URL || '').trim(),
      scans: events.length,
      edgeTimeline
    })
  }

  trades.sort((a, b) => (b.latestAtMs || 0) - (a.latestAtMs || 0))

  const committedTrades = trades.filter((t) => t.committed)
  const resolved = committedTrades.filter((t) => t.outcome === 'WIN' || t.outcome === 'LOSS')
  const wins = resolved.filter((t) => t.outcome === 'WIN').length
  const losses = resolved.filter((t) => t.outcome === 'LOSS').length

  const avg = (arr) => arr.length ? safePct(arr.reduce((s, v) => s + v, 0) / arr.length) : null

  const commitEdges = committedTrades.map((t) => t.commitEdge).filter((v) => v != null)
  const latestEdges = committedTrades.map((t) => t.latestEdge).filter((v) => v != null)
  const realizedNetPnl = Math.round(resolved.reduce((sum, t) => {
    const wager = Number(t.estimatedWager)
    const payout = Number(t.payout)
    if (!Number.isFinite(wager) || !Number.isFinite(payout)) return sum
    return sum + (payout - wager)
  }, 0) * 100) / 100

  return {
    rows,
    trades,
    metrics: {
      totalRows: rows.length,
      totalCommits: committedTrades.length,
      resolvedCommits: resolved.length,
      wins,
      losses,
      winRate: resolved.length ? safePct((wins / resolved.length) * 100) : null,
      avgCommitEdge: avg(commitEdges),
      avgLatestEdge: avg(latestEdges),
      realizedNetPnl
    },
    updatedAtMs: fs.statSync(CSV_PATH).mtimeMs
  }
}
