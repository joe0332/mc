'use client'

import { Fragment, useEffect, useRef, useState } from 'react'

function fmt(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString()
}

function toDateInputValue(d = new Date()) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function fmtMetric(value, digits = 1) {
  return Number.isFinite(Number(value)) ? Number(value).toFixed(digits) : '—'
}

function classifyA1c(a1c) {
  const n = Number(a1c)
  if (!Number.isFinite(n)) return 'No estimate yet'
  if (n <= 5.2) return 'Excellent metabolic control'
  if (n <= 5.5) return 'Healthy range'
  if (n <= 5.7) return 'Approaching prediabetic threshold'
  return 'Above target trend'
}

function classifyGki(gki) {
  const n = Number(gki)
  if (!Number.isFinite(n)) return 'Need glucose + ketones'
  if (n < 3) return 'Deep ketosis'
  if (n < 6) return 'Moderate ketosis'
  if (n < 9) return 'Light ketosis / mixed fuel'
  return 'Primarily glucose metabolism'
}

const card = { border: '1px solid #334155', borderRadius: 8, padding: 10 }
const inputStyle = { background: '#0b1020', color: '#e8ecf3', border: '1px solid #334155', borderRadius: 6, padding: '8px 10px' }
const thStyle = { padding: '8px 10px', whiteSpace: 'nowrap', verticalAlign: 'bottom' }
const tdStyle = { padding: '8px 10px', whiteSpace: 'nowrap', verticalAlign: 'top' }

function streakText(current, longest, unit = 'day') {
  const c = Math.round(current || 0)
  const l = Math.round(longest || 0)
  if (c <= 0) return 'No current streak'
  const suffix = c === 1 ? unit : `${unit}s`
  const pb = c >= l && c > 0 ? ' · 🏆 New personal best' : ''
  return `🔥 On streak: ${c} ${suffix}${pb}`
}

function syncHorizontalScroll(sourceRef, targetRef, lockRef) {
  if (lockRef.current) return
  const source = sourceRef.current
  const target = targetRef.current
  if (!source || !target) return
  lockRef.current = true
  target.scrollLeft = source.scrollLeft
  window.requestAnimationFrame(() => {
    lockRef.current = false
  })
}

