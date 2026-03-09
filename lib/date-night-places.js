import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const CSV_PATH = path.join(ROOT, 'DATE-NIGHT-PLACES.csv')

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

export function getDateNightPlacesData() {
  const rows = asRows().filter((r) => r.name)

  const byCity = rows.reduce((acc, r) => {
    const key = r.city || 'Unknown'
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})

  return {
    rows,
    metrics: {
      total: rows.length,
      restaurants: rows.filter((r) => /restaurant/i.test(r.category || '')).length,
      bars: rows.filter((r) => /bar/i.test(r.category || '')).length,
      highPriority: rows.filter((r) => /high/i.test(r.priority || '')).length,
      byCity
    },
    updatedAtMs: fs.existsSync(CSV_PATH) ? fs.statSync(CSV_PATH).mtimeMs : null
  }
}
