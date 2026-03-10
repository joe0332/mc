import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const STORE_PATH = path.join(ROOT, 'memory', 'nutrition-macros.json')
const STORE_SNAPSHOT_PATH = path.join(ROOT, 'public', 'data', 'nutrition-macros.json')
const HABITS_WEEKLY_PATH = path.join(ROOT, 'memory', 'training-habits-weekly.json')

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

function asNum(v, fallback = 0) {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

function parseDateKey(key) {
  const m = String(key || '').match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return null
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0))
}

function dateKeyFromDate(d) {
  return d.toISOString().slice(0, 10)
}

function addDays(date, days) {
  return new Date(date.getTime() + (days * 86400000))
}

function getWeekStartKey(dateKey) {
  const d = parseDateKey(dateKey)
  if (!d) return null
  const day = d.getUTCDay() // 0=Sun,1=Mon...
  const diffToMonday = (day + 6) % 7
  return dateKeyFromDate(addDays(d, -diffToMonday))
}

function getWeekEndKey(weekStartKey) {
  const d = parseDateKey(weekStartKey)
  if (!d) return null
  return dateKeyFromDate(addDays(d, 6))
}

function readStore() {
  try {
    const sourcePath = fs.existsSync(STORE_PATH)
      ? STORE_PATH
      : (fs.existsSync(STORE_SNAPSHOT_PATH) ? STORE_SNAPSHOT_PATH : null)

    if (!sourcePath) return { days: {} }

    const parsed = JSON.parse(fs.readFileSync(sourcePath, 'utf8'))
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
      biomarkers: [],
      bowelLogs: [],
      supplements: {
        creatine: false,
        fishOil: false,
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
  if (!Array.isArray(store.days[key].biomarkers)) store.days[key].biomarkers = []
  if (!Array.isArray(store.days[key].bowelLogs)) store.days[key].bowelLogs = []
  if (!store.days[key].supplements || typeof store.days[key].supplements !== 'object') store.days[key].supplements = {}
  if (typeof store.days[key].supplements.fishOil !== 'boolean') store.days[key].supplements.fishOil = false
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
    acc.pushReps += asNum(e.pushReps)
    acc.pushups += asNum(e.pushups)
    acc.rows += asNum(e.rows)
    acc.kbSwings += asNum(e.kbSwings)
    acc.bjjSessions += asNum(e.bjjSessions)
    acc.pigeonStretch += asNum(e.pigeonStretch)
    acc.quadStretch += asNum(e.quadStretch)
    acc.ironNeck += asNum(e.ironNeck)
    return acc
  }, { pushReps: 0, pushups: 0, rows: 0, kbSwings: 0, bjjSessions: 0, pigeonStretch: 0, quadStretch: 0, ironNeck: 0 })
}

function normalizeMealCategory(label = '') {
  const x = String(label || '').toLowerCase()
  if (x.includes('breakfast')) return 'breakfast'
  if (x.includes('lunch')) return 'lunch'
  if (x.includes('dinner')) return 'dinner'
  if (x.includes('snack')) return 'snacks'
  return 'snacks'
}

function aggregateMeals(entries = []) {
  const blank = () => ({ protein: 0, carbs: 0, fats: 0, calories: 0 })
  const byMeal = {
    breakfast: blank(),
    lunch: blank(),
    dinner: blank(),
    snacks: blank()
  }
  for (const e of entries) {
    const m = normalizeMealCategory(e.label)
    byMeal[m].protein += asNum(e.protein)
    byMeal[m].carbs += asNum(e.carbs)
    byMeal[m].fats += asNum(e.fats)
    byMeal[m].calories += asNum(e.calories)
  }
  return byMeal
}

