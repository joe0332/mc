import fs from 'node:fs'
import path from 'node:path'
import { isSnapshotMode, readSnapshot } from './snapshot-store.js'

const ROOT = process.cwd()
const CSV_PATH = path.join(ROOT, 'UPWORK-JOBS-TRACKER.csv')
const PREFS_PATH = path.join(ROOT, 'memory', 'upwork-preferences.json')
const EXAMPLE_URL = 'https://www.upwork.com/freelance-jobs/apply/Google-Apps-Script-Developer-Automate-Scoring-Email-Results-from-Google-Form_~022026320496925973320/'

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

function asRows() {
  if (!fs.existsSync(CSV_PATH)) return []
  const lines = fs.readFileSync(CSV_PATH, 'utf8').split(/\r?\n/).filter(Boolean)
  if (lines.length < 2) return []
  const headers = parseCsvLine(lines[0])
  return lines.slice(1).map((line) => {
    const cols = parseCsvLine(line)
    const row = {}
    for (let i = 0; i < headers.length; i++) row[headers[i]] = cols[i] ?? ''
    return row
  })
}

function readPrefs() {
  try {
    if (!fs.existsSync(PREFS_PATH)) return {}
    return JSON.parse(fs.readFileSync(PREFS_PATH, 'utf8')) || {}
  } catch {
    return {}
  }
}

function writePrefs(prefs = {}) {
  fs.mkdirSync(path.dirname(PREFS_PATH), { recursive: true })
  fs.writeFileSync(PREFS_PATH, JSON.stringify(prefs, null, 2), 'utf8')
}

function rowKey(r = {}) {
  return String(r.job_url || r.job_title || '').trim()
}

export function upsertUpworkPreference({ key, interest, feedback } = {}) {
  const k = String(key || '').trim()
  if (!k) throw new Error('Missing key for Upwork preference')
  const prefs = readPrefs()
  const entry = prefs[k] || {}
  prefs[k] = {
    ...entry,
    interest: Number.isFinite(Number(interest)) ? Math.max(1, Math.min(5, Number(interest))) : (entry.interest ?? ''),
    feedback: String(feedback ?? entry.feedback ?? ''),
    updatedAtMs: Date.now()
  }
  writePrefs(prefs)
  return prefs[k]
}

export function getUpworkJobsData() {
  if (isSnapshotMode()) {
    return readSnapshot('upwork-jobs', { rows: [], metrics: { total: 0, fixed: 0, hourly: 0, longTerm: 0 }, updatedAtMs: null })
  }
  const rows = asRows().filter((r) => r.job_title || r.job_url)

  const hasExample = rows.some((r) => String(r.job_url || '').trim() === EXAMPLE_URL)
  if (!hasExample) {
    rows.unshift({
      scan_timestamp_est: 'manual example',
      job_title: 'Google Apps Script Developer to Automate Scoring + Email Results from Google Form',
      job_url: EXAMPLE_URL,
      job_type: 'Example',
      budget_or_rate: '—',
      duration_hint: '—',
      summary: 'User-provided example job for preference calibration.',
      why_fit: 'Apps Script + automation workflow fit.',
      status: 'example'
    })
  }

  rows.sort((a, b) => String(b.scan_timestamp_est || '').localeCompare(String(a.scan_timestamp_est || '')))

  const prefs = readPrefs()
  const enrichedRows = rows.map((r) => {
    const pref = prefs[rowKey(r)] || {}
    return {
      ...r,
      interest: pref.interest ?? '',
      feedback: pref.feedback ?? '',
      prefUpdatedAtMs: pref.updatedAtMs ?? null
    }
  })

  const total = enrichedRows.length
  const fixed = enrichedRows.filter((r) => /fixed/i.test(r.job_type || '')).length
  const hourly = enrichedRows.filter((r) => /hourly/i.test(r.job_type || '')).length
  const longTerm = enrichedRows.filter((r) => /(3\+?\s*months|3\s*months|6\s*months|ongoing)/i.test(r.duration_hint || '')).length

  return {
    rows: enrichedRows,
    metrics: {
      total,
      fixed,
      hourly,
      longTerm
    },
    updatedAtMs: fs.existsSync(CSV_PATH) ? fs.statSync(CSV_PATH).mtimeMs : null
  }
}
