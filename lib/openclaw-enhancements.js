import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'

const ROOT = process.cwd()
const PREFS_PATH = path.join(ROOT, 'memory', 'cron-job-categories.json')

function readPrefs() {
  try {
    if (!fs.existsSync(PREFS_PATH)) return {}
    const parsed = JSON.parse(fs.readFileSync(PREFS_PATH, 'utf8'))
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writePrefs(prefs = {}) {
  fs.mkdirSync(path.dirname(PREFS_PATH), { recursive: true })
  fs.writeFileSync(PREFS_PATH, JSON.stringify(prefs, null, 2), 'utf8')
}

function listCronJobs() {
  try {
    const raw = execSync('openclaw cron list --all --json', {
      cwd: ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
      encoding: 'utf8',
      timeout: 20000
    })
    const parsed = JSON.parse(raw)
    return parsed.jobs || []
  } catch {
    return []
  }
}

export function getEnhancementsData() {
  const prefs = readPrefs()
  const jobs = listCronJobs().map((j) => ({
    id: j.id,
    name: j.name || 'Unnamed job',
    description: j.description || '',
    enabled: !!j.enabled,
    scheduleExpr: j.schedule?.expr || (j.schedule?.kind === 'at' ? `at ${j.schedule?.at || ''}` : ''),
    scheduleTz: j.schedule?.tz || '',
    category: prefs?.[j.id]?.category || 'Uncategorized'
  }))

  jobs.sort((a, b) => String(a.name).localeCompare(String(b.name)))

  return {
    jobs,
    categories: [
      'Uncategorized',
      'OpenClaw Resilience',
      'Joe Personal',
      'Finance',
      'Health/Fitness',
      'Ops/Docs',
      'Business',
      'Maintenance',
      'Experimental'
    ]
  }
}

export function saveJobCategory({ jobId, category } = {}) {
  const id = String(jobId || '').trim()
  if (!id) throw new Error('jobId is required')
  const nextCategory = String(category || '').trim() || 'Uncategorized'

  const prefs = readPrefs()
  prefs[id] = {
    ...(prefs[id] || {}),
    category: nextCategory,
    updatedAtMs: Date.now()
  }
  writePrefs(prefs)
  return prefs[id]
}