function calcBiomarkerSummary(day) {
  const marks = day?.biomarkers || []
  const ketones = marks.filter((m) => m.kind === 'ketones')
  const glucose = marks.filter((m) => m.kind === 'glucose')
  const latestKetones = ketones[0]?.value ?? null
  const latestGlucose = glucose[0]?.value ?? null
  const bowelLogs = day?.bowelLogs || []
  const stoolCounts = bowelLogs.reduce((acc, x) => {
    const t = String(x.stoolType || 'unknown')
    acc[t] = (acc[t] || 0) + 1
    return acc
  }, {})

  const mealSlots = ['breakfast', 'lunch', 'dinner', 'snack', 'other']

  const bowl = () => ({ healthy: 0, loose: 0, very_loose: 0, total: 0 })
  const bowelByMeal = {}
  const ketonesByMeal = {}
  const glucoseByMeal = {}
  for (const m of mealSlots) {
    bowelByMeal[m] = bowl()
    ketonesByMeal[m] = { count: 0, latest: null }
    glucoseByMeal[m] = { count: 0, latest: null }
  }

  for (const x of bowelLogs) {
    const meal = String(x.mealSlot || 'other').toLowerCase()
    const slot = bowelByMeal[meal] ? meal : 'other'
    const type = String(x.stoolType || 'healthy').toLowerCase()
    if (!['healthy', 'loose', 'very_loose'].includes(type)) continue
    bowelByMeal[slot][type] += 1
    bowelByMeal[slot].total += 1
  }

  for (const x of ketones) {
    const meal = String(x.mealSlot || 'other').toLowerCase()
    const slot = ketonesByMeal[meal] ? meal : 'other'
    ketonesByMeal[slot].count += 1
    if (ketonesByMeal[slot].latest == null) ketonesByMeal[slot].latest = x.value
  }

  for (const x of glucose) {
    const meal = String(x.mealSlot || 'other').toLowerCase()
    const slot = glucoseByMeal[meal] ? meal : 'other'
    glucoseByMeal[slot].count += 1
    if (glucoseByMeal[slot].latest == null) glucoseByMeal[slot].latest = x.value
  }

  return {
    ketonesCount: ketones.length,
    glucoseCount: glucose.length,
    latestKetones,
    latestGlucose,
    ketonesByMeal,
    glucoseByMeal,
    bowelCount: bowelLogs.length,
    stoolCounts,
    bowelByMeal
  }
}

function getWeeklyTargets() {
  const weekly = readWeeklyHabits()
  return {
    bjjSessions: asNum(weekly?.targets?.bjjSessions, 3),
    pushups: asNum(weekly?.targets?.pushups, 100),
    rows: asNum(weekly?.targets?.rows, 80),
    kbSwings: asNum(weekly?.targets?.kbSwings, 100),
    pigeonStretch: asNum(weekly?.targets?.pigeonStretch, 3),
    quadStretch: asNum(weekly?.targets?.quadStretch, 3),
    ironNeck: asNum(weekly?.targets?.ironNeck, 2)
  }
}

function calcWeekProgressFromStore(store, weekStartKey) {
  const start = parseDateKey(weekStartKey)
  if (!start) return { bjjSessions: 0, pushups: 0, rows: 0, kbSwings: 0, pigeonStretch: 0, quadStretch: 0, ironNeck: 0 }
  const endKey = getWeekEndKey(weekStartKey)
  const keys = Object.keys(store.days || {})
  const inWeek = keys.filter((k) => k >= weekStartKey && k <= endKey)
  return inWeek.reduce((acc, key) => {
    const day = store.days[key]
    const t = calcDailyHabitTotals(day?.habitEntries || [])
    acc.bjjSessions += t.bjjSessions
    acc.pushups += t.pushups
    acc.rows += t.rows
    acc.kbSwings += t.kbSwings
    acc.pigeonStretch += t.pigeonStretch
    acc.quadStretch += t.quadStretch
    acc.ironNeck += t.ironNeck
    return acc
  }, { bjjSessions: 0, pushups: 0, rows: 0, kbSwings: 0, pigeonStretch: 0, quadStretch: 0, ironNeck: 0 })
}

function weeklyHit(progress, targets) {
  return {
    bjjSessions: progress.bjjSessions >= targets.bjjSessions,
    pushups: progress.pushups >= targets.pushups,
    rows: progress.rows >= targets.rows,
    kbSwings: progress.kbSwings >= targets.kbSwings,
    pigeonStretch: progress.pigeonStretch >= targets.pigeonStretch,
    quadStretch: progress.quadStretch >= targets.quadStretch,
    ironNeck: progress.ironNeck >= targets.ironNeck,
    all:
      progress.bjjSessions >= targets.bjjSessions &&
      progress.pushups >= targets.pushups &&
      progress.rows >= targets.rows &&
      progress.kbSwings >= targets.kbSwings &&
      progress.pigeonStretch >= targets.pigeonStretch &&
      progress.quadStretch >= targets.quadStretch &&
      progress.ironNeck >= targets.ironNeck
  }
}

function calcWeeklyAllGoalsStreak(store, currentWeekStart, targets) {
  let streak = 0
  let cursor = parseDateKey(currentWeekStart)
  if (!cursor) return 0

  for (let i = 0; i < 104; i += 1) {
    const wkStart = dateKeyFromDate(cursor)
    const wkEnd = getWeekEndKey(wkStart)
    const hasAny = Object.keys(store.days || {}).some((k) => k >= wkStart && k <= wkEnd)
    if (!hasAny) break

    const progress = calcWeekProgressFromStore(store, wkStart)
    const hit = weeklyHit(progress, targets)
    if (!hit.all) break

    streak += 1
    cursor = addDays(cursor, -7)
  }

  return streak
}

