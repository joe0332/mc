'use client'

import { useEffect, useState } from 'react'

function fmt(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString()
}

export default function RecipesPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/recipes', { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load recipes')
      setData(json)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  return (
    <main style={{ minHeight: '100vh', padding: 24, background: '#0b1020', color: '#e8ecf3', fontFamily: 'Inter, Segoe UI, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 30 }}>Recipes</h1>
          <p style={{ margin: '6px 0 0', opacity: 0.8 }}>Saved meals and recipe cards in one place.</p>
          <div style={{ marginTop: 6, opacity: 0.72, fontSize: 13 }}>Last update: {fmt(data?.updatedAtMs)}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <a href='/' style={{ background: '#334155', color: 'white', textDecoration: 'none', borderRadius: 8, padding: '10px 14px' }}>Back to Mission Control</a>
          <button onClick={load} style={{ background: '#2563eb', color: 'white', border: 0, borderRadius: 8, padding: '10px 14px', cursor: 'pointer' }}>Refresh</button>
        </div>
      </div>

      {error && <div style={{ background: '#7f1d1d', padding: 10, borderRadius: 8, marginTop: 12 }}>Error: {error}</div>}
      {loading && <div style={{ marginTop: 14 }}>Loading…</div>}

      {data && (
        <section style={{ background: '#121a33', borderRadius: 12, padding: 14, marginTop: 14 }}>
          <h2 style={{ marginTop: 0 }}>Recipe Library ({data.metrics?.total ?? 0})</h2>
          {(data.rows || []).map((r) => (
            <div key={r.file} style={{ borderTop: '1px solid #26314f', padding: '10px 0' }}>
              <div style={{ fontWeight: 700 }}>{r.title}</div>
              <div style={{ opacity: 0.75, fontSize: 12 }}>{r.relPath} · updated {fmt(r.updatedAtMs)}</div>
              {r.summary && <div style={{ marginTop: 4, opacity: 0.85 }}>{r.summary}</div>}
              <pre style={{ whiteSpace: 'pre-wrap', background: '#0b1020', borderRadius: 8, padding: 10, marginTop: 8, fontSize: 13 }}>{r.content}</pre>
            </div>
          ))}
          {(!data.rows || data.rows.length === 0) && <div style={{ opacity: 0.7 }}>No recipes yet.</div>}
        </section>
      )}
    </main>
  )
}
