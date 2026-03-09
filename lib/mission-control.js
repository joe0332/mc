import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'
import { DatabaseSync } from 'node:sqlite'
import { markTodoCompleteByKanbanCardId } from './todo-list.js'

const ROOT = process.cwd()
const DB_DIR = path.join(ROOT, 'data')
const DB_PATH = path.join(DB_DIR, 'mission-control.db')
const TASKS_PATH = path.join(ROOT, 'memory', 'active-tasks.md')

function ensureDb() {
  if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true })
  const db = new DatabaseSync(DB_PATH)
  db.exec(`
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT
    );
    CREATE TABLE IF NOT EXISTS cron_jobs (
      id TEXT PRIMARY KEY,
      name TEXT,
      enabled INTEGER,
      schedule_expr TEXT,
      schedule_tz TEXT,
      last_status TEXT,
      next_run_at_ms INTEGER,
      last_run_at_ms INTEGER,
      last_duration_ms INTEGER,
      consecutive_errors INTEGER,
      updated_at_ms INTEGER
    );
    CREATE TABLE IF NOT EXISTS memory_docs (
      rel_path TEXT PRIMARY KEY,
      title TEXT,
      content TEXT,
      updated_at_ms INTEGER,
      indexed_at_ms INTEGER
    );
    CREATE TABLE IF NOT EXISTS kanban_cards (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      details TEXT,
      status TEXT NOT NULL,
      owner TEXT,
      type TEXT,
      priority TEXT,
      artifact_link TEXT,
      feedback TEXT,
      next_steps TEXT,
      is_archived INTEGER DEFAULT 0,
      archived_at_ms INTEGER,
      sort_order INTEGER DEFAULT 0,
      created_at_ms INTEGER,
      updated_at_ms INTEGER
    );
    CREATE TABLE IF NOT EXISTS communications (
      id TEXT PRIMARY KEY,
      created_at_ms INTEGER NOT NULL,
      timestamp_est TEXT,
      channel TEXT NOT NULL,
      target TEXT,
      reason TEXT NOT NULL,
      message_id TEXT,
      related_card_id TEXT,
      related_job_id TEXT,
      delivery_status TEXT NOT NULL,
      notes TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_comm_card ON communications(related_card_id, created_at_ms DESC);
    CREATE INDEX IF NOT EXISTS idx_comm_job ON communications(related_job_id, created_at_ms DESC);
  `)

  // Lightweight migrations for existing DBs
  try {
    const cols = db.prepare("PRAGMA table_info('kanban_cards')").all().map((r) => r.name)
    if (!cols.includes('feedback')) db.exec('ALTER TABLE kanban_cards ADD COLUMN feedback TEXT')
    if (!cols.includes('next_steps')) db.exec('ALTER TABLE kanban_cards ADD COLUMN next_steps TEXT')
    if (!cols.includes('is_archived')) db.exec('ALTER TABLE kanban_cards ADD COLUMN is_archived INTEGER DEFAULT 0')
    if (!cols.includes('archived_at_ms')) db.exec('ALTER TABLE kanban_cards ADD COLUMN archived_at_ms INTEGER')
  } catch {
    // Ignore migration issues in constrained runtimes.
  }

  try {
    db.exec(`CREATE VIRTUAL TABLE IF NOT EXISTS memory_docs_fts USING fts5(rel_path, title, content)`)
  } catch {
    // FTS5 may be unavailable in some sqlite builds; we gracefully fall back to LIKE.
  }

  return db
}

