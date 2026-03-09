import fs from 'node:fs'
import path from 'node:path'
import { isSnapshotMode, readSnapshot } from './snapshot-store.js'

const ROOT = process.cwd()
const STORE_PATH = path.join(ROOT, 'memory', 'nutrition-macros.json')
const HABITS_WEEKLY_PATH = path.join(ROOT, 'memory', 'training-habits-weekly.json')

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

function asNum(v, fallback = 0) {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

function readStore() {
  try {
    if (!fs.existsSync(STORE_PATH)) return { days: {} }
    const parsed = JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'))
    if (!parsed || typeof parsed !== 'object') return { days: {} }
    if (!parsed.days || typeof parsed.days !== 'object') parsed.days = {}
    return parsed
  } catch {
    return { days: {} }
  }
}

function writeStore(store) {
  fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true })
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), 'utf8')
}

function readWeeklyHabits() {
  try {
    if (!fs.existsSync(HABITS_WEEKLY_PATH)) return null
    return JSON.parse(fs.readFileSync(HABITS_WEEKLY_PATH, 'utf8'))
  } catch {
    return null
  }
}

function writeWeeklyHabits(data) {
  fs.mkdirSync(path.dirname(HABITS_WEEKLY_PATH), { recursive: true })
  fs.writeFileSync(HABITS_WEEKLY_PATH, JSON.stringify(data, null, 2), 'utf8')
}

function ensureDay(store, date) {
  const key = String(date || todayKey()).slice(0, 10)
  if (!store.days[key]) {
    store.days[key] = {
      date: key,
      trainingDay: true,
      entries: [],
      habitEntries: [],
      supplements: {
        creatine: false,
        electrolytes: false,
        magnesium: false,
        hydrationLiters: '',
        proteinShake: false
      },
      checkins: {
        morning: false,
        midday: false,
        afternoon: false,
        evening: false
      },
      feedback: [],
      updatedAtMs: Date.now()
    }
  }
  if (!Array.isArray(store.days[key].habitEntries)) store.days[key].habitEntries = []
  return store.days[key]
}

function calcTotals(entries = []) {
  return entries.reduce((acc, e) => {
    acc.protein += asNum(e.protein)
    acc.carbs += asNum(e.carbs)
    acc.fats += asNum(e.fats)
    acc.calories += asNum(e.calories)
    return acc
  }, { protein: 0, carbs: 0, fats: 0, calories: 0 })
}

function calcDailyHabitTotals(habitEntries = []) {
  return habitEntries.reduce((acc, e) => {
    acc.pushups += asNum(e.pushups)
    acc.rows += asNum(e.rows)
    acc.kbSwings += asNum(e.kbSwings)
    acc.bjjSessions += asNum(e.bjjSessions)
    return acc
  }, { pushups: 0, rows: 0, kbSwings: 0, bjjSessions: 0 })
}

function buildWeeklyProgress(dayHabitTotals) {
  const weekly = readWeeklyHabits()
  const targets = weekly?.targets || { bjjSessions: 3, pushups: 100, rows: 80, kbSwings: 100 }
  const progress = {
    bjjSessions: asNum(weekly?.progress?.bjjSessions, 0),
    pushups: asNum(weekly?.progress?.pushups, 0),
    rows: asNum(weekly?.progress?.rows, 0),
    kbSwings: asNum(weekly?.progress?.kbSwings, 0)
  }

  // Ensure at least today's totals are reflected if weekly file lags.
  progress.bjjSessions = Math.max(progress.bjjSessions, dayHabitTotals.bjjSessions)
  progress.pushups = Math.max(progress.pushups, dayHabitTotals.pushups)
  progress.rows = Math.max(progress.rows, dayHabitTotals.rows)
  progress.kbSwings = Math.max(progress.kbSwings, dayHabitTotals.kbSwings)

  return {
    weekStart: weekly?.weekStart || null,
    weekEnd: weekly?.weekEnd || null,
    targets,
    progress,
    pct: {
      bjjSessions: targets.bjjSessions > 0 ? Math.min(100, Math.round((progress.bjjSessions / targets.bjjSessions) * 100)) : 0,
      pushups: targets.pushups > 0 ? Math.min(100, Math.round((progress.pushups / targets.pushups) * 100)) : 0,
      rows: targets.rows > 0 ? Math.min(100, Math.round((progress.rows / targets.rows) * 100)) : 0,
      kbSwings: targets.kbSwings > 0 ? Math.min(100, Math.round((progress.kbSwings / targets.kbSwings) * 100)) : 0
    }
  }
}