function dayGoalStatus(day, proteinMin) {
  const totals = calcTotals(day?.entries || [])
  const supplements = day?.supplements || {}
  const protein = totals.protein >= proteinMin
  const creatine = supplements.creatine === true
  const fishOil = supplements.fishOil === true
  return {
    protein,
    creatine,
    fishOil,
    all: protein && creatine && fishOil
  }
}

function calcDailyGoalStreaks(store, currentDateKey, proteinMin) {
  const currentDate = parseDateKey(currentDateKey)
  if (!currentDate) return { protein: 0, creatine: 0, fishOil: 0, all: 0 }

  const streaks = { protein: 0, creatine: 0, fishOil: 0, all: 0 }
  const keys = ['protein', 'creatine', 'fishOil', 'all']

  for (const key of keys) {
    let cursor = new Date(currentDate.getTime())
    for (let i = 0; i < 730; i += 1) {
      const k = dateKeyFromDate(cursor)
      const day = store.days?.[k]
      if (!day) break
      const hit = dayGoalStatus(day, proteinMin)
      if (!hit[key]) break
      streaks[key] += 1
      cursor = addDays(cursor, -1)
    }
  }

  return streaks
}

function calcLongestDailyStreaks(store, proteinMin) {
  const keys = ['protein', 'creatine', 'fishOil', 'all']
  const longest = { protein: 0, creatine: 0, fishOil: 0, all: 0 }
  const run = { protein: 0, creatine: 0, fishOil: 0, all: 0 }
  const dates = Object.keys(store.days || {}).sort()

  for (const dateKey of dates) {
    const day = store.days?.[dateKey]
    const hit = dayGoalStatus(day, proteinMin)
    for (const key of keys) {
      run[key] = hit[key] ? run[key] + 1 : 0
      if (run[key] > longest[key]) longest[key] = run[key]
    }
  }

  return longest
}

function calcWeeklyGoalStreaks(store, currentWeekStartKey, targets) {
  const keys = ['bjjSessions', 'pushups', 'rows', 'kbSwings', 'pigeonStretch', 'quadStretch', 'ironNeck', 'all']
  const streaks = { bjjSessions: 0, pushups: 0, rows: 0, kbSwings: 0, pigeonStretch: 0, quadStretch: 0, ironNeck: 0, all: 0 }
  const run = { bjjSessions: 0, pushups: 0, rows: 0, kbSwings: 0, pigeonStretch: 0, quadStretch: 0, ironNeck: 0, all: 0 }

  const weekStarts = new Set()
  for (const dateKey of Object.keys(store.days || {})) {
    const ws = getWeekStartKey(dateKey)
    if (ws) weekStarts.add(ws)
  }
  const sortedWeekStarts = Array.from(weekStarts).sort()

  for (const ws of sortedWeekStarts) {
    const p = calcWeekProgressFromStore(store, ws)
    const h = weeklyHit(p, targets)
    for (const key of keys) {
      run[key] = h[key] ? run[key] + 1 : 0
      if (run[key] > streaks[key]) streaks[key] = run[key]
    }
  }

  const currentProgress = calcWeekProgressFromStore(store, currentWeekStartKey)
  const currentHit = weeklyHit(currentProgress, targets)
  const current = {}
  for (const key of keys) {
    if (!currentHit[key]) {
      current[key] = 0
      continue
    }
    let count = 0
    let cursor = parseDateKey(currentWeekStartKey)
    for (let i = 0; i < 104; i += 1) {
      const ws = dateKeyFromDate(cursor)
      const p = calcWeekProgressFromStore(store, ws)
      const h = weeklyHit(p, targets)
      if (!h[key]) break
      count += 1
      cursor = addDays(cursor, -7)
    }
    current[key] = count
  }

  return { current, longest: streaks }
}

