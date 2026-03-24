import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { isSnapshotMode, readSnapshot } from './snapshot-store.js'

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url))
const WORKSPACE_ROOT = path.resolve(MODULE_DIR, '..', '..')
const DATA_PATH = path.join(WORKSPACE_ROOT, 'memory', 'openclaw-enhancements.json')
const UPLOAD_DIR = path.join(WORKSPACE_ROOT, 'memory', 'openclaw-enhancement-uploads')

const DEFAULT_CATEGORIES = [
  'browser',
  'ui_ux',
  'cron_automation',
  'reliability',
  'security',
  'agent_behavior',
  'integrations',
  'documentation',
  'other'
]

const DEFAULT_STATUSES = [
  'idea',
  'researching',
  'ready',
  'in_progress',
  'blocked',
  'shipped',
  'rejected'
]

const DEFAULT_PRIORITIES = ['P0', 'P1', 'P2', 'P3']

function nowIso() {
  return new Date().toISOString()
}

function slugify(value = '') {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'enhancement'
}

function makeEnhancementRecord(input = {}) {
  const createdAt = nowIso()
  const title = String(input.title || '').trim() || 'Untitled enhancement'
  return {
    id: input.id || `enh-${slugify(title)}-${Math.random().toString(36).slice(2, 8)}`,
    title,
    category: input.category || 'other',
    status: input.status || 'idea',
    priority: input.priority || 'P2',
    owner: input.owner || 'Joe',
    summary: input.summary || '',
    notes: input.notes || '',
    supportLinks: Array.isArray(input.supportLinks) ? input.supportLinks : [],
    supportFiles: Array.isArray(input.supportFiles) ? input.supportFiles : [],
    relatedRoute: input.relatedRoute || '',
    relatedComponent: input.relatedComponent || '',
    nextStep: input.nextStep || '',
    createdAt,
    updatedAt: createdAt
  }
}

function makeSeedData() {
  return {
    schemaVersion: 1,
    categories: DEFAULT_CATEGORIES,
    statuses: DEFAULT_STATUSES,
    priorities: DEFAULT_PRIORITIES,
    enhancements: [
      makeEnhancementRecord({
        id: 'enh-browser-sandbox-defaults',
        title: 'Harden small-model sandbox + tool deny defaults for untrusted input',
        summary: 'Tighten the default safety posture for smaller models handling untrusted input so risky tool access is denied by default.',
        category: 'security',
        priority: 'P1',
        owner: 'Alfred',
        nextStep: 'Define exact config/control points and document the safest rollout path.'
      }),
      makeEnhancementRecord({
        id: 'enh-browser-janitor-fix',
        title: 'Fix Browser Janitor PowerShell command path issue and validate sustained clean runs',
        summary: 'Repair the browser janitor command path problem and confirm it stays healthy across repeated scheduled runs.',
        category: 'reliability',
        priority: 'P1',
        owner: 'Alfred',
        relatedComponent: 'scripts/browser-janitor.ps1',
        nextStep: 'Trace the failing command path and verify post-fix cron health.'
      }),
      makeEnhancementRecord({
        id: 'enh-update-triage-checklist',
        title: 'Expand OpenClaw update triage to include auto-generated remediation checklist',
        summary: 'Make update triage more actionable by producing a concrete remediation checklist instead of only urgency classification.',
        category: 'cron_automation',
        priority: 'P2',
        owner: 'Alfred',
        nextStep: 'Define checklist output format and where it should be surfaced.'
      }),
      makeEnhancementRecord({
        id: 'enh-job-ownership-taxonomy',
        title: 'Add scheduled-job ownership taxonomy and recurring quarterly cleanup',
        summary: 'Track job ownership and add periodic cleanup/review so stale or ownerless jobs are easier to spot and retire.',
        category: 'documentation',
        priority: 'P2',
        owner: 'Alfred',
        nextStep: 'Design owner fields + quarterly audit workflow.'
      }),
      makeEnhancementRecord({
        id: 'enh-pinchtab-pilot',
        title: 'Evaluate PinchTab as an optional browser-runtime enhancement',
        summary: 'Pilot PinchTab on one non-critical workflow before any broader adoption decision.',
        category: 'browser',
        priority: 'P3',
        owner: 'Alfred',
        nextStep: 'Select one safe pilot workflow and define success criteria.'
      }),
      makeEnhancementRecord({
        id: 'enh-playwright-vs-browser-use',
        title: 'Playwright vs browser-use decision and possible browser enhancement path',
        summary: 'Keep Playwright as the trust anchor by default; evaluate whether a hardened second-layer browser autonomy option is worth adding later.',
        category: 'browser',
        status: 'researching',
        priority: 'P1',
        owner: 'Joe',
        supportFiles: ['PLAYWRIGHT-VS-BROWSER-USE-ASSESSMENT.md'],
        relatedRoute: '/openclaw-enhancements',
        relatedComponent: 'mc/app/openclaw-enhancements/page.js',
        notes: 'Current recommendation: keep Playwright as default; only add browser-use as a hardened optional second layer if the extra autonomy is worth the larger trust surface.',
        nextStep: 'Represent browser-control enhancement ideas as structured records instead of free-text bullets.'
      })
    ],
    updatedAt: nowIso()
  }
}

function ensureStore() {
  if (!fs.existsSync(DATA_PATH)) {
    fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true })
    fs.writeFileSync(DATA_PATH, JSON.stringify(makeSeedData(), null, 2), 'utf8')
  }
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true })
}

