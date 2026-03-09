import fs from 'node:fs'
import path from 'node:path'
import { isSnapshotMode, readSnapshot } from './snapshot-store.js'

const ROOT = process.cwd()
const DATA_PATH = path.join(ROOT, 'memory', 'todo-list.json')

const DEFAULT_DATA = {
  rows: [],
  updatedAtMs: null
}

function normalizeStatus(status) {
  const s = String(status || '').trim().toLowerCase()
  if (s === 'complete' || s === 'completed') return 'Complete'
  if (s === 'in progress' || s === 'in-progress') return 'In Progress'
  if (s === 'not started' || s === 'not-started') return 'Not Started'
  return 'Not Started'
}

export function getTodoListData() {
  if (isSnapshotMode()) {
    return readSnapshot('todo-list', { ...DEFAULT_DATA })
  }
  try {
    if (!fs.existsSync(DATA_PATH)) return { ...DEFAULT_DATA }
    const parsed = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'))
    return {
      rows: Array.isArray(parsed?.rows) ? parsed.rows : [],
      updatedAtMs: Number(parsed?.updatedAtMs || 0) || null
    }
  } catch {
    return { ...DEFAULT_DATA }
  }
}

export function saveTodoListData(payload = {}) {
  const rows = Array.isArray(payload?.rows) ? payload.rows : []
  const cleaned = rows.map((r, i) => ({
    id: String(r?.id || `todo-${Date.now()}-${i}`),
    task: String(r?.task || '').trim(),
    horizon: ['Long-term', 'Monthly', 'Weekly', 'Daily'].includes(r?.horizon) ? r.horizon : 'Weekly',
    category: ['Day Job', 'Personal'].includes(r?.category) ? r.category : 'Personal',
    status: normalizeStatus(r?.status),
    comments: String(r?.comments || '').trim(),
    dateAdded: Number(r?.dateAdded || 0) || Date.now(),
    dueDate: String(r?.dueDate || '').trim(),
    kanbanCardId: String(r?.kanbanCardId || '').trim(),
    kanbanSentAtMs: Number(r?.kanbanSentAtMs || 0) || null,
    completedAtMs: Number(r?.completedAtMs || 0) || null
  }))

  const out = {
    rows: cleaned,
    updatedAtMs: Date.now()
  }

  fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true })
  fs.writeFileSync(DATA_PATH, JSON.stringify(out, null, 2), 'utf8')
  return out
}

export function addTodoItemValidated(item = {}) {
  const before = getTodoListData()
  const now = Date.now()
  const newRow = {
    id: String(item?.id || `todo-${now}-${Math.random().toString(36).slice(2, 7)}`),
    task: String(item?.task || '').trim(),
    horizon: ['Long-term', 'Monthly', 'Weekly', 'Daily'].includes(item?.horizon) ? item.horizon : 'Weekly',
    category: ['Day Job', 'Personal'].includes(item?.category) ? item.category : 'Personal',
    status: normalizeStatus(item?.status),
    comments: String(item?.comments || '').trim(),
    dateAdded: Number(item?.dateAdded || 0) || now,
    dueDate: String(item?.dueDate || '').trim(),
    kanbanCardId: String(item?.kanbanCardId || '').trim(),
    kanbanSentAtMs: Number(item?.kanbanSentAtMs || 0) || null,
    completedAtMs: Number(item?.completedAtMs || 0) || null
  }

  if (!newRow.task) {
    throw new Error('Task is required')
  }

  const saved = saveTodoListData({ rows: [...before.rows, newRow] })
  const after = getTodoListData()
  const found = after.rows.find((r) => String(r?.id || '') === newRow.id)

  const checks = {
    idFound: Boolean(found),
    taskMatch: String(found?.task || '') === newRow.task,
    updatedAtAdvanced: Number(after.updatedAtMs || 0) >= Number(before.updatedAtMs || 0),
    rowCountIncreased: after.rows.length >= before.rows.length + 1
  }

  const ok = Object.values(checks).every(Boolean)
  if (!ok) {
    throw new Error(`Todo write verification failed: ${JSON.stringify(checks)}`)
  }

  return {
    ok: true,
    row: found,
    checks,
    updatedAtMs: saved.updatedAtMs || after.updatedAtMs || now,
    rowCount: after.rows.length
  }
}

export function markTodoCompleteByKanbanCardId(kanbanCardId) {
  const cardId = String(kanbanCardId || '').trim()
  if (!cardId) return { updated: 0, updatedAtMs: null }

  const current = getTodoListData()
  const now = Date.now()
  let updated = 0

  const nextRows = current.rows.map((row) => {
    if (String(row?.kanbanCardId || '').trim() !== cardId) return row
    const nextStatus = 'Complete'
    const nextCompletedAtMs = Number(row?.completedAtMs || 0) || now
    const changed = row?.status !== nextStatus || !Number(row?.completedAtMs || 0)
    if (changed) updated += 1
    return {
      ...row,
      status: nextStatus,
      completedAtMs: nextCompletedAtMs
    }
  })

  if (!updated) return { updated: 0, updatedAtMs: current.updatedAtMs || null }

  const saved = saveTodoListData({ rows: nextRows })
  return { updated, updatedAtMs: saved.updatedAtMs || null }
}