function buildWeeklyProgress(store, currentDateKey) {
  const targets = getWeeklyTargets()
  const weekStart = getWeekStartKey(currentDateKey)
  const weekEnd = getWeekEndKey(weekStart)
  const progress = calcWeekProgressFromStore(store, weekStart)
  const hit = weeklyHit(progress, targets)
  const streakAll = calcWeeklyAllGoalsStreak(store, weekStart, targets)

  return {
    weekStart,
    weekEnd,
    targets,
    progress,
    pct: {
      bjjSessions: targets.bjjSessions > 0 ? Math.min(100, Math.round((progress.bjjSessions / targets.bjjSessions) * 100)) : 0,
      pushups: targets.pushups > 0 ? Math.min(100, Math.round((progress.pushups / targets.pushups) * 100)) : 0,
      rows: targets.rows > 0 ? Math.min(100, Math.round((progress.rows / targets.rows) * 100)) : 0,
      kbSwings: targets.kbSwings > 0 ? Math.min(100, Math.round((progress.kbSwings / targets.kbSwings) * 100)) : 0,
      pigeonStretch: targets.pigeonStretch > 0 ? Math.min(100, Math.round((progress.pigeonStretch / targets.pigeonStretch) * 100)) : 0,
      quadStretch: targets.quadStretch > 0 ? Math.min(100, Math.round((progress.quadStretch / targets.quadStretch) * 100)) : 0,
      ironNeck: targets.ironNeck > 0 ? Math.min(100, Math.round((progress.ironNeck / targets.ironNeck) * 100)) : 0
    },
    hit,
    streaks: {
      allGoalsWeeks: streakAll
    }
  }
}

function emptyDayView(key) {
  return {
    date: key,
    dayLabel: parseDateKey(key)?.toLocaleDateString('en-US', { weekday: 'short' }) || key,
    byMeal: {
      breakfast: { protein: 0, carbs: 0, fats: 0, calories: 0 },
      lunch: { protein: 0, carbs: 0, fats: 0, calories: 0 },
      dinner: { protein: 0, carbs: 0, fats: 0, calories: 0 },
      snacks: { protein: 0, carbs: 0, fats: 0, calories: 0 }
    },
    totals: { protein: 0, carbs: 0, fats: 0, calories: 0 },
    biomarkers: { ketonesCount: 0, glucoseCount: 0, bowelCount: 0, stoolCounts: {}, latestKetones: null, latestGlucose: null }
  }
}

function toDayView(key, day) {
  if (!day) return { ...emptyDayView(key), habitTotals: calcDailyHabitTotals([]), supplements: { creatine: false, fishOil: false }, mealEntries: [] }
  return {
    date: key,
    dayLabel: parseDateKey(key)?.toLocaleDateString('en-US', { weekday: 'short' }) || key,
    byMeal: aggregateMeals(day.entries || []),
    totals: calcTotals(day.entries || []),
    biomarkers: calcBiomarkerSummary(day),
    habitTotals: calcDailyHabitTotals(day.habitEntries || []),
    supplements: {
      creatine: !!day.supplements?.creatine,
      fishOil: !!day.supplements?.fishOil
    },
    mealEntries: (day.entries || []).map((e) => ({
      id: e.id,
      ts: e.ts,
      label: e.label || 'Meal',
      items: e.items || '',
      protein: asNum(e.protein),
      carbs: asNum(e.carbs),
      fats: asNum(e.fats),
      calories: asNum(e.calories),
      note: e.note || ''
    }))
  }
}

function getWeeklyHistory(store, currentDateKey, weeks = 6) {
  const currentWeekStart = getWeekStartKey(currentDateKey) || getWeekStartKey(todayKey())
  const out = []
  let cursor = parseDateKey(currentWeekStart)

  for (let w = 0; w < weeks; w += 1) {
    const startKey = dateKeyFromDate(cursor)
    const days = []
    for (let i = 0; i < 7; i += 1) {
      const key = dateKeyFromDate(addDays(cursor, i))
      days.push(toDayView(key, store.days?.[key]))
    }
    out.push({
      weekStart: startKey,
      weekEnd: dateKeyFromDate(addDays(cursor, 6)),
      isCurrent: w === 0,
      days
    })
    cursor = addDays(cursor, -7)
  }

  return out
}