function parseTasks(md) {
  const lines = md.split(/\r?\n/)
  const out = { ideasInFlight: [], pending: [], completed: [] }
  let section = ''
  for (const line of lines) {
    if (/^##\s+Ideas\s+In\s+Flight/i.test(line)) section = 'ideasInFlight'
    else if (/^##\s+Pending/i.test(line)) section = 'pending'
    else if (/^##\s+Completed/i.test(line)) section = 'completed'
    else if (/^-\s+/.test(line) && section) out[section].push(line.replace(/^-\s+/, '').trim())
  }
  if (out.ideasInFlight.length === 0) out.ideasInFlight.push('None')
  if (out.pending.length === 0) out.pending.push('None')
  if (out.completed.length === 0) out.completed.push('None')
  return out
}

function readTasks() {
  try {
    return parseTasks(fs.readFileSync(TASKS_PATH, 'utf8'))
  } catch {
    return { pending: ['No task file found'], completed: ['None'] }
  }
}

function listCronJobs() {
  try {
    const raw = execSync('openclaw cron list --all --json', {
      cwd: ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
      encoding: 'utf8',
      timeout: 15000
    })
    const parsed = JSON.parse(raw)
    return parsed.jobs || []
  } catch {
    return []
  }
}

function persistJobs(db, jobs) {
  const now = Date.now()
  const incomingIds = new Set((jobs || []).map((j) => j.id))
  const upsert = db.prepare(`
    INSERT INTO cron_jobs (id, name, enabled, schedule_expr, schedule_tz, last_status, next_run_at_ms, last_run_at_ms, last_duration_ms, consecutive_errors, updated_at_ms)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name=excluded.name,
      enabled=excluded.enabled,
      schedule_expr=excluded.schedule_expr,
      schedule_tz=excluded.schedule_tz,
      last_status=excluded.last_status,
      next_run_at_ms=excluded.next_run_at_ms,
      last_run_at_ms=excluded.last_run_at_ms,
      last_duration_ms=excluded.last_duration_ms,
      consecutive_errors=excluded.consecutive_errors,
      updated_at_ms=excluded.updated_at_ms
  `)

  for (const j of jobs) {
    upsert.run(
      j.id,
      j.name || 'Unnamed job',
      j.enabled ? 1 : 0,
      j.schedule?.expr || null,
      j.schedule?.tz || null,
      j.state?.lastStatus || j.state?.lastRunStatus || null,
      j.state?.nextRunAtMs || null,
      j.state?.lastRunAtMs || null,
      j.state?.lastDurationMs || null,
      j.state?.consecutiveErrors || 0,
      now
    )
  }

  if (incomingIds.size > 0) {
    const existing = db.prepare('SELECT id FROM cron_jobs').all()
    const del = db.prepare('DELETE FROM cron_jobs WHERE id = ?')
    for (const row of existing) {
      if (!incomingIds.has(row.id)) del.run(row.id)
    }
  }

  db.prepare('INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run('lastRefreshedAt', String(now))
}

function selectJobs(db) {
  return db.prepare(`
    SELECT id, name, enabled, schedule_expr as scheduleExpr, schedule_tz as scheduleTz, last_status as lastStatus,
           next_run_at_ms as nextRunAtMs, last_run_at_ms as lastRunAtMs,
           last_duration_ms as lastDurationMs, consecutive_errors as consecutiveErrors
    FROM cron_jobs
    ORDER BY name ASC
  `).all()
}

function getMemoryFileList() {
  const files = []
  const SKIP_DIRS = new Set([
    '.git', '.next', 'node_modules', '.browser_session', 'backup-2026-02-17-1616', 'backup-next', 'backups', 'WizTree', 'workspace'
  ])

  const walk = (dir) => {
    if (!fs.existsSync(dir)) return
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue
        walk(full)
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
        files.push(full)
      }
    }
  }

  walk(ROOT)
  return files
}

function toRel(file) {
  return path.relative(ROOT, file).replace(/\\/g, '/')
}

function titleFrom(rel, content) {
  const line = (content.split(/\r?\n/).find((l) => l.trim().startsWith('#')) || '').replace(/^#+\s*/, '').trim()
  return line || rel
}

export function refreshMemoryIndex() {
  const db = ensureDb()
  const files = getMemoryFileList()
  const now = Date.now()
  const seen = new Set()

  const upsert = db.prepare(`
    INSERT INTO memory_docs (rel_path, title, content, updated_at_ms, indexed_at_ms)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(rel_path) DO UPDATE SET
      title=excluded.title,
      content=excluded.content,
      updated_at_ms=excluded.updated_at_ms,
      indexed_at_ms=excluded.indexed_at_ms
  `)

  for (const file of files) {
    const stat = fs.statSync(file)
    const rel = toRel(file)
    const content = fs.readFileSync(file, 'utf8')
    const title = titleFrom(rel, content)
    seen.add(rel)
    upsert.run(rel, title, content, stat.mtimeMs, now)
  }

  const existing = db.prepare('SELECT rel_path FROM memory_docs').all()
  const delDoc = db.prepare('DELETE FROM memory_docs WHERE rel_path = ?')
  for (const row of existing) {
    if (!seen.has(row.rel_path)) delDoc.run(row.rel_path)
  }

  try {
    db.exec('DELETE FROM memory_docs_fts')
    const rows = db.prepare('SELECT rel_path, title, content FROM memory_docs').all()
    const ins = db.prepare('INSERT INTO memory_docs_fts (rel_path, title, content) VALUES (?, ?, ?)')
    for (const r of rows) ins.run(r.rel_path, r.title, r.content)
  } catch {
    // Ignore if FTS unavailable.
  }

  db.prepare('INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run('memoryIndexedAt', String(now))
  db.close()
  return { indexedDocs: files.length }
}

function rankMemoryDoc(relPath = '') {
  const p = relPath.toLowerCase()
  const staples = [
    'soul.md',
    'user.md',
    'identity.md',
    'agents.md',
    'tools.md',
    'heartbeat.md',
    'cron-jobs.md'
  ]

  const stapleIdx = staples.findIndex((s) => p === s)
  if (stapleIdx >= 0) return [0, stapleIdx, 0]

  if (p === 'memory.md') return [1, 0, 0]

  const daily = p.match(/^memory\/(\d{4}-\d{2}-\d{2})\.md$/)
  if (daily) return [2, -Number(daily[1].replace(/-/g, '')), 0]

  return [3, 0, 0]
}

export function searchMemoryDocs(query = '', limit = 30) {
  const db = ensureDb()
  const q = (query || '').trim()

  let rows
  if (!q) {
    rows = db.prepare('SELECT rel_path as relPath, title, updated_at_ms as updatedAtMs FROM memory_docs').all()
    rows.sort((a, b) => {
      const ra = rankMemoryDoc(a.relPath)
      const rb = rankMemoryDoc(b.relPath)
      if (ra[0] !== rb[0]) return ra[0] - rb[0]
      if (ra[1] !== rb[1]) return ra[1] - rb[1]
      return (b.updatedAtMs || 0) - (a.updatedAtMs || 0)
    })
    rows = rows.slice(0, limit)
  } else {
    try {
      rows = db.prepare(`
        SELECT rel_path as relPath, title, updated_at_ms as updatedAtMs,
               snippet(memory_docs_fts, 2, '[[', ']]', ' … ', 24) as snippet
        FROM memory_docs_fts
        WHERE memory_docs_fts MATCH ?
        LIMIT ?
      `).all(q, limit)
    } catch {
      const like = `%${q}%`
      rows = db.prepare(`
        SELECT rel_path as relPath, title, updated_at_ms as updatedAtMs,
               substr(content, 1, 240) as snippet
        FROM memory_docs
        WHERE title LIKE ? OR content LIKE ? OR rel_path LIKE ?
        ORDER BY updated_at_ms DESC
        LIMIT ?
      `).all(like, like, like, limit)
    }
  }

  const meta = db.prepare('SELECT value FROM meta WHERE key = ?').get('memoryIndexedAt')
  db.close()
  return { docs: rows || [], memoryIndexedAt: meta ? Number(meta.value) : null }
}

export function getMemoryDoc(relPath) {
  if (!relPath) throw new Error('path is required')
  const db = ensureDb()
  const row = db.prepare('SELECT rel_path as relPath, title, content, updated_at_ms as updatedAtMs FROM memory_docs WHERE rel_path = ?').get(relPath)
  db.close()
  if (!row) throw new Error('Memory document not found')
  return row
}

export function getWorkspaceDoc(relPath) {
  if (!relPath) throw new Error('path is required')
  const safeRel = String(relPath).replace(/^\/+/, '')
  const abs = path.join(ROOT, safeRel)
  const normalized = path.normalize(abs)
  if (!normalized.startsWith(path.normalize(ROOT))) throw new Error('invalid path')
  if (!fs.existsSync(normalized)) throw new Error('document not found')

  const stat = fs.statSync(normalized)
  if (!stat.isFile()) throw new Error('not a file')

  const content = fs.readFileSync(normalized, 'utf8')
  const title = titleFrom(safeRel, content)
  return {
    relPath: safeRel.replace(/\\/g, '/'),
    title,
    content,
    updatedAtMs: stat.mtimeMs
  }
}

function makeSnippet(text = '', query = '', maxLen = 180) {
  const src = String(text || '')
  if (!src) return ''
  const q = String(query || '').trim().toLowerCase()
  if (!q) return src.slice(0, maxLen)

  const idx = src.toLowerCase().indexOf(q)
  if (idx < 0) return src.slice(0, maxLen)

  const start = Math.max(0, idx - 60)
  const end = Math.min(src.length, idx + q.length + 80)
  const prefix = start > 0 ? '…' : ''
  const suffix = end < src.length ? '…' : ''
  return `${prefix}${src.slice(start, end)}${suffix}`
}

export function searchMissionControl(query = '', limit = 8) {
  const q = (query || '').trim()
  if (!q) return { query: q, jobs: [], cards: [], docs: [] }

  const qLower = q.toLowerCase()

  const docs = (searchMemoryDocs(q, limit).docs || []).slice(0, limit)

  const jobs = listCronJobs()
    .map((j) => ({
      id: j.id,
      name: j.name || 'Unnamed job',
      description: j.description || '',
      scheduleExpr: j.schedule?.expr || '',
      scheduleTz: j.schedule?.tz || '',
      haystack: [j.id, j.name, j.description, j.schedule?.expr, j.schedule?.tz].filter(Boolean).join(' | ')
    }))
    .filter((j) => j.haystack.toLowerCase().includes(qLower))
    .slice(0, limit)
    .map((j) => ({
      id: j.id,
      name: j.name,
      description: j.description,
      scheduleExpr: j.scheduleExpr,
      scheduleTz: j.scheduleTz,
      snippet: makeSnippet(j.haystack, q)
    }))

  const db = ensureDb()
  const like = `%${q}%`
  const cards = db.prepare(`
    SELECT id, title, details, status, owner, type, priority, artifact_link as artifactLink, updated_at_ms as updatedAtMs
    FROM kanban_cards
    WHERE title LIKE ? OR details LIKE ? OR owner LIKE ? OR type LIKE ? OR priority LIKE ? OR artifact_link LIKE ?
    ORDER BY updated_at_ms DESC
    LIMIT ?
  `).all(like, like, like, like, like, like, limit).map((c) => ({
    ...c,
    snippet: makeSnippet([c.title, c.details, c.artifactLink].filter(Boolean).join(' | '), q)
  }))
  db.close()

  return { query: q, jobs, cards, docs }
}

export function refreshDashboardData() {
  const db = ensureDb()
  const jobs = listCronJobs()
  persistJobs(db, jobs)
  db.close()
  return { refreshedJobs: jobs.length }
}

function estimateWeeklyMinutesSaved(jobs = []) {
  const profiles = [
    { match: /token balance|token tracker|anthropic/i, minutes: 15 },
    { match: /spending monitor|capital one/i, minutes: 25 },
    { match: /amazon orders/i, minutes: 20 },
    { match: /backup|rollback/i, minutes: 12 },
    { match: /security audit|healthcheck/i, minutes: 12 },
    { match: /update triage|docs drift|doc audit/i, minutes: 8 },
    { match: /watchdog|gateway/i, minutes: 10 }
  ]

  let total = 0
  const breakdown = []
  for (const j of jobs) {
    const name = j.name || ''
    const profile = profiles.find((p) => p.match.test(name))
    if (!profile) continue
    total += profile.minutes
    breakdown.push({ name, minutes: profile.minutes })
  }

  const dedup = new Map()
  for (const item of breakdown) {
    const key = item.name
    if (!dedup.has(key)) dedup.set(key, item)
  }

  return {
    minutes: total,
    hours: Math.round((total / 60) * 10) / 10,
    breakdown: Array.from(dedup.values()).sort((a, b) => b.minutes - a.minutes).slice(0, 6)
  }
}

function recommendOffloadTask(tasks = { pending: [] }) {
  const pending = Array.isArray(tasks.pending) ? tasks.pending : []
  if (pending.length === 0) {
    return {
      title: 'No pending offload candidate found',
      reason: 'Active task list has no pending entries.',
      source: ''
    }
  }

  const scored = pending.map((line) => {
    const l = String(line || '')
    const lower = l.toLowerCase()
    let score = 0
    if (lower.includes('daily')) score += 4
    if (lower.includes('scheduled')) score += 3
    if (lower.includes('assignment')) score += 3
    if (lower.includes('evaluate')) score += 2
    if (lower.includes('mission control')) score += 2
    if (lower.includes('manual')) score += 2
    if (lower.includes('in_progress')) score += 2

    return { line: l, score }
  }).sort((a, b) => b.score - a.score)

  const top = scored[0]
  return {
    title: top?.line || pending[0],
    reason: 'Highest leverage based on recurrence/schedule signal in pending tasks.',
    source: 'memory/active-tasks.md'
  }
}

export function getDashboardData() {
  const db = ensureDb()
  let jobs = selectJobs(db)
  const meta = db.prepare('SELECT value FROM meta WHERE key = ?').get('lastRefreshedAt')
  let lastRefreshedAt = meta ? Number(meta.value) : null

  const recent = [...jobs]
    .filter((j) => j.lastRunAtMs)
    .sort((a, b) => b.lastRunAtMs - a.lastRunAtMs)
    .slice(0, 20)

  const tasks = readTasks()
  const offloadInsights = {
    timeSavedThisWeek: estimateWeeklyMinutesSaved(jobs),
    topOffloadNext: recommendOffloadTask(tasks)
  }
  db.close()

  return { jobs, recent, tasks, offloadInsights, lastRefreshedAt }
}

const REQUIRED_COMM_REASONS = new Set(['done_notice', 'approval_request', 'blocking_question'])

function hasRequiredCommunicationForCard(db, cardId, sinceMs = 0, requiredReason = '') {
  if (!cardId) return false
  if (requiredReason) {
    const row = db.prepare(`
      SELECT id
      FROM communications
      WHERE related_card_id = ?
        AND delivery_status IN ('sent', 'delivered')
        AND reason = ?
        AND created_at_ms >= ?
      ORDER BY created_at_ms DESC
      LIMIT 1
    `).get(cardId, requiredReason, Number(sinceMs || 0))
    return !!row
  }

  const row = db.prepare(`
    SELECT id
    FROM communications
    WHERE related_card_id = ?
      AND delivery_status IN ('sent', 'delivered')
      AND reason IN ('done_notice', 'approval_request', 'blocking_question')
      AND created_at_ms >= ?
    ORDER BY created_at_ms DESC
    LIMIT 1
  `).get(cardId, Number(sinceMs || 0))
  return !!row
}

function seedKanbanIfEmpty(db) {
  const row = db.prepare('SELECT COUNT(*) as n FROM kanban_cards').get()
  if ((row?.n || 0) > 0) return

  const now = Date.now()
  const ins = db.prepare(`
    INSERT INTO kanban_cards (id, title, details, status, owner, type, priority, artifact_link, sort_order, created_at_ms, updated_at_ms)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  ins.run(
    `card-${now}-1`,
    'Review overnight 12AM Nightly Builder output',
    'Review files changed, summary, and decide next assignment in NIGHTLY-BUILDER-QUEUE.md.',
    'review',
    'Joe',
    'Build',
    'P1',
    'memory/2026-02-26.md',
    100,
    now,
    now
  )
  ins.run(
    `card-${now}-2`,
    'Review automation business strategy write-up + briefing',
    'Read strategy docs and capture go/no-go decisions and immediate next steps.',
    'review',
    'Joe',
    'Strategy',
    'P1',
    'AUTOMATION-OUTREACH-PLAYBOOK.md',
    200,
    now,
    now
  )
}

export function logCommunication(input = {}) {
  const reason = String(input.reason || '').trim()
  if (!REQUIRED_COMM_REASONS.has(reason)) {
    throw new Error('reason must be one of: done_notice, approval_request, blocking_question')
  }

  const channel = String(input.channel || '').trim()
  if (!channel) throw new Error('channel is required')

  const deliveryStatus = String(input.deliveryStatus || input.delivery_status || '').trim() || 'sent'
  const db = ensureDb()
  const now = Date.now()
  const id = `comm-${now}-${Math.random().toString(36).slice(2, 8)}`
  db.prepare(`
    INSERT INTO communications(
      id, created_at_ms, timestamp_est, channel, target, reason, message_id,
      related_card_id, related_job_id, delivery_status, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    now,
    input.timestampEst || input.timestamp_est || null,
    channel,
    input.target || null,
    reason,
    input.messageId || input.message_id || null,
    input.relatedCardId || input.related_card_id || null,
    input.relatedJobId || input.related_job_id || null,
    deliveryStatus,
    input.notes || null
  )
  db.close()
  return { id }
}

export function getKanbanBoard(includeArchived = true) {
  const db = ensureDb()
  seedKanbanIfEmpty(db)
  const rows = db.prepare(`
    SELECT id, title, details, status, owner, type, priority, artifact_link as artifactLink,
           feedback, next_steps as nextSteps, is_archived as isArchived, archived_at_ms as archivedAtMs,
           sort_order as sortOrder, created_at_ms as createdAtMs, updated_at_ms as updatedAtMs,
           (
             SELECT reason FROM communications c
             WHERE c.related_card_id = kanban_cards.id
             ORDER BY c.created_at_ms DESC LIMIT 1
           ) as lastCommReason,
           (
             SELECT delivery_status FROM communications c
             WHERE c.related_card_id = kanban_cards.id
             ORDER BY c.created_at_ms DESC LIMIT 1
           ) as lastCommStatus,
           (
             SELECT created_at_ms FROM communications c
             WHERE c.related_card_id = kanban_cards.id
             ORDER BY c.created_at_ms DESC LIMIT 1
           ) as lastCommAtMs
    FROM kanban_cards
    ${includeArchived ? '' : 'WHERE COALESCE(is_archived, 0) = 0'}
    ORDER BY COALESCE(is_archived, 0) ASC, sort_order ASC, updated_at_ms DESC
  `).all()
  db.close()
  return { cards: rows }
}

export function createKanbanCard(input = {}) {
  const title = (input.title || '').trim()
  if (!title) throw new Error('title is required')

  const db = ensureDb()
  const now = Date.now()
  const status = (input.status || 'new').trim()
  const id = `card-${now}-${Math.random().toString(36).slice(2, 8)}`
  const maxSort = db.prepare('SELECT COALESCE(MAX(sort_order), 0) as m FROM kanban_cards WHERE status = ?').get(status)?.m || 0

  db.prepare(`
    INSERT INTO kanban_cards (id, title, details, status, owner, type, priority, artifact_link, feedback, next_steps, is_archived, archived_at_ms, sort_order, created_at_ms, updated_at_ms)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    title,
    input.details || '',
    status,
    input.owner || 'Joe',
    input.type || 'Ops',
    input.priority || 'P2',
    input.artifactLink || '',
    input.feedback || '',
    input.nextSteps || '',
    0,
    null,
    maxSort + 10,
    now,
    now
  )

  db.close()
  return { id }
}

export function deleteKanbanCard(input = {}) {
  const id = (input.id || '').trim()
  if (!id) throw new Error('id is required')

  const db = ensureDb()
  const row = db.prepare('SELECT id FROM kanban_cards WHERE id = ?').get(id)
  if (!row) {
    db.close()
    throw new Error('card not found')
  }

  db.prepare('DELETE FROM kanban_cards WHERE id = ?').run(id)
  db.close()
  return { ok: true }
}

export function updateKanbanCard(input = {}) {
  const id = (input.id || '').trim()
  if (!id) throw new Error('id is required')

  const db = ensureDb()
  const row = db.prepare('SELECT id, status, updated_at_ms as updatedAtMs, COALESCE(is_archived, 0) as isArchived FROM kanban_cards WHERE id = ?').get(id)
  if (!row) {
    db.close()
    throw new Error('card not found')
  }

  const nextStatus = input.status ? String(input.status).trim() : ''
  if (nextStatus) {
    const terminalLike = new Set(['review', 'done', 'completed'])
    if (terminalLike.has(nextStatus)) {
      const ok = hasRequiredCommunicationForCard(db, id, row.updatedAtMs || 0, '')
      if (!ok) {
        db.close()
        throw new Error('communication gate: cannot move to review/done/completed without sent communication proof (done_notice|approval_request|blocking_question)')
      }
    }
    if (nextStatus === 'blocked') {
      const ok = hasRequiredCommunicationForCard(db, id, row.updatedAtMs || 0, 'blocking_question')
      if (!ok) {
        db.close()
        throw new Error('communication gate: cannot move to blocked without sent blocking_question communication proof')
      }
    }
  }

  const now = Date.now()
  const shouldArchive = typeof input.isArchived === 'boolean' ? input.isArchived : null
  const archivedAtMs = shouldArchive === null
    ? null
    : shouldArchive
      ? (input.archivedAtMs ?? now)
      : null

  db.prepare(`
    UPDATE kanban_cards
    SET title = COALESCE(?, title),
        details = COALESCE(?, details),
        status = COALESCE(?, status),
        owner = COALESCE(?, owner),
        type = COALESCE(?, type),
        priority = COALESCE(?, priority),
        artifact_link = COALESCE(?, artifact_link),
        feedback = COALESCE(?, feedback),
        next_steps = COALESCE(?, next_steps),
        sort_order = COALESCE(?, sort_order),
        is_archived = COALESCE(?, is_archived),
        archived_at_ms = CASE WHEN ? IS NULL THEN archived_at_ms ELSE ? END,
        updated_at_ms = ?
    WHERE id = ?
  `).run(
    input.title ?? null,
    input.details ?? null,
    input.status ?? null,
    input.owner ?? null,
    input.type ?? null,
    input.priority ?? null,
    input.artifactLink ?? null,
    input.feedback ?? null,
    input.nextSteps ?? null,
    input.sortOrder ?? null,
    shouldArchive === null ? null : (shouldArchive ? 1 : 0),
    shouldArchive === null ? null : 1,
    shouldArchive === null ? null : archivedAtMs,
    now,
    id
  )

  db.close()

  const nextStatusLower = String(nextStatus || '').toLowerCase()
  if (nextStatusLower === 'done' || nextStatusLower === 'completed') {
    markTodoCompleteByKanbanCardId(id)
  }

  return { ok: true }
}

export function getJobDetails(jobId) {
  if (!jobId) throw new Error('jobId is required')

  const jobs = listCronJobs()
  const job = jobs.find((j) => j.id === jobId)
  if (!job) throw new Error('Job not found')

  const raw = execSync(`openclaw cron runs --id ${jobId} --limit 5`, {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8'
  })
  const parsed = JSON.parse(raw)
  const runs = parsed.entries || []
  const lastFailure = runs.find((r) => r.status && r.status !== 'ok')

  return {
    job: {
      id: job.id,
      name: job.name,
      description: job.description || '',
      schedule: job.schedule || null,
      state: job.state || {},
      enabled: !!job.enabled,
    },
    runs,
    lastErrorText: lastFailure?.summary || ''
  }
}

export function runJobNow(jobId) {
  if (!jobId) throw new Error('jobId is required')

  const raw = execSync(`openclaw cron run ${jobId} --timeout 120000`, {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8'
  })

  return { output: raw.slice(0, 4000) }
}

export function getArtifactBrief(relPath) {
  if (!relPath) throw new Error('path is required')
  const safeRel = relPath.replace(/^\/+/, '')
  const abs = path.join(ROOT, safeRel)
  const normalized = path.normalize(abs)
  if (!normalized.startsWith(path.normalize(ROOT))) throw new Error('invalid path')
  if (!fs.existsSync(normalized)) throw new Error('artifact not found')

  const content = fs.readFileSync(normalized, 'utf8')
  const lines = content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  const heading = lines.find((l) => l.startsWith('#'))?.replace(/^#+\s*/, '') || safeRel
  const bullets = lines.filter((l) => l.startsWith('- ')).slice(0, 3).map((l) => l.replace(/^-\s+/, ''))
  const bodyLine = lines.find((l) => !l.startsWith('#') && !l.startsWith('- ')) || ''

  const parts = [heading]
  if (bodyLine) parts.push(bodyLine.slice(0, 160))
  if (bullets.length) parts.push(`Key points: ${bullets.join(' | ')}`)
  return { brief: parts.join(' — ').slice(0, 500) }
}