export function getNutritionDay(date) {
  if (isSnapshotMode()) {
    const snap = readSnapshot('nutrition-macros', null)
    if (snap) return snap
  }
  const store = readStore()
  const day = ensureDay(store, date)
  const totals = calcTotals(day.entries)
  const dailyHabitTotals = calcDailyHabitTotals(day.habitEntries)
  const weeklyHabits = buildWeeklyProgress(dailyHabitTotals)
  const proteinMin = 150
  const proteinMax = 170
  return {
    ...day,
    totals,
    dailyHabitTotals,
    weeklyHabits,
    targets: {
      proteinMin,
      proteinMax,
      proteinRemainingToMin: Math.max(0, proteinMin - totals.protein),
      proteinOverMax: Math.max(0, totals.protein - proteinMax)
    },
    updatedAtMs: day.updatedAtMs ?? null
  }
}

export function addNutritionEntry({ date, entry } = {}) {
  const store = readStore()
  const day = ensureDay(store, date)
  const next = {
    id: `meal-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ts: Date.now(),
    label: String(entry?.label || 'Meal').slice(0, 80),
    items: String(entry?.items || '').slice(0, 500),
    protein: asNum(entry?.protein),
    carbs: asNum(entry?.carbs),
    fats: asNum(entry?.fats),
    calories: asNum(entry?.calories),
    note: String(entry?.note || '').slice(0, 500)
  }
  day.entries.unshift(next)
  day.updatedAtMs = Date.now()
  writeStore(store)
  return next
}

export function addHabitEntry({ date, entry } = {}) {
  const store = readStore()
  const day = ensureDay(store, date)
  const next = {
    id: `habit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ts: Date.now(),
    label: String(entry?.label || 'Habit').slice(0, 80),
    pushups: asNum(entry?.pushups),
    rows: asNum(entry?.rows),
    kbSwings: asNum(entry?.kbSwings),
    bjjSessions: asNum(entry?.bjjSessions),
    note: String(entry?.note || '').slice(0, 500)
  }
  day.habitEntries.unshift(next)
  day.updatedAtMs = Date.now()
  writeStore(store)

  const weekly = readWeeklyHabits()
  if (weekly && weekly.progress) {
    weekly.progress.pushups = asNum(weekly.progress.pushups) + next.pushups
    weekly.progress.rows = asNum(weekly.progress.rows) + next.rows
    weekly.progress.kbSwings = asNum(weekly.progress.kbSwings) + next.kbSwings
    weekly.progress.bjjSessions = asNum(weekly.progress.bjjSessions) + next.bjjSessions
    weekly.updatedAtMs = Date.now()
    writeWeeklyHabits(weekly)
  }

  return next
}

export function deleteNutritionEntry({ date, id } = {}) {
  const store = readStore()
  const day = ensureDay(store, date)
  const before = day.entries.length
  day.entries = day.entries.filter((e) => e.id !== id)
  day.updatedAtMs = Date.now()
  writeStore(store)
  return { removed: Math.max(0, before - day.entries.length) }
}

export function updateNutritionMeta({ date, trainingDay, supplements, checkins } = {}) {
  const store = readStore()
  const day = ensureDay(store, date)
  if (typeof trainingDay === 'boolean') day.trainingDay = trainingDay
  if (supplements && typeof supplements === 'object') {
    day.supplements = {
      ...day.supplements,
      ...supplements,
      hydrationLiters: supplements.hydrationLiters ?? day.supplements.hydrationLiters ?? ''
    }
  }
  if (checkins && typeof checkins === 'object') {
    day.checkins = { ...day.checkins, ...checkins }
  }
  day.updatedAtMs = Date.now()
  writeStore(store)
  return day
}

export function addNutritionFeedback({ date, text } = {}) {
  const clean = String(text || '').trim()
  if (!clean) throw new Error('Feedback text is required')
  const store = readStore()
  const day = ensureDay(store, date)
  const row = {
    id: `fb-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    text: clean.slice(0, 1000),
    createdAtMs: Date.now()
  }
  day.feedback.unshift(row)
  day.updatedAtMs = Date.now()
  writeStore(store)
  return row
}