export function getNutritionDay(date) {
  const store = readStore()
  const day = ensureDay(store, date)
  const totals = calcTotals(day.entries)
  const dailyHabitTotals = calcDailyHabitTotals(day.habitEntries)
  const proteinMin = 150
  const proteinMax = 170
  const weeklyHabits = buildWeeklyProgress(store, day.date)
  const dailyGoal = dayGoalStatus(day, proteinMin)
  const dailyStreaks = calcDailyGoalStreaks(store, day.date, proteinMin)
  const yesterdayKey = dateKeyFromDate(addDays(parseDateKey(day.date) || new Date(), -1))
  const yesterdayStreaks = calcDailyGoalStreaks(store, yesterdayKey, proteinMin)
  const longestDailyStreaks = calcLongestDailyStreaks(store, proteinMin)
  const displayDailyStreaks = {
    protein: dailyStreaks.protein > 0 ? dailyStreaks.protein : yesterdayStreaks.protein,
    creatine: dailyStreaks.creatine > 0 ? dailyStreaks.creatine : yesterdayStreaks.creatine,
    fishOil: dailyStreaks.fishOil > 0 ? dailyStreaks.fishOil : yesterdayStreaks.fishOil,
    all: dailyStreaks.all > 0 ? dailyStreaks.all : yesterdayStreaks.all
  }
  const weeklyStreaks = calcWeeklyGoalStreaks(store, weeklyHabits.weekStart, weeklyHabits.targets)
  const mealBreakdown = aggregateMeals(day.entries)
  const biomarkerSummary = calcBiomarkerSummary(day)

  return {
    ...day,
    totals,
    mealBreakdown,
    biomarkerSummary,
    weeklyHistory: getWeeklyHistory(store, day.date, 6),
    dailyCards: getWeeklyHistory(store, day.date, 1)[0]?.days || [],
    dailyHabitTotals,
    weeklyHabits: {
      ...weeklyHabits,
      currentStreakWeeks: {
        bjjSessions: weeklyStreaks.current.bjjSessions,
        pushups: weeklyStreaks.current.pushups,
        rows: weeklyStreaks.current.rows,
        kbSwings: weeklyStreaks.current.kbSwings,
        pigeonStretch: weeklyStreaks.current.pigeonStretch,
        quadStretch: weeklyStreaks.current.quadStretch,
        ironNeck: weeklyStreaks.current.ironNeck,
        all: weeklyStreaks.current.all
      },
      longestStreakWeeks: {
        bjjSessions: weeklyStreaks.longest.bjjSessions,
        pushups: weeklyStreaks.longest.pushups,
        rows: weeklyStreaks.longest.rows,
        kbSwings: weeklyStreaks.longest.kbSwings,
        pigeonStretch: weeklyStreaks.longest.pigeonStretch,
        quadStretch: weeklyStreaks.longest.quadStretch,
        ironNeck: weeklyStreaks.longest.ironNeck,
        all: weeklyStreaks.longest.all
      }
    },
    dailyGoals: {
      proteinHit: dailyGoal.protein,
      creatineHit: dailyGoal.creatine,
      fishOilHit: dailyGoal.fishOil,
      allHit: dailyGoal.all,
      streaks: {
        proteinDays: dailyStreaks.protein,
        creatineDays: dailyStreaks.creatine,
        fishOilDays: dailyStreaks.fishOil,
        allGoalsDays: dailyStreaks.all
      },
      displayStreaks: {
        proteinDays: displayDailyStreaks.protein,
        creatineDays: displayDailyStreaks.creatine,
        fishOilDays: displayDailyStreaks.fishOil,
        allGoalsDays: displayDailyStreaks.all
      },
      longestStreakDays: {
        proteinDays: longestDailyStreaks.protein,
        creatineDays: longestDailyStreaks.creatine,
        fishOilDays: longestDailyStreaks.fishOil,
        allGoalsDays: longestDailyStreaks.all
      }
    },
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
    pushReps: asNum(entry?.pushReps),
    pushups: asNum(entry?.pushups),
    rows: asNum(entry?.rows),
    kbSwings: asNum(entry?.kbSwings),
    bjjSessions: asNum(entry?.bjjSessions),
    pigeonStretch: asNum(entry?.pigeonStretch),
    quadStretch: asNum(entry?.quadStretch),
    ironNeck: asNum(entry?.ironNeck),
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

export function addBiomarkerEntry({ date, entry } = {}) {
  const store = readStore()
  const day = ensureDay(store, date)
  const kind = String(entry?.kind || '').toLowerCase()
  if (!['ketones', 'glucose'].includes(kind)) throw new Error('kind must be ketones or glucose')
  const next = {
    id: `bio-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ts: Date.now(),
    kind,
    mealSlot: String(entry?.mealSlot || 'other').slice(0, 30),
    value: asNum(entry?.value),
    note: String(entry?.note || '').slice(0, 300)
  }
  day.biomarkers.unshift(next)
  day.updatedAtMs = Date.now()
  writeStore(store)
  return next
}

export function addBowelLog({ date, entry } = {}) {
  const store = readStore()
  const day = ensureDay(store, date)
  const stoolType = String(entry?.stoolType || 'healthy').toLowerCase()
  const mealSlot = String(entry?.mealSlot || 'other').toLowerCase()
  const next = {
    id: `bowel-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ts: Date.now(),
    stoolType,
    mealSlot,
    note: String(entry?.note || '').slice(0, 300)
  }
  day.bowelLogs.unshift(next)
  day.updatedAtMs = Date.now()
  writeStore(store)
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
    if (typeof day.supplements.fishOil !== 'boolean') day.supplements.fishOil = false
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