function readStore() {
  ensureStore()
  try {
    const raw = fs.readFileSync(DATA_PATH, 'utf8').replace(/^\uFEFF/, '')
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') throw new Error('invalid enhancements store')
    return parsed
  } catch {
    const seed = makeSeedData()
    fs.writeFileSync(DATA_PATH, JSON.stringify(seed, null, 2), 'utf8')
    return seed
  }
}

function writeStore(data) {
  fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true })
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf8')
}

function sortEnhancements(enhancements = []) {
  const priorityIndex = new Map(DEFAULT_PRIORITIES.map((v, i) => [v, i]))
  return [...enhancements].sort((a, b) => {
    const pa = priorityIndex.get(a.priority) ?? 99
    const pb = priorityIndex.get(b.priority) ?? 99
    if (pa !== pb) return pa - pb
    return String(a.title || '').localeCompare(String(b.title || ''))
  })
}

export function getEnhancementsData() {
  if (isSnapshotMode()) {
    return readSnapshot('openclaw-enhancements', {
      categories: DEFAULT_CATEGORIES,
      statuses: DEFAULT_STATUSES,
      priorities: DEFAULT_PRIORITIES,
      enhancements: []
    })
  }

  const store = readStore()
  return {
    categories: store.categories || DEFAULT_CATEGORIES,
    statuses: store.statuses || DEFAULT_STATUSES,
    priorities: store.priorities || DEFAULT_PRIORITIES,
    enhancements: sortEnhancements(Array.isArray(store.enhancements) ? store.enhancements : []),
    updatedAt: store.updatedAt || null
  }
}

export function createEnhancement(input = {}) {
  const store = readStore()
  const created = makeEnhancementRecord(input)
  store.enhancements = sortEnhancements([...(store.enhancements || []), created])
  store.updatedAt = created.updatedAt
  writeStore(store)
  return created
}

export function updateEnhancement(input = {}) {
  const id = String(input.id || '').trim()
  if (!id) throw new Error('id is required')

  const store = readStore()
  const idx = (store.enhancements || []).findIndex((item) => item.id === id)
  if (idx < 0) throw new Error('enhancement not found')

  const current = store.enhancements[idx]
  const next = {
    ...current,
    title: input.title ?? current.title,
    category: input.category ?? current.category,
    status: input.status ?? current.status,
    priority: input.priority ?? current.priority,
    owner: input.owner ?? current.owner,
    summary: input.summary ?? current.summary,
    notes: input.notes ?? current.notes,
    supportLinks: Array.isArray(input.supportLinks) ? input.supportLinks : current.supportLinks,
    supportFiles: Array.isArray(input.supportFiles) ? input.supportFiles : current.supportFiles,
    relatedRoute: input.relatedRoute ?? current.relatedRoute,
    relatedComponent: input.relatedComponent ?? current.relatedComponent,
    nextStep: input.nextStep ?? current.nextStep,
    updatedAt: nowIso()
  }

  store.enhancements[idx] = next
  store.enhancements = sortEnhancements(store.enhancements || [])
  store.updatedAt = next.updatedAt
  writeStore(store)
  return next
}

export function attachEnhancementFile(id, file) {
  const enhancementId = String(id || '').trim()
  if (!enhancementId) throw new Error('id is required')
  if (!file) throw new Error('file is required')

  const store = readStore()
  const idx = (store.enhancements || []).findIndex((item) => item.id === enhancementId)
  if (idx < 0) throw new Error('enhancement not found')

  const originalName = String(file.name || 'attachment.bin')
  const safeName = originalName.replace(/[^a-zA-Z0-9._-]+/g, '_')
  const ext = path.extname(safeName)
  const stem = path.basename(safeName, ext)
  const filename = `${enhancementId}-${Date.now()}-${slugify(stem)}${ext}`
  const absPath = path.join(UPLOAD_DIR, filename)
  const relPath = path.relative(WORKSPACE_ROOT, absPath).replace(/\\/g, '/')

  const bytes = Buffer.from(file.arrayBuffer ? Buffer.from([]) : [])
  return { absPath, relPath, filename, originalName, idx, store }
}

export async function saveUploadedEnhancementFile(id, webFile) {
  const enhancementId = String(id || '').trim()
  if (!enhancementId) throw new Error('id is required')
  if (!webFile) throw new Error('file is required')

  const store = readStore()
  const idx = (store.enhancements || []).findIndex((item) => item.id === enhancementId)
  if (idx < 0) throw new Error('enhancement not found')

  const originalName = String(webFile.name || 'attachment.bin')
  const safeName = originalName.replace(/[^a-zA-Z0-9._-]+/g, '_')
  const ext = path.extname(safeName)
  const stem = path.basename(safeName, ext)
  const filename = `${enhancementId}-${Date.now()}-${slugify(stem)}${ext}`
  const absPath = path.join(UPLOAD_DIR, filename)
  const relPath = path.relative(WORKSPACE_ROOT, absPath).replace(/\\/g, '/')
  const bytes = Buffer.from(await webFile.arrayBuffer())

  fs.mkdirSync(UPLOAD_DIR, { recursive: true })
  fs.writeFileSync(absPath, bytes)

  const current = store.enhancements[idx]
  const nextFiles = Array.from(new Set([...(current.supportFiles || []), relPath]))
  const updated = {
    ...current,
    supportFiles: nextFiles,
    updatedAt: nowIso()
  }
  store.enhancements[idx] = updated
  store.updatedAt = updated.updatedAt
  writeStore(store)
  return { enhancement: updated, uploadedPath: relPath }
}
