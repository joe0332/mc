'use client'

import { useEffect, useMemo, useState } from 'react'

function fmt(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString()
}

function toDateInputValue(d = new Date()) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export default function NutritionMacrosPage() {
  const [date, setDate] = useState(toDateInputValue())
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const [entry, setEntry] = useState({
    label: 'Meal',
    items: '',
    protein: '',
    carbs: '',
    fats: '',
    calories: '',
    note: ''
  })

  const [feedbackText, setFeedbackText] = useState('')
  const [habitEntry, setHabitEntry] = useState({ label: 'Training', pushups: '', rows: '', kbSwings: '', bjjSessions: '', note: '' })

  async function load() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/nutrition-macros?date=${encodeURIComponent(date)}`, { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load nutrition tracker')
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

  async function addEntry() {
    if (!entry.label.trim()) return
    await postAction({ action: 'add_entry', entry: { ...entry } })
    setEntry({ label: 'Meal', items: '', protein: '', carbs: '', fats: '', calories: '', note: '' })
  }

  async function updateMeta(patch = {}) {
    await postAction({ action: 'update_meta', ...patch })
  }

  async function addFeedback() {
    if (!feedbackText.trim()) return
    await postAction({ action: 'add_feedback', text: feedbackText.trim() })
    setFeedbackText('')
  }

  async function addHabitEntry() {
    await postAction({ action: 'add_habit_entry', entry: { ...habitEntry } })
    setHabitEntry({ label: 'Training', pushups: '', rows: '', kbSwings: '', bjjSessions: '', note: '' })
  }

  useEffect(() => { load() }, [date])

  const suggestions = useMemo(() => {
    if (!data) return []
    const out = []
    const remProtein = Number(data.targets?.proteinRemainingToMin || 0)
    const carbs = Number(data.totals?.carbs || 0)

    if (remProtein >= 40) {
      out.push('You are behind on protein. Add 40–50g next meal: chicken + Greek yogurt, or shake + eggs.')
    } else if (remProtein > 0) {
      out.push(`You need about ${Math.round(remProtein)}g more protein to hit minimum target.`)
    } else {
      out.push('Protein target minimum hit. Keep dinner protein-forward and avoid unnecessary late carbs.')
    }

    if (data.trainingDay) {
      out.push('Training-day rule: keep most carbs pre/post-BJJ and lunch; dinner lower-carb unless session volume was high.')
    } else {
      out.push('Non-training day: keep carbs lower, center meals on protein + vegetables + healthy fats.')
    }

    if ((data.supplements?.creatine !== true) || (data.supplements?.magnesium !== true)) {
      out.push('Supplement check: log creatine (5g) and magnesium tonight if not done yet.')
    }

    if (data.trainingDay && carbs < 60) {
      out.push('Carbs look very low for a training day. Consider adding fruit/yogurt or a small starch post-training.')
    }

    return out.slice(0, 4)
  }, [data])

  return (
    <main style={{ minHeight: '100vh', padding: 24, background: '#0b1020', color: '#e8ecf3', fontFamily: 'Inter, Segoe UI, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 30 }}>Nutrition & Macro Accountability</h1>
          <p style={{ marginTop: 6, opacity: 0.8 }}>Protein-first tracking for BJJ recovery + blood sugar-aware carb timing.</p>
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
              <input type='date' value={date} onChange={(e) => setDate(e.target.value)} style={{ background: '#0b1020', color: '#e8ecf3', border: '1px solid #334155', borderRadius: 6, padding: '6px 8px' }} />
              <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input
                  type='checkbox'
                  checked={!!data.trainingDay}
                  onChange={(e) => updateMeta({ trainingDay: e.target.checked })}
                />
                Training day
              </label>
              <div style={{ opacity: 0.75, fontSize: 13 }}>Updated: {fmt(data.updatedAtMs)}</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 8, marginTop: 12 }}>
              <div style={{ border: '1px solid #334155', borderRadius: 8, padding: 10 }}><div style={{ opacity: 0.72, fontSize: 12 }}>Protein</div><div style={{ fontSize: 24, fontWeight: 700 }}>{Math.round(data.totals?.protein || 0)}g</div><div style={{ opacity: 0.7, fontSize: 12 }}>Target 150–170g</div></div>
              <div style={{ border: '1px solid #334155', borderRadius: 8, padding: 10 }}><div style={{ opacity: 0.72, fontSize: 12 }}>Carbs</div><div style={{ fontSize: 24, fontWeight: 700 }}>{Math.round(data.totals?.carbs || 0)}g</div><div style={{ opacity: 0.7, fontSize: 12 }}>{data.trainingDay ? 'Train-day targeted carbs' : 'Lower-carb day'}</div></div>
              <div style={{ border: '1px solid #334155', borderRadius: 8, padding: 10 }}><div style={{ opacity: 0.72, fontSize: 12 }}>Fats</div><div style={{ fontSize: 24, fontWeight: 700 }}>{Math.round(data.totals?.fats || 0)}g</div><div style={{ opacity: 0.7, fontSize: 12 }}>Whole-food sources preferred</div></div>
              <div style={{ border: '1px solid #334155', borderRadius: 8, padding: 10 }}><div style={{ opacity: 0.72, fontSize: 12 }}>Calories (est)</div><div style={{ fontSize: 24, fontWeight: 700 }}>{Math.round(data.totals?.calories || 0)}</div><div style={{ opacity: 0.7, fontSize: 12 }}>Informational only</div></div>
            </div>
          </section>

          <section style={{ background: '#121a33', borderRadius: 12, padding: 14, marginTop: 14 }}>
            <h2 style={{ marginTop: 0 }}>Daily Habit Totals + Weekly Progress</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 8 }}>
              <div style={{ border: '1px solid #334155', borderRadius: 8, padding: 10 }}><div style={{ opacity: 0.72, fontSize: 12 }}>BJJ Today</div><div style={{ fontSize: 24, fontWeight: 700 }}>{Math.round(data.dailyHabitTotals?.bjjSessions || 0)}</div></div>
              <div style={{ border: '1px solid #334155', borderRadius: 8, padding: 10 }}><div style={{ opacity: 0.72, fontSize: 12 }}>Push-ups Today</div><div style={{ fontSize: 24, fontWeight: 700 }}>{Math.round(data.dailyHabitTotals?.pushups || 0)}</div></div>
              <div style={{ border: '1px solid #334155', borderRadius: 8, padding: 10 }}><div style={{ opacity: 0.72, fontSize: 12 }}>Rows Today</div><div style={{ fontSize: 24, fontWeight: 700 }}>{Math.round(data.dailyHabitTotals?.rows || 0)}</div></div>
              <div style={{ border: '1px solid #334155', borderRadius: 8, padding: 10 }}><div style={{ opacity: 0.72, fontSize: 12 }}>KB Swings Today</div><div style={{ fontSize: 24, fontWeight: 700 }}>{Math.round(data.dailyHabitTotals?.kbSwings || 0)}</div></div>
            </div>

            <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 8 }}>
              {[
                ['bjjSessions', 'BJJ', data.weeklyHabits?.targets?.bjjSessions, data.weeklyHabits?.progress?.bjjSessions, data.weeklyHabits?.pct?.bjjSessions],
                ['pushups', 'Push-ups', data.weeklyHabits?.targets?.pushups, data.weeklyHabits?.progress?.pushups, data.weeklyHabits?.pct?.pushups],
                ['rows', 'Rows', data.weeklyHabits?.targets?.rows, data.weeklyHabits?.progress?.rows, data.weeklyHabits?.pct?.rows],
                ['kbSwings', 'KB Swings', data.weeklyHabits?.targets?.kbSwings, data.weeklyHabits?.progress?.kbSwings, data.weeklyHabits?.pct?.kbSwings]
              ].map(([key, label, target, progress, pct]) => {
                const remaining = Math.max(0, Math.round(Number(target || 0) - Number(progress || 0)))
                return (
                  <div key={key} style={{ border: '1px solid #334155', borderRadius: 8, padding: 10 }}>
                    <div style={{ opacity: 0.72, fontSize: 12 }}>{label} Weekly</div>
                    <div style={{ fontSize: 20, fontWeight: 700 }}>{Math.round(progress || 0)} / {Math.round(target || 0)}</div>
                    <div style={{ marginTop: 6, height: 8, background: '#1f2937', borderRadius: 999 }}>
                      <div style={{ height: 8, width: `${Math.max(0, Math.min(100, Number(pct || 0)))}%`, background: '#16a34a', borderRadius: 999 }} />
                    </div>
                    <div style={{ opacity: 0.7, fontSize: 12, marginTop: 4 }}>{Math.round(pct || 0)}%</div>
                    <div style={{ opacity: 0.85, fontSize: 12, marginTop: 4 }}>Remaining: {remaining}</div>
                  </div>
                )
              })}
            </div>
          </section>

          <section style={{ background: '#121a33', borderRadius: 12, padding: 14, marginTop: 14 }}>
            <h2 style={{ marginTop: 0 }}>Today Remaining (Quick View)</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 8 }}>
              <div style={{ border: '1px solid #334155', borderRadius: 8, padding: 10 }}>
                <div style={{ opacity: 0.72, fontSize: 12 }}>BJJ Sessions Left</div>
                <div style={{ fontSize: 24, fontWeight: 700 }}>{Math.max(0, Math.round((data.weeklyHabits?.targets?.bjjSessions || 0) - (data.weeklyHabits?.progress?.bjjSessions || 0)))}</div>
              </div>
              <div style={{ border: '1px solid #334155', borderRadius: 8, padding: 10 }}>
                <div style={{ opacity: 0.72, fontSize: 12 }}>Push-ups Left</div>
                <div style={{ fontSize: 24, fontWeight: 700 }}>{Math.max(0, Math.round((data.weeklyHabits?.targets?.pushups || 0) - (data.weeklyHabits?.progress?.pushups || 0)))}</div>
              </div>
              <div style={{ border: '1px solid #334155', borderRadius: 8, padding: 10 }}>
                <div style={{ opacity: 0.72, fontSize: 12 }}>Rows Left</div>
                <div style={{ fontSize: 24, fontWeight: 700 }}>{Math.max(0, Math.round((data.weeklyHabits?.targets?.rows || 0) - (data.weeklyHabits?.progress?.rows || 0)))}</div>
              </div>
              <div style={{ border: '1px solid #334155', borderRadius: 8, padding: 10 }}>
                <div style={{ opacity: 0.72, fontSize: 12 }}>KB Swings Left</div>
                <div style={{ fontSize: 24, fontWeight: 700 }}>{Math.max(0, Math.round((data.weeklyHabits?.targets?.kbSwings || 0) - (data.weeklyHabits?.progress?.kbSwings || 0)))}</div>
              </div>
            </div>
          </section>

          <section style={{ background: '#121a33', borderRadius: 12, padding: 14, marginTop: 14 }}>
            <h2 style={{ marginTop: 0 }}>Log Training Habits</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0,1fr))', gap: 8 }}>
              <input value={habitEntry.label} onChange={(e) => setHabitEntry({ ...habitEntry, label: e.target.value })} placeholder='Label' style={{ background: '#0b1020', color: '#e8ecf3', border: '1px solid #334155', borderRadius: 6, padding: '8px 10px' }} />
              <input value={habitEntry.bjjSessions} onChange={(e) => setHabitEntry({ ...habitEntry, bjjSessions: e.target.value })} placeholder='BJJ sessions' style={{ background: '#0b1020', color: '#e8ecf3', border: '1px solid #334155', borderRadius: 6, padding: '8px 10px' }} />
              <input value={habitEntry.pushups} onChange={(e) => setHabitEntry({ ...habitEntry, pushups: e.target.value })} placeholder='Push-ups' style={{ background: '#0b1020', color: '#e8ecf3', border: '1px solid #334155', borderRadius: 6, padding: '8px 10px' }} />
              <input value={habitEntry.rows} onChange={(e) => setHabitEntry({ ...habitEntry, rows: e.target.value })} placeholder='Rows' style={{ background: '#0b1020', color: '#e8ecf3', border: '1px solid #334155', borderRadius: 6, padding: '8px 10px' }} />
              <input value={habitEntry.kbSwings} onChange={(e) => setHabitEntry({ ...habitEntry, kbSwings: e.target.value })} placeholder='KB swings' style={{ background: '#0b1020', color: '#e8ecf3', border: '1px solid #334155', borderRadius: 6, padding: '8px 10px' }} />
            </div>
            <textarea value={habitEntry.note} onChange={(e) => setHabitEntry({ ...habitEntry, note: e.target.value })} rows={2} placeholder='Optional note' style={{ width: '100%', marginTop: 8, background: '#0b1020', color: '#e8ecf3', border: '1px solid #334155', borderRadius: 6, padding: '8px 10px' }} />
            <button onClick={addHabitEntry} disabled={saving} style={{ marginTop: 8, background: '#2563eb', color: 'white', border: 0, borderRadius: 8, padding: '8px 12px', cursor: 'pointer' }}>{saving ? 'Saving…' : 'Add habit entry'}</button>
          </section>

          <section style={{ background: '#121a33', borderRadius: 12, padding: 14, marginTop: 14 }}>
            <h2 style={{ marginTop: 0 }}>Check-ins (4x/day)</h2>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[
                ['morning', 'Morning'],
                ['midday', 'Midday'],
                ['afternoon', 'Afternoon'],
                ['evening', 'Evening']
              ].map(([key, label]) => {
                const done = !!data.checkins?.[key]
                return (
                  <button
                    key={key}
                    onClick={() => updateMeta({ checkins: { [key]: !done } })}
                    style={{ background: done ? '#166534' : '#334155', color: 'white', border: 0, borderRadius: 8, padding: '8px 12px', cursor: 'pointer' }}
                  >
                    {done ? `✓ ${label}` : `Mark ${label}`}
                  </button>
                )
              })}
            </div>
          </section>

          <section style={{ background: '#121a33', borderRadius: 12, padding: 14, marginTop: 14 }}>
            <h2 style={{ marginTop: 0 }}>Log Meal / Snack</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 8 }}>
              <input value={entry.label} onChange={(e) => setEntry({ ...entry, label: e.target.value })} placeholder='Meal label (e.g., Post-BJJ)' style={{ background: '#0b1020', color: '#e8ecf3', border: '1px solid #334155', borderRadius: 6, padding: '8px 10px' }} />
              <input value={entry.protein} onChange={(e) => setEntry({ ...entry, protein: e.target.value })} placeholder='Protein (g)' style={{ background: '#0b1020', color: '#e8ecf3', border: '1px solid #334155', borderRadius: 6, padding: '8px 10px' }} />
              <input value={entry.carbs} onChange={(e) => setEntry({ ...entry, carbs: e.target.value })} placeholder='Carbs (g)' style={{ background: '#0b1020', color: '#e8ecf3', border: '1px solid #334155', borderRadius: 6, padding: '8px 10px' }} />
              <input value={entry.fats} onChange={(e) => setEntry({ ...entry, fats: e.target.value })} placeholder='Fats (g)' style={{ background: '#0b1020', color: '#e8ecf3', border: '1px solid #334155', borderRadius: 6, padding: '8px 10px' }} />
              <input value={entry.calories} onChange={(e) => setEntry({ ...entry, calories: e.target.value })} placeholder='Calories (optional)' style={{ background: '#0b1020', color: '#e8ecf3', border: '1px solid #334155', borderRadius: 6, padding: '8px 10px' }} />
              <input value={entry.items} onChange={(e) => setEntry({ ...entry, items: e.target.value })} placeholder='Foods eaten' style={{ gridColumn: 'span 3', background: '#0b1020', color: '#e8ecf3', border: '1px solid #334155', borderRadius: 6, padding: '8px 10px' }} />
            </div>
            <textarea value={entry.note} onChange={(e) => setEntry({ ...entry, note: e.target.value })} rows={2} placeholder='Notes (energy, soreness, hunger, glucose response, etc.)' style={{ width: '100%', marginTop: 8, background: '#0b1020', color: '#e8ecf3', border: '1px solid #334155', borderRadius: 6, padding: '8px 10px' }} />
            <button onClick={addEntry} disabled={saving} style={{ marginTop: 8, background: '#2563eb', color: 'white', border: 0, borderRadius: 8, padding: '8px 12px', cursor: 'pointer' }}>{saving ? 'Saving…' : 'Add meal/snack'}</button>
          </section>

          <section style={{ background: '#121a33', borderRadius: 12, padding: 14, marginTop: 14 }}>
            <h2 style={{ marginTop: 0 }}>Meal Log</h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', opacity: 0.9 }}>
                    <th>Time</th><th>Meal</th><th>Foods</th><th>P</th><th>C</th><th>F</th><th>Cal</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {(data.entries || []).map((r) => (
                    <tr key={r.id} style={{ borderTop: '1px solid #26314f' }}>
                      <td style={{ padding: '8px 6px' }}>{fmt(r.ts)}</td>
                      <td>{r.label || 'Meal'}</td>
                      <td style={{ maxWidth: 360 }}>{r.items || '—'}</td>
                      <td>{Math.round(r.protein || 0)}</td>
                      <td>{Math.round(r.carbs || 0)}</td>
                      <td>{Math.round(r.fats || 0)}</td>
                      <td>{Math.round(r.calories || 0)}</td>
                      <td>
                        <button onClick={() => postAction({ action: 'delete_entry', id: r.id })} style={{ background: '#7f1d1d', color: 'white', border: 0, borderRadius: 6, padding: '4px 8px', cursor: 'pointer' }}>Delete</button>
                      </td>
                    </tr>
                  ))}
                  {(data.entries || []).length === 0 && <tr><td colSpan={8} style={{ padding: 8, opacity: 0.75 }}>No meals logged yet for this day.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>

          <section style={{ background: '#121a33', borderRadius: 12, padding: 14, marginTop: 14 }}>
            <h2 style={{ marginTop: 0 }}>Supplements & Hydration</h2>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              {[
                ['creatine', 'Creatine 5g'],
                ['electrolytes', 'Electrolytes'],
                ['proteinShake', 'Protein shake'],
                ['magnesium', 'Magnesium (night)']
              ].map(([key, label]) => (
                <label key={key} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input type='checkbox' checked={!!data.supplements?.[key]} onChange={(e) => updateMeta({ supplements: { [key]: e.target.checked } })} />
                  {label}
                </label>
              ))}
              <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                Hydration (L)
                <input
                  value={data.supplements?.hydrationLiters ?? ''}
                  onChange={(e) => updateMeta({ supplements: { hydrationLiters: e.target.value } })}
                  style={{ width: 80, background: '#0b1020', color: '#e8ecf3', border: '1px solid #334155', borderRadius: 6, padding: '6px 8px' }}
                />
              </label>
            </div>
          </section>

          <section style={{ background: '#121a33', borderRadius: 12, padding: 14, marginTop: 14 }}>
            <h2 style={{ marginTop: 0 }}>Coaching Suggestions</h2>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {suggestions.map((s, i) => <li key={i} style={{ marginBottom: 6 }}>{s}</li>)}
            </ul>
          </section>

          <section style={{ background: '#121a33', borderRadius: 12, padding: 14, marginTop: 14 }}>
            <h2 style={{ marginTop: 0 }}>Feedback</h2>
            <textarea value={feedbackText} onChange={(e) => setFeedbackText(e.target.value)} rows={3} placeholder='Leave feedback (what worked, what to change, how check-ins should improve).' style={{ width: '100%', background: '#0b1020', color: '#e8ecf3', border: '1px solid #334155', borderRadius: 6, padding: '8px 10px' }} />
            <button onClick={addFeedback} disabled={saving} style={{ marginTop: 8, background: '#2563eb', color: 'white', border: 0, borderRadius: 8, padding: '8px 12px', cursor: 'pointer' }}>{saving ? 'Saving…' : 'Save feedback'}</button>
            <div style={{ marginTop: 10 }}>
              {(data.feedback || []).map((f) => (
                <div key={f.id} style={{ borderTop: '1px solid #26314f', padding: '8px 0' }}>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>{fmt(f.createdAtMs)}</div>
                  <div>{f.text}</div>
                </div>
              ))}
              {(data.feedback || []).length === 0 && <div style={{ opacity: 0.7 }}>No feedback yet.</div>}
            </div>
          </section>
        </>
      )}
    </main>
  )
}
