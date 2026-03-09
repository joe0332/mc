'use client'

import { useEffect, useState } from 'react'

function fmt(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString()
}

export default function DateNightPlacesPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/date-night-places', { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load date-night places')
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
          <h1 style={{ margin: 0, fontSize: 30 }}>Date Night Places</h1>
          <p style={{ margin: '6px 0 0', opacity: 0.8 }}>Master list with best-guess addresses, vibe, and tracking columns.</p>
          <div style={{ marginTop: 6, opacity: 0.72, fontSize: 13 }}>Last CSV update: {fmt(data?.updatedAtMs)}</div>
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
            <h2 style={{ marginTop: 0 }}>Snapshot</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8 }}>
              <div style={{ border: '1px solid #334155', borderRadius: 8, padding: 10 }}><div style={{ opacity: 0.72, fontSize: 12 }}>Total Places</div><div style={{ fontSize: 24, fontWeight: 700 }}>{data.metrics?.total ?? 0}</div></div>
              <div style={{ border: '1px solid #334155', borderRadius: 8, padding: 10 }}><div style={{ opacity: 0.72, fontSize: 12 }}>Restaurants</div><div style={{ fontSize: 24, fontWeight: 700 }}>{data.metrics?.restaurants ?? 0}</div></div>
              <div style={{ border: '1px solid #334155', borderRadius: 8, padding: 10 }}><div style={{ opacity: 0.72, fontSize: 12 }}>Bars</div><div style={{ fontSize: 24, fontWeight: 700 }}>{data.metrics?.bars ?? 0}</div></div>
              <div style={{ border: '1px solid #334155', borderRadius: 8, padding: 10 }}><div style={{ opacity: 0.72, fontSize: 12 }}>High Priority</div><div style={{ fontSize: 24, fontWeight: 700 }}>{data.metrics?.highPriority ?? 0}</div></div>
            </div>
          </section>

          <section style={{ background: '#121a33', borderRadius: 12, padding: 14, marginTop: 14 }}>
            <h2 style={{ marginTop: 0 }}>Date Night Tracker</h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1400 }}>
                <thead>
                  <tr style={{ textAlign: 'left', opacity: 0.9 }}>
                    <th>Name</th>
                    <th>City</th>
                    <th>Category</th>
                    <th>Address (best guess)</th>
                    <th>Food Type</th>
                    <th>Vibe</th>
                    <th>Priority</th>
                    <th>Been?</th>
                    <th>Liked?</th>
                    <th>Comments</th>
                    <th>Reservation Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.rows || []).map((r, i) => (
                    <tr key={`${r.name}-${i}`} style={{ borderTop: '1px solid #26314f' }}>
                      <td style={{ padding: '8px 6px' }}>{r.name || '—'}</td>
                      <td>{r.city || '—'}</td>
                      <td>{r.category || '—'}</td>
                      <td style={{ maxWidth: 260 }}>{r.address_guess || '—'}</td>
                      <td>{r.food_type_short || '—'}</td>
                      <td>{r.vibe || '—'}</td>
                      <td>{r.priority || '—'}</td>
                      <td>{r.been || ''}</td>
                      <td>{r.liked || ''}</td>
                      <td style={{ maxWidth: 260 }}>{r.misc_comments || ''}</td>
                      <td style={{ maxWidth: 300 }}>{r.reservation_notes || ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </main>
  )
}