export default function HealthCoachPage() {
  const [date, setDate] = useState(toDateInputValue())
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const [entry, setEntry] = useState({ label: 'Breakfast', items: '', protein: '', carbs: '', fats: '', calories: '', note: '' })
  const [habitEntry, setHabitEntry] = useState({ label: 'Training', pushReps: '', pushups: '', rows: '', kbSwings: '', bjjSessions: '', pigeonStretch: '', quadStretch: '', ironNeck: '', note: '' })
  const [bioEntry, setBioEntry] = useState({ kind: 'glucose', mealSlot: 'breakfast', value: '', note: '' })
  const [bowelEntry, setBowelEntry] = useState({ stoolType: 'healthy', mealSlot: 'other', note: '' })
  const [expandedDays, setExpandedDays] = useState({})
  const topScrollRef = useRef(null)
  const topScrollInnerRef = useRef(null)
  const bottomScrollRef = useRef(null)
  const tableRef = useRef(null)
  const scrollSyncLockRef = useRef(false)

  async function load() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/nutrition-macros?date=${encodeURIComponent(date)}`, { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load health coach data')
      setData(json)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function postAction(payload) {
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/nutrition-macros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, ...payload })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Save failed')
      if (json.day) setData(json.day)
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => { load() }, [date])

  useEffect(() => {
    function syncScrollWidths() {
      const topOuter = topScrollRef.current
      const topInner = topScrollInnerRef.current
      const bottom = bottomScrollRef.current
      const table = tableRef.current
      if (!topOuter || !topInner || !bottom || !table) return
      const contentWidth = Math.max(table.scrollWidth || 0, bottom.scrollWidth || 0, bottom.clientWidth || 0)
      topInner.style.width = `${contentWidth}px`
      const maxTop = Math.max(0, topOuter.scrollWidth - topOuter.clientWidth)
      const maxBottom = Math.max(0, bottom.scrollWidth - bottom.clientWidth)
      if (maxTop > 0 && maxBottom >= 0) {
        topOuter.scrollLeft = maxBottom === 0 ? 0 : (bottom.scrollLeft / Math.max(1, maxBottom)) * maxTop
      }
    }
    syncScrollWidths()
    window.addEventListener('resize', syncScrollWidths)
    return () => window.removeEventListener('resize', syncScrollWidths)
  }, [data, expandedDays])

  const proteinPct = Math.min(100, Math.round(((data?.totals?.protein || 0) / Math.max(1, data?.targets?.proteinMin || 150)) * 100))
  const todayIso = toDateInputValue()
  const allHistoryDays = (() => {
    const allDays = (data?.weeklyHistory || []).flatMap((w) => w.days || [])
    const uniqueByDate = new Map()
    for (const d of allDays) {
      if (!d?.date) continue
      if (!uniqueByDate.has(d.date)) uniqueByDate.set(d.date, d)
    }
    return Array.from(uniqueByDate.values())
      .filter((d) => String(d.date) <= todayIso)
      .sort((a, b) => String(b.date).localeCompare(String(a.date)))
  })()

  const rollingDays = allHistoryDays.slice(0, 8)
  const archivedDays = allHistoryDays.slice(8)

  return (
    <main style={{ minHeight: '100vh', padding: 24, background: '#0b1020', color: '#e8ecf3', fontFamily: 'Inter, Segoe UI, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 30 }}>Health Coach</h1>
          <p style={{ marginTop: 6, opacity: 0.8 }}>Daily KPIs first. Then clean meal + biomarker logging.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <a href='/' style={{ background: '#334155', color: 'white', textDecoration: 'none', borderRadius: 8, padding: '10px 14px' }}>Back to Mission Control</a>
          <button onClick={load} style={{ background: '#2563eb', color: 'white', border: 0, borderRadius: 8, padding: '10px 14px', cursor: 'pointer' }}>Refresh</button>
        </div>
      </div>

      {error && <div style={{ background: '#7f1d1d', padding: 10, borderRadius: 8, marginTop: 12 }}>Error: {error}</div>}
      {loading && <div style={{ marginTop: 14 }}>Loading…</div>}

      {data && (
        <>
          <section style={{ background: '#121a33', borderRadius: 12, padding: 14, marginTop: 14 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <label>Date:</label>
              <input type='date' value={date} onChange={(e) => setDate(e.target.value)} style={{ ...inputStyle, padding: '6px 8px' }} />
              <div style={{ opacity: 0.75, fontSize: 13 }}>Updated: {fmt(data.updatedAtMs)}</div>
            </div>

            <h2 style={{ marginTop: 14, marginBottom: 8 }}>Daily KPIs</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, minmax(0,1fr))', gap: 8 }}>
              <div style={card}><div style={{ opacity: 0.72, fontSize: 12 }}>Protein Progress</div><div style={{ fontSize: 22, fontWeight: 700 }}>{Math.round(data.totals?.protein || 0)}g / {Math.round(data.targets?.proteinMin || 150)}g</div><div style={{ opacity: 0.75, fontSize: 12 }}>{proteinPct}% · {streakText(data.dailyGoals?.displayStreaks?.proteinDays, data.dailyGoals?.longestStreakDays?.proteinDays, 'day')}</div></div>
              <div style={card}><div style={{ opacity: 0.72, fontSize: 12 }}>Creatine</div><div style={{ fontSize: 22, fontWeight: 700, color: data.dailyGoals?.creatineHit ? '#86efac' : '#fca5a5' }}>{data.dailyGoals?.creatineHit ? 'Yes' : 'No'}</div><div style={{ opacity: 0.82, fontSize: 12 }}>{Math.round((data.dailyGoals?.creatineGrams || 0) * 10) / 10}g / {Math.round((data.dailyGoals?.creatineGoalGrams || 5) * 10) / 10}g{(data.dailyGoals?.creatineRemainingGrams || 0) > 0 ? ` · ${Math.round((data.dailyGoals?.creatineRemainingGrams || 0) * 10) / 10}g left` : ''}</div><div style={{ opacity: 0.75, fontSize: 12 }}>{streakText(data.dailyGoals?.displayStreaks?.creatineDays, data.dailyGoals?.longestStreakDays?.creatineDays, 'day')}</div></div>
              <div style={card}><div style={{ opacity: 0.72, fontSize: 12 }}>Fish Oil</div><div style={{ fontSize: 22, fontWeight: 700, color: data.supplements?.fishOil ? '#86efac' : '#fca5a5' }}>{data.supplements?.fishOil ? 'Yes' : 'No'}</div><div style={{ opacity: 0.75, fontSize: 12 }}>{streakText(data.dailyGoals?.displayStreaks?.fishOilDays, data.dailyGoals?.longestStreakDays?.fishOilDays, 'day')}</div></div>
              <div style={card}><div style={{ opacity: 0.72, fontSize: 12 }}>Ketones</div><div style={{ fontSize: 22, fontWeight: 700 }}>{data.biomarkerSummary?.latestKetones ?? '—'}</div><div style={{ opacity: 0.75, fontSize: 12 }}>Checks today: {data.biomarkerSummary?.ketonesCount || 0}</div></div>
              <div style={card}><div style={{ opacity: 0.72, fontSize: 12 }}>Blood Glucose</div><div style={{ fontSize: 22, fontWeight: 700 }}>{data.biomarkerSummary?.latestGlucose ?? '—'}</div><div style={{ opacity: 0.75, fontSize: 12 }}>Checks today: {data.biomarkerSummary?.glucoseCount || 0}</div></div>
              <div style={card}><div style={{ opacity: 0.72, fontSize: 12 }}>Current GKI</div><div style={{ fontSize: 22, fontWeight: 700 }}>{fmtMetric(data.biomarkerSummary?.gkiLatest, 1)}</div><div style={{ opacity: 0.75, fontSize: 12 }}>{classifyGki(data.biomarkerSummary?.gkiLatest)}</div></div>
              <div style={card}><div style={{ opacity: 0.72, fontSize: 12 }}>Rolling est. A1C</div><div style={{ fontSize: 22, fontWeight: 700 }}>{fmtMetric(data.metabolics?.rollingEstimatedA1c, 2)}%</div><div style={{ opacity: 0.75, fontSize: 12 }}>{classifyA1c(data.metabolics?.rollingEstimatedA1c)} · {data.metabolics?.glucoseReadingCount || 0} glucose readings / {data.metabolics?.lookbackDays || 14}d</div></div>
              <div style={card}><div style={{ opacity: 0.72, fontSize: 12 }}>Poops</div><div style={{ fontSize: 22, fontWeight: 700 }}>{data.biomarkerSummary?.bowelCount || 0}</div><div style={{ opacity: 0.75, fontSize: 12 }}>healthy {data.biomarkerSummary?.stoolCounts?.healthy || 0} · loose {data.biomarkerSummary?.stoolCounts?.loose || 0} · very loose {data.biomarkerSummary?.stoolCounts?.very_loose || 0}</div></div>
            </div>

            <h2 style={{ marginTop: 14, marginBottom: 8 }}>Weekly KPIs</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 8 }}>
              <div style={card}><div style={{ opacity: 0.72, fontSize: 12 }}>BJJ</div><div style={{ fontSize: 22, fontWeight: 700 }}>{Math.round(data.weeklyHabits?.progress?.bjjSessions || 0)} / {Math.round(data.weeklyHabits?.targets?.bjjSessions || 3)}</div><div style={{ opacity: 0.75, fontSize: 12 }}>{streakText(data.weeklyHabits?.currentStreakWeeks?.bjjSessions, data.weeklyHabits?.longestStreakWeeks?.bjjSessions, 'week')}</div></div>
              <div style={card}><div style={{ opacity: 0.72, fontSize: 12 }}>Push-ups</div><div style={{ fontSize: 22, fontWeight: 700 }}>{Math.round(data.weeklyHabits?.progress?.pushups || 0)} / {Math.round(data.weeklyHabits?.targets?.pushups || 100)}</div><div style={{ opacity: 0.75, fontSize: 12 }}>{streakText(data.weeklyHabits?.currentStreakWeeks?.pushups, data.weeklyHabits?.longestStreakWeeks?.pushups, 'week')}</div></div>
              <div style={card}><div style={{ opacity: 0.72, fontSize: 12 }}>Pull/Rows</div><div style={{ fontSize: 22, fontWeight: 700 }}>{Math.round(data.weeklyHabits?.progress?.rows || 0)} / {Math.round(data.weeklyHabits?.targets?.rows || 80)}</div><div style={{ opacity: 0.75, fontSize: 12 }}>{streakText(data.weeklyHabits?.currentStreakWeeks?.rows, data.weeklyHabits?.longestStreakWeeks?.rows, 'week')}</div></div>
              <div style={card}><div style={{ opacity: 0.72, fontSize: 12 }}>KB Swings</div><div style={{ fontSize: 22, fontWeight: 700 }}>{Math.round(data.weeklyHabits?.progress?.kbSwings || 0)} / {Math.round(data.weeklyHabits?.targets?.kbSwings || 100)}</div><div style={{ opacity: 0.75, fontSize: 12 }}>{streakText(data.weeklyHabits?.currentStreakWeeks?.kbSwings, data.weeklyHabits?.longestStreakWeeks?.kbSwings, 'week')}</div></div>
              <div style={card}><div style={{ opacity: 0.72, fontSize: 12 }}>Pigeon Stretch</div><div style={{ fontSize: 22, fontWeight: 700 }}>{Math.round(data.weeklyHabits?.progress?.pigeonStretch || 0)} / {Math.round(data.weeklyHabits?.targets?.pigeonStretch || 3)}</div><div style={{ opacity: 0.75, fontSize: 12 }}>{streakText(data.weeklyHabits?.currentStreakWeeks?.pigeonStretch, data.weeklyHabits?.longestStreakWeeks?.pigeonStretch, 'week')}</div></div>
              <div style={card}><div style={{ opacity: 0.72, fontSize: 12 }}>Quad Stretch</div><div style={{ fontSize: 22, fontWeight: 700 }}>{Math.round(data.weeklyHabits?.progress?.quadStretch || 0)} / {Math.round(data.weeklyHabits?.targets?.quadStretch || 3)}</div><div style={{ opacity: 0.75, fontSize: 12 }}>{streakText(data.weeklyHabits?.currentStreakWeeks?.quadStretch, data.weeklyHabits?.longestStreakWeeks?.quadStretch, 'week')}</div></div>
              <div style={card}><div style={{ opacity: 0.72, fontSize: 12 }}>Iron Neck</div><div style={{ fontSize: 22, fontWeight: 700 }}>{Math.round(data.weeklyHabits?.progress?.ironNeck || 0)} / {Math.round(data.weeklyHabits?.targets?.ironNeck || 2)}</div><div style={{ opacity: 0.75, fontSize: 12 }}>{streakText(data.weeklyHabits?.currentStreakWeeks?.ironNeck, data.weeklyHabits?.longestStreakWeeks?.ironNeck, 'week')}</div></div>
            </div>
          </section>

          <section style={{ background: '#121a33', borderRadius: 12, padding: 14, marginTop: 14 }}>
            <h2 style={{ marginTop: 0 }}>Daily Log (Rolling 7 Days + Today)</h2>
            <div style={{ opacity: 0.78, marginBottom: 8, fontSize: 13 }}>Newest day on top (today first), then previous 7 days.</div>
            <div
              ref={topScrollRef}
              onScroll={() => syncHorizontalScroll(topScrollRef, bottomScrollRef, scrollSyncLockRef)}
              style={{ overflowX: 'auto', overflowY: 'hidden', marginBottom: 6 }}
            >
              <div ref={topScrollInnerRef} style={{ width: 1, height: 1 }} />
            </div>
            <div
              ref={bottomScrollRef}
              onScroll={() => syncHorizontalScroll(bottomScrollRef, topScrollRef, scrollSyncLockRef)}
              style={{ overflowX: 'auto' }}
            >
              <table ref={tableRef} style={{ width: 'max-content', minWidth: '100%', borderCollapse: 'separate', borderSpacing: '0 4px', fontSize: 13 }}>
                <thead>
                  <tr style={{ textAlign: 'left', opacity: 0.9 }}>
                    <th style={thStyle}>Date</th>
                    <th style={thStyle}>Breakfast (P/C/F/Cal)</th>
                    <th style={thStyle}>Lunch (P/C/F/Cal)</th>
                    <th style={thStyle}>Dinner (P/C/F/Cal)</th>
                    <th style={thStyle}>Snacks (P/C/F/Cal)</th>
                    <th style={thStyle}>Daily Total (P/C/F/Cal)</th>
                    <th style={thStyle}>Ketones (AM / PM)</th>
                    <th style={thStyle}>Glucose (AM / PM)</th>
                    <th style={thStyle}>GKI / est. A1C</th>
                    <th style={{ ...thStyle, minWidth: 280 }}>Poops (daily summary)</th>
                    <th style={thStyle}>Creatine</th>
                    <th style={thStyle}>Fish Oil</th>
                    <th style={thStyle}>BJJ</th>
                    <th style={thStyle}>Push Reps</th>
                    <th style={thStyle}>Push-ups</th>
                    <th style={thStyle}>Pull/Rows</th>
                    <th style={thStyle}>KB Swings</th>
                    <th style={thStyle}>Pigeon Stretch</th>
                    <th style={thStyle}>Quad Stretch</th>
                    <th style={thStyle}>Iron Neck</th>
                    <th style={thStyle}>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {rollingDays.map((d, i) => (
                    <Fragment key={d.date}>
                    <tr style={{ borderTop: '1px solid #2f4666', background: i % 2 === 0 ? '#031625' : '#12314a' }}>
                      <td style={{ ...tdStyle, minWidth: 120 }}>{d.dayLabel} {d.date}</td>
                      <td style={tdStyle}>{Math.round(d.byMeal?.breakfast?.protein || 0)}/{Math.round(d.byMeal?.breakfast?.carbs || 0)}/{Math.round(d.byMeal?.breakfast?.fats || 0)}/{Math.round(d.byMeal?.breakfast?.calories || 0)}</td>
                      <td style={tdStyle}>{Math.round(d.byMeal?.lunch?.protein || 0)}/{Math.round(d.byMeal?.lunch?.carbs || 0)}/{Math.round(d.byMeal?.lunch?.fats || 0)}/{Math.round(d.byMeal?.lunch?.calories || 0)}</td>
                      <td style={tdStyle}>{Math.round(d.byMeal?.dinner?.protein || 0)}/{Math.round(d.byMeal?.dinner?.carbs || 0)}/{Math.round(d.byMeal?.dinner?.fats || 0)}/{Math.round(d.byMeal?.dinner?.calories || 0)}</td>
                      <td style={tdStyle}>{Math.round(d.byMeal?.snacks?.protein || 0)}/{Math.round(d.byMeal?.snacks?.carbs || 0)}/{Math.round(d.byMeal?.snacks?.fats || 0)}/{Math.round(d.byMeal?.snacks?.calories || 0)}</td>
                      <td style={tdStyle}><strong>{Math.round(d.totals?.protein || 0)}/{Math.round(d.totals?.carbs || 0)}/{Math.round(d.totals?.fats || 0)}/{Math.round(d.totals?.calories || 0)}</strong></td>
                      <td style={tdStyle}>
                        {(() => {
                          const am = d.biomarkers?.ketonesAMLatest ?? d.biomarkers?.ketonesByMeal?.breakfast?.latest ?? d.biomarkers?.ketonesByMeal?.other?.latest ?? '-'
                          const pm = d.biomarkers?.ketonesPMLatest ?? d.biomarkers?.ketonesByMeal?.dinner?.latest ?? d.biomarkers?.ketonesByMeal?.lunch?.latest ?? d.biomarkers?.ketonesByMeal?.snack?.latest ?? d.biomarkers?.ketonesByMeal?.snacks?.latest ?? '-'
                          return `AM: ${am} | PM: ${pm}`
                        })()}
                      </td>
                      <td style={tdStyle}>
                        {(() => {
                          const am = d.biomarkers?.glucoseAMLatest ?? d.biomarkers?.glucoseByMeal?.breakfast?.latest ?? d.biomarkers?.glucoseByMeal?.other?.latest ?? '-'
                          const pm = d.biomarkers?.glucosePMLatest ?? d.biomarkers?.glucoseByMeal?.dinner?.latest ?? d.biomarkers?.glucoseByMeal?.lunch?.latest ?? d.biomarkers?.glucoseByMeal?.snack?.latest ?? d.biomarkers?.glucoseByMeal?.snacks?.latest ?? '-'
                          return `AM: ${am} | PM: ${pm}`
                        })()}
                      </td>
                      <td style={{ ...tdStyle, minWidth: 170, whiteSpace: 'normal' }}>
                        <div>GKI: {fmtMetric(d.biomarkers?.gkiLatest, 1)}</div>
                        <div style={{ opacity: 0.8, fontSize: 12 }}>{classifyGki(d.biomarkers?.gkiLatest)}</div>
                        <div style={{ marginTop: 4 }}>A1C: {fmtMetric(d.metabolics?.rollingEstimatedA1c, 2)}%</div>
                      </td>
                      <td style={{ ...tdStyle, minWidth: 280, whiteSpace: 'normal' }}>
                        {(() => {
                          const s = d.biomarkers?.stoolCounts || {}
                          const total = d.biomarkers?.bowelCount || 0
                          const healthy = s.healthy || 0
                          const loose = s.loose || 0
                          const veryLoose = s.very_loose || 0
                          const bm = d.biomarkers?.bowelByMeal || {}
                          const amCount = (bm.breakfast?.total || 0)
                          const pmCount = (bm.lunch?.total || 0) + (bm.dinner?.total || 0) + (bm.snack?.total || 0)
                          const timing = amCount >= pmCount ? 'mostly AM' : 'mostly PM'
                          return `${total} total (${healthy} healthy, ${loose} loose, ${veryLoose} very loose) · ${timing}`
                        })()}
                      </td>
                      <td style={tdStyle}>{Math.round((d.supplements?.creatineGrams || 0) * 10) / 10}g / 5g {d.supplements?.creatine ? '✅' : '—'}</td>
                      <td style={tdStyle}>{d.supplements?.fishOil ? '✅' : '—'}</td>
                      <td style={tdStyle}>{Math.round(d.habitTotals?.bjjSessions || 0)}</td>
                      <td style={tdStyle}>{Math.round(d.habitTotals?.pushReps || 0)}</td>
                      <td style={tdStyle}>{Math.round(d.habitTotals?.pushups || 0)}</td>
                      <td style={tdStyle}>{Math.round(d.habitTotals?.rows || 0)}</td>
                      <td style={tdStyle}>{Math.round(d.habitTotals?.kbSwings || 0)}</td>
                      <td style={tdStyle}>{Math.round(d.habitTotals?.pigeonStretch || 0)}</td>
                      <td style={tdStyle}>{Math.round(d.habitTotals?.quadStretch || 0)}</td>
                      <td style={tdStyle}>{Math.round(d.habitTotals?.ironNeck || 0)}</td>
                      <td style={tdStyle}>
                        <button
                          onClick={() => setExpandedDays((prev) => ({ ...prev, [d.date]: !prev[d.date] }))}
                          style={{ background: '#334155', color: 'white', border: 0, borderRadius: 6, padding: '4px 8px', cursor: 'pointer' }}
                        >
                          {expandedDays[d.date] ? 'Hide' : 'View'}
                        </button>
                      </td>
                    </tr>
                    {expandedDays[d.date] && (
                      <tr style={{ background: '#0a1f31' }}>
                        <td colSpan={22} style={{ padding: '10px 12px', whiteSpace: 'normal' }}>
                          <div style={{ fontWeight: 700, marginBottom: 6 }}>Logged meals/items for {d.date}</div>
                          {(d.mealEntries || []).length === 0 && <div style={{ opacity: 0.8 }}>No meal details logged for this day.</div>}
                          {(d.mealEntries || []).map((m) => (
                            <div key={m.id || `${m.ts}-${m.label}`} style={{ borderTop: '1px solid #2a415d', padding: '6px 0' }}>
                              <div style={{ fontSize: 13, opacity: 0.85 }}>{m.label} — P/C/F/Cal: {Math.round(m.protein)}/{Math.round(m.carbs)}/{Math.round(m.fats)}/{Math.round(m.calories)}</div>
                              <div>{m.items || '—'}</div>
                              {m.note ? <div style={{ opacity: 0.75, fontSize: 12 }}>Note: {m.note}</div> : null}
                            </div>
                          ))}
                          <div style={{ marginTop: 10, fontWeight: 700 }}>Notes</div>
                          {(d.feedback || []).length === 0 ? (
                            <div style={{ opacity: 0.8, marginTop: 4 }}>No notes logged for this day.</div>
                          ) : (
                            <div style={{ marginTop: 4 }}>
                              {(d.feedback || []).map((f) => (
                                <div key={f.id || `${d.date}-${f.createdAtMs || 0}`} style={{ borderTop: '1px solid #2a415d', padding: '6px 0' }}>
                                  <div style={{ opacity: 0.7, fontSize: 12 }}>{fmt(f.createdAtMs)}</div>
                                  <div>{f.text}</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section style={{ background: '#121a33', borderRadius: 12, padding: 14, marginTop: 14 }}>
            <h2 style={{ marginTop: 0 }}>Quick Log</h2>

            <h3>Meal</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 8 }}>
              <select value={entry.label} onChange={(e) => setEntry({ ...entry, label: e.target.value })} style={inputStyle}>
                <option>Breakfast</option><option>Lunch</option><option>Dinner</option><option>Snack</option>
              </select>
              <input value={entry.protein} onChange={(e) => setEntry({ ...entry, protein: e.target.value })} placeholder='Protein (g)' style={inputStyle} />
              <input value={entry.carbs} onChange={(e) => setEntry({ ...entry, carbs: e.target.value })} placeholder='Carbs (g)' style={inputStyle} />
              <input value={entry.fats} onChange={(e) => setEntry({ ...entry, fats: e.target.value })} placeholder='Fats (g)' style={inputStyle} />
              <input value={entry.calories} onChange={(e) => setEntry({ ...entry, calories: e.target.value })} placeholder='Calories' style={inputStyle} />
              <input value={entry.items} onChange={(e) => setEntry({ ...entry, items: e.target.value })} placeholder='Foods' style={{ ...inputStyle, gridColumn: 'span 3' }} />
            </div>
            <button onClick={() => postAction({ action: 'add_entry', entry })} disabled={saving} style={{ marginTop: 8, background: '#2563eb', color: 'white', border: 0, borderRadius: 8, padding: '8px 12px', cursor: 'pointer' }}>Add meal</button>

            <h3 style={{ marginTop: 16 }}>Biomarker (Ketones / Glucose)</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 8 }}>
              <select value={bioEntry.kind} onChange={(e) => setBioEntry({ ...bioEntry, kind: e.target.value })} style={inputStyle}><option value='glucose'>Glucose</option><option value='ketones'>Ketones</option></select>
              <select value={bioEntry.mealSlot} onChange={(e) => setBioEntry({ ...bioEntry, mealSlot: e.target.value })} style={inputStyle}><option value='breakfast'>Breakfast</option><option value='lunch'>Lunch</option><option value='dinner'>Dinner</option><option value='snack'>Snack</option><option value='other'>Other</option></select>
              <input value={bioEntry.value} onChange={(e) => setBioEntry({ ...bioEntry, value: e.target.value })} placeholder='Value' style={inputStyle} />
              <input value={bioEntry.note} onChange={(e) => setBioEntry({ ...bioEntry, note: e.target.value })} placeholder='Note' style={inputStyle} />
            </div>
            <button onClick={() => postAction({ action: 'add_biomarker', entry: bioEntry })} disabled={saving} style={{ marginTop: 8, background: '#2563eb', color: 'white', border: 0, borderRadius: 8, padding: '8px 12px', cursor: 'pointer' }}>Add biomarker</button>

            <h3 style={{ marginTop: 16 }}>Poop Log</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 8 }}>
              <select value={bowelEntry.mealSlot} onChange={(e) => setBowelEntry({ ...bowelEntry, mealSlot: e.target.value })} style={inputStyle}><option value='breakfast'>Breakfast</option><option value='lunch'>Lunch</option><option value='dinner'>Dinner</option><option value='snack'>Snack</option><option value='other'>Other</option></select>
              <select value={bowelEntry.stoolType} onChange={(e) => setBowelEntry({ ...bowelEntry, stoolType: e.target.value })} style={inputStyle}><option value='healthy'>Healthy</option><option value='loose'>Loose</option><option value='very_loose'>Very loose</option></select>
              <input value={bowelEntry.note} onChange={(e) => setBowelEntry({ ...bowelEntry, note: e.target.value })} placeholder='Note' style={inputStyle} />
            </div>
            <button onClick={() => postAction({ action: 'add_bowel', entry: bowelEntry })} disabled={saving} style={{ marginTop: 8, background: '#2563eb', color: 'white', border: 0, borderRadius: 8, padding: '8px 12px', cursor: 'pointer' }}>Add poop log</button>

            <h3 style={{ marginTop: 16 }}>Supplements + Weekly Training</h3>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <label><input type='checkbox' checked={!!data.supplements?.creatine} onChange={(e) => postAction({ action: 'update_meta', supplements: { creatine: e.target.checked } })} /> Creatine</label>
              <label><input type='checkbox' checked={!!data.supplements?.fishOil} onChange={(e) => postAction({ action: 'update_meta', supplements: { fishOil: e.target.checked } })} /> Fish Oil</label>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0,1fr))', gap: 8, marginTop: 8 }}>
              <input value={habitEntry.bjjSessions} onChange={(e) => setHabitEntry({ ...habitEntry, bjjSessions: e.target.value })} placeholder='BJJ sessions' style={inputStyle} />
              <input value={habitEntry.pushReps} onChange={(e) => setHabitEntry({ ...habitEntry, pushReps: e.target.value })} placeholder='Push reps' style={inputStyle} />
              <input value={habitEntry.pushups} onChange={(e) => setHabitEntry({ ...habitEntry, pushups: e.target.value })} placeholder='Push-ups' style={inputStyle} />
              <input value={habitEntry.rows} onChange={(e) => setHabitEntry({ ...habitEntry, rows: e.target.value })} placeholder='Pull/rows' style={inputStyle} />
              <input value={habitEntry.kbSwings} onChange={(e) => setHabitEntry({ ...habitEntry, kbSwings: e.target.value })} placeholder='KB swings' style={inputStyle} />
              <input value={habitEntry.pigeonStretch} onChange={(e) => setHabitEntry({ ...habitEntry, pigeonStretch: e.target.value })} placeholder='Pigeon stretch' style={inputStyle} />
              <input value={habitEntry.quadStretch} onChange={(e) => setHabitEntry({ ...habitEntry, quadStretch: e.target.value })} placeholder='Quad stretch' style={inputStyle} />
              <input value={habitEntry.ironNeck} onChange={(e) => setHabitEntry({ ...habitEntry, ironNeck: e.target.value })} placeholder='Iron neck' style={inputStyle} />
            </div>
            <button onClick={() => postAction({ action: 'add_habit_entry', entry: habitEntry })} disabled={saving} style={{ marginTop: 8, background: '#2563eb', color: 'white', border: 0, borderRadius: 8, padding: '8px 12px', cursor: 'pointer' }}>Add training log</button>
          </section>

          <section style={{ background: '#121a33', borderRadius: 12, padding: 14, marginTop: 14 }}>
            <h2 style={{ marginTop: 0 }}>Longest Streaks (Historical)</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 12 }}>
              <div style={card}>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>Daily Goals</div>
                <div style={{ fontSize: 13, opacity: 0.9 }}>Protein: {Math.round(data.dailyGoals?.longestStreakDays?.proteinDays || 0)} day(s)</div>
                <div style={{ fontSize: 13, opacity: 0.9 }}>Creatine: {Math.round(data.dailyGoals?.longestStreakDays?.creatineDays || 0)} day(s)</div>
                <div style={{ fontSize: 13, opacity: 0.9 }}>Fish Oil: {Math.round(data.dailyGoals?.longestStreakDays?.fishOilDays || 0)} day(s)</div>
                <div style={{ fontSize: 13, opacity: 0.9 }}>All Daily Goals: {Math.round(data.dailyGoals?.longestStreakDays?.allGoalsDays || 0)} day(s)</div>
              </div>
              <div style={card}>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>Weekly Goals</div>
                <div style={{ fontSize: 13, opacity: 0.9 }}>Push-ups: {Math.round(data.weeklyHabits?.longestStreakWeeks?.pushups || 0)} week(s)</div>
                <div style={{ fontSize: 13, opacity: 0.9 }}>Rows/Pull: {Math.round(data.weeklyHabits?.longestStreakWeeks?.rows || 0)} week(s)</div>
                <div style={{ fontSize: 13, opacity: 0.9 }}>KB Swings: {Math.round(data.weeklyHabits?.longestStreakWeeks?.kbSwings || 0)} week(s)</div>
                <div style={{ fontSize: 13, opacity: 0.9 }}>BJJ: {Math.round(data.weeklyHabits?.longestStreakWeeks?.bjjSessions || 0)} week(s)</div>
                <div style={{ fontSize: 13, opacity: 0.9 }}>Pigeon Stretch: {Math.round(data.weeklyHabits?.longestStreakWeeks?.pigeonStretch || 0)} week(s)</div>
                <div style={{ fontSize: 13, opacity: 0.9 }}>Quad Stretch: {Math.round(data.weeklyHabits?.longestStreakWeeks?.quadStretch || 0)} week(s)</div>
                <div style={{ fontSize: 13, opacity: 0.9 }}>Iron Neck: {Math.round(data.weeklyHabits?.longestStreakWeeks?.ironNeck || 0)} week(s)</div>
                <div style={{ fontSize: 13, opacity: 0.9 }}>All Weekly Goals: {Math.round(data.weeklyHabits?.longestStreakWeeks?.all || 0)} week(s)</div>
              </div>
            </div>
          </section>

          <section style={{ background: '#121a33', borderRadius: 12, padding: 14, marginTop: 14 }}>
            <h2 style={{ marginTop: 0 }}>Historical Archive (Older Than Rolling Window)</h2>
            <div style={{ opacity: 0.78, marginBottom: 8, fontSize: 13 }}>These are the rows that have rolled out of the current 7-day view, kept here for long-term review.</div>
            {archivedDays.length === 0 ? (
              <div style={{ opacity: 0.8 }}>No archived rows yet.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: 'max-content', minWidth: '100%', borderCollapse: 'separate', borderSpacing: '0 4px', fontSize: 13 }}>
                  <thead>
                    <tr style={{ textAlign: 'left', opacity: 0.9 }}>
                      <th style={thStyle}>Date</th>
                      <th style={thStyle}>Breakfast (P/C/F/Cal)</th>
                      <th style={thStyle}>Lunch (P/C/F/Cal)</th>
                      <th style={thStyle}>Dinner (P/C/F/Cal)</th>
                      <th style={thStyle}>Snacks (P/C/F/Cal)</th>
                      <th style={thStyle}>Daily Total (P/C/F/Cal)</th>
                      <th style={thStyle}>Ketones (AM / PM)</th>
                      <th style={thStyle}>Glucose (AM / PM)</th>
                      <th style={thStyle}>GKI / est. A1C</th>
                      <th style={{ ...thStyle, minWidth: 280 }}>Poops (daily summary)</th>
                      <th style={thStyle}>Creatine</th>
                      <th style={thStyle}>Fish Oil</th>
                      <th style={thStyle}>BJJ</th>
                      <th style={thStyle}>Push Reps</th>
                      <th style={thStyle}>Push-ups</th>
                      <th style={thStyle}>Pull/Rows</th>
                      <th style={thStyle}>KB Swings</th>
                      <th style={thStyle}>Pigeon Stretch</th>
                      <th style={thStyle}>Quad Stretch</th>
                      <th style={thStyle}>Iron Neck</th>
                      <th style={thStyle}>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {archivedDays.map((d, i) => (
                      <Fragment key={`archive-${d.date}`}>
                        <tr style={{ borderTop: '1px solid #2f4666', background: i % 2 === 0 ? '#031625' : '#12314a' }}>
                          <td style={{ ...tdStyle, minWidth: 120 }}>{d.dayLabel} {d.date}</td>
                          <td style={tdStyle}>{Math.round(d.byMeal?.breakfast?.protein || 0)}/{Math.round(d.byMeal?.breakfast?.carbs || 0)}/{Math.round(d.byMeal?.breakfast?.fats || 0)}/{Math.round(d.byMeal?.breakfast?.calories || 0)}</td>
                          <td style={tdStyle}>{Math.round(d.byMeal?.lunch?.protein || 0)}/{Math.round(d.byMeal?.lunch?.carbs || 0)}/{Math.round(d.byMeal?.lunch?.fats || 0)}/{Math.round(d.byMeal?.lunch?.calories || 0)}</td>
                          <td style={tdStyle}>{Math.round(d.byMeal?.dinner?.protein || 0)}/{Math.round(d.byMeal?.dinner?.carbs || 0)}/{Math.round(d.byMeal?.dinner?.fats || 0)}/{Math.round(d.byMeal?.dinner?.calories || 0)}</td>
                          <td style={tdStyle}>{Math.round(d.byMeal?.snacks?.protein || 0)}/{Math.round(d.byMeal?.snacks?.carbs || 0)}/{Math.round(d.byMeal?.snacks?.fats || 0)}/{Math.round(d.byMeal?.snacks?.calories || 0)}</td>
                          <td style={tdStyle}><strong>{Math.round(d.totals?.protein || 0)}/{Math.round(d.totals?.carbs || 0)}/{Math.round(d.totals?.fats || 0)}/{Math.round(d.totals?.calories || 0)}</strong></td>
                          <td style={tdStyle}>{(() => { const am = d.biomarkers?.ketonesAMLatest ?? d.biomarkers?.ketonesByMeal?.breakfast?.latest ?? d.biomarkers?.ketonesByMeal?.other?.latest ?? '-'; const pm = d.biomarkers?.ketonesPMLatest ?? d.biomarkers?.ketonesByMeal?.dinner?.latest ?? d.biomarkers?.ketonesByMeal?.lunch?.latest ?? d.biomarkers?.ketonesByMeal?.snack?.latest ?? d.biomarkers?.ketonesByMeal?.snacks?.latest ?? '-'; return `AM: ${am} | PM: ${pm}` })()}</td>
                          <td style={tdStyle}>{(() => { const am = d.biomarkers?.glucoseAMLatest ?? d.biomarkers?.glucoseByMeal?.breakfast?.latest ?? d.biomarkers?.glucoseByMeal?.other?.latest ?? '-'; const pm = d.biomarkers?.glucosePMLatest ?? d.biomarkers?.glucoseByMeal?.dinner?.latest ?? d.biomarkers?.glucoseByMeal?.lunch?.latest ?? d.biomarkers?.glucoseByMeal?.snack?.latest ?? d.biomarkers?.glucoseByMeal?.snacks?.latest ?? '-'; return `AM: ${am} | PM: ${pm}` })()}</td>
                          <td style={{ ...tdStyle, minWidth: 170, whiteSpace: 'normal' }}><div>GKI: {fmtMetric(d.biomarkers?.gkiLatest, 1)}</div><div style={{ opacity: 0.8, fontSize: 12 }}>{classifyGki(d.biomarkers?.gkiLatest)}</div><div style={{ marginTop: 4 }}>A1C: {fmtMetric(d.metabolics?.rollingEstimatedA1c, 2)}%</div></td>
                          <td style={{ ...tdStyle, minWidth: 280, whiteSpace: 'normal' }}>{(() => { const s = d.biomarkers?.stoolCounts || {}; const total = d.biomarkers?.bowelCount || 0; const healthy = s.healthy || 0; const loose = s.loose || 0; const veryLoose = s.very_loose || 0; const bm = d.biomarkers?.bowelByMeal || {}; const amCount = (bm.breakfast?.total || 0); const pmCount = (bm.lunch?.total || 0) + (bm.dinner?.total || 0) + (bm.snack?.total || 0); const timing = amCount >= pmCount ? 'mostly AM' : 'mostly PM'; return `${total} total (${healthy} healthy, ${loose} loose, ${veryLoose} very loose) · ${timing}` })()}</td>
                          <td style={tdStyle}>{Math.round((d.supplements?.creatineGrams || 0) * 10) / 10}g / 5g {d.supplements?.creatine ? '✅' : '—'}</td>
                          <td style={tdStyle}>{d.supplements?.fishOil ? '✅' : '—'}</td>
                          <td style={tdStyle}>{Math.round(d.habitTotals?.bjjSessions || 0)}</td>
                          <td style={tdStyle}>{Math.round(d.habitTotals?.pushReps || 0)}</td>
                          <td style={tdStyle}>{Math.round(d.habitTotals?.pushups || 0)}</td>
                          <td style={tdStyle}>{Math.round(d.habitTotals?.rows || 0)}</td>
                          <td style={tdStyle}>{Math.round(d.habitTotals?.kbSwings || 0)}</td>
                          <td style={tdStyle}>{Math.round(d.habitTotals?.pigeonStretch || 0)}</td>
                          <td style={tdStyle}>{Math.round(d.habitTotals?.quadStretch || 0)}</td>
                          <td style={tdStyle}>{Math.round(d.habitTotals?.ironNeck || 0)}</td>
                          <td style={tdStyle}>
                            <button onClick={() => setExpandedDays((prev) => ({ ...prev, [d.date]: !prev[d.date] }))} style={{ background: '#334155', color: 'white', border: 0, borderRadius: 6, padding: '4px 8px', cursor: 'pointer' }}>
                              {expandedDays[d.date] ? 'Hide' : 'View'}
                            </button>
                          </td>
                        </tr>
                        {expandedDays[d.date] && (
                          <tr style={{ background: '#0a1f31' }}>
                            <td colSpan={22} style={{ padding: '10px 12px', whiteSpace: 'normal' }}>
                              <div style={{ fontWeight: 700, marginBottom: 6 }}>Logged meals/items for {d.date}</div>
                              {(d.mealEntries || []).length === 0 && <div style={{ opacity: 0.8 }}>No meal details logged for this day.</div>}
                              {(d.mealEntries || []).map((m) => (
                                <div key={m.id || `${m.ts}-${m.label}`} style={{ borderTop: '1px solid #2a415d', padding: '6px 0' }}>
                                  <div style={{ fontSize: 13, opacity: 0.85 }}>{m.label} — P/C/F/Cal: {Math.round(m.protein)}/{Math.round(m.carbs)}/{Math.round(m.fats)}/{Math.round(m.calories)}</div>
                                  <div>{m.items || '—'}</div>
                                  {m.note ? <div style={{ opacity: 0.75, fontSize: 12 }}>Note: {m.note}</div> : null}
                                </div>
                              ))}
                              <div style={{ marginTop: 10, fontWeight: 700 }}>Notes</div>
                              {(d.feedback || []).length === 0 ? <div style={{ opacity: 0.8, marginTop: 4 }}>No notes logged for this day.</div> : <div style={{ marginTop: 4 }}>{(d.feedback || []).map((f) => (<div key={f.id || `${d.date}-${f.createdAtMs || 0}`} style={{ borderTop: '1px solid #2a415d', padding: '6px 0' }}><div style={{ opacity: 0.7, fontSize: 12 }}>{fmt(f.createdAtMs)}</div><div>{f.text}</div></div>))}</div>}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </main>
  )
}
