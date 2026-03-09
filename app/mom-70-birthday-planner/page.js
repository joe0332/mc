'use client'

import { useEffect, useMemo, useState } from 'react'

const INTEREST_OPTIONS = [1, 2, 3, 4, 5]
const CATEGORY_OPTIONS = ['Food', 'Brewery-Bar', 'Walk', 'Falls', 'Coffee', 'Shops']

function fmt(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString()
}

function createRow() {
  return {
    id: `mom70-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    category: 'Food',
    name: '',
    shortDescription: '',
    links: [''],
    interest: 3,
    location: '',
    distanceFromAirbnb: '',
    comments: ''
  }
}

function sanitizeLinks(links) {
  return (Array.isArray(links) ? links : []).map((x) => String(x || '').trim())
}

export default function Mom70BirthdayPlannerPage() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [updatedAtMs, setUpdatedAtMs] = useState(null)
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [categoryFilterMode, setCategoryFilterMode] = useState('include')
  const [interestFilter, setInterestFilter] = useState('All')

  async function load() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/mom-70-birthday-planner', { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load birthday planner')
      const normalized = (Array.isArray(json.rows) ? json.rows : []).map((r) => ({ ...r, links: sanitizeLinks(r.links).length ? sanitizeLinks(r.links) : [''] }))
      setRows(normalized)
      setUpdatedAtMs(json.updatedAtMs || null)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function save() {
    setSaving(true)
    setError('')
    try {
      const payloadRows = rows.map((r) => ({ ...r, links: sanitizeLinks(r.links).filter(Boolean) }))
      const res = await fetch('/api/mom-70-birthday-planner', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: payloadRows })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to save birthday planner')
      const normalized = (Array.isArray(json.rows) ? json.rows : []).map((r) => ({ ...r, links: sanitizeLinks(r.links).length ? sanitizeLinks(r.links) : [''] }))
      setRows(normalized)
      setUpdatedAtMs(json.updatedAtMs || null)
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => { load() }, [])

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const categoryOk = categoryFilter === 'All'
        ? true
        : categoryFilterMode === 'exclude'
          ? row.category !== categoryFilter
          : row.category === categoryFilter
      const interestOk = interestFilter === 'All' || Number(row.interest) === Number(interestFilter)
      return categoryOk && interestOk
    })
  }, [rows, categoryFilter, categoryFilterMode, interestFilter])

  function updateRow(rowId, patch) {
    setRows((prev) => prev.map((r) => (r.id === rowId ? { ...r, ...patch } : r)))
  }

  function addLink(rowId) {
    setRows((prev) => prev.map((r) => (r.id === rowId ? { ...r, links: [...sanitizeLinks(r.links), ''] } : r)))
  }

  function updateLink(rowId, idx, value) {
    setRows((prev) => prev.map((r) => {
      if (r.id !== rowId) return r
      const next = [...sanitizeLinks(r.links)]
      next[idx] = value
      return { ...r, links: next }
    }))
  }

  function removeLink(rowId, idx) {
    setRows((prev) => prev.map((r) => {
      if (r.id !== rowId) return r
      const next = [...sanitizeLinks(r.links)]
      next.splice(idx, 1)
      return { ...r, links: next.length ? next : [''] }
    }))
  }

  return (
    <main style={{ minHeight: '100vh', padding: 24, background: '#0b1020', color: '#e8ecf3', fontFamily: 'Inter, Segoe UI, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 30 }}>Mom’s 70th Birthday Planner</h1>
          <p style={{ margin: '6px 0 0', opacity: 0.8 }}>Each row is a candidate restaurant or activity. Use category + interest filters to shortlist quickly.</p>
          <div style={{ marginTop: 6, opacity: 0.72, fontSize: 13 }}>Last saved: {fmt(updatedAtMs)}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <a href='/' style={{ background: '#334155', color: 'white', textDecoration: 'none', borderRadius: 8, padding: '10px 14px' }}>Back to Mission Control</a>
          <button onClick={load} disabled={loading} style={{ background: '#1d4ed8', color: 'white', border: 0, borderRadius: 8, padding: '10px 14px', cursor: 'pointer' }}>{loading ? 'Loading…' : 'Refresh'}</button>
          <button onClick={save} disabled={saving} style={{ background: '#16a34a', color: 'white', border: 0, borderRadius: 8, padding: '10px 14px', cursor: 'pointer' }}>{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </div>

      {error && <div style={{ background: '#7f1d1d', padding: 10, borderRadius: 8, marginTop: 12 }}>Error: {error}</div>}

      <section style={{ background: '#121a33', borderRadius: 12, padding: 14, marginTop: 14 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
          <strong style={{ marginRight: 4 }}>Filters:</strong>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ opacity: 0.8, fontSize: 13 }}>Category</span>
            <select value={categoryFilterMode} onChange={(e) => setCategoryFilterMode(e.target.value)} style={{ background: '#0b1020', color: '#e8ecf3', border: '1px solid #334155', borderRadius: 6, padding: '6px 8px' }}>
              <option value='include'>Include</option>
              <option value='exclude'>Exclude</option>
            </select>
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} style={{ background: '#0b1020', color: '#e8ecf3', border: '1px solid #334155', borderRadius: 6, padding: '6px 8px' }}>
              <option value='All'>All</option>
              {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ opacity: 0.8, fontSize: 13 }}>Interest</span>
            <select value={interestFilter} onChange={(e) => setInterestFilter(e.target.value)} style={{ background: '#0b1020', color: '#e8ecf3', border: '1px solid #334155', borderRadius: 6, padding: '6px 8px' }}>
              <option value='All'>All</option>
              {INTEREST_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>

          <button onClick={() => { setCategoryFilter('All'); setCategoryFilterMode('include'); setInterestFilter('All') }} style={{ background: '#475569', color: 'white', border: 0, borderRadius: 6, padding: '6px 10px', cursor: 'pointer' }}>Clear Filters</button>
          <div style={{ marginLeft: 'auto', opacity: 0.75, fontSize: 12 }}>Showing {filteredRows.length} of {rows.length} rows</div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1600 }}>
            <thead>
              <tr style={{ textAlign: 'left', opacity: 0.9 }}>
                <th style={{ padding: '8px 6px' }}>Category</th>
                <th style={{ padding: '8px 6px' }}>Name</th>
                <th>Short Description</th>
                <th>Website Links</th>
                <th>Interest (1-5)</th>
                <th>Location</th>
                <th>Distance from Airbnb</th>
                <th>Comments</th>
                <th>Row</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr key={row.id} style={{ borderTop: '1px solid #26314f' }}>
                  <td style={{ padding: '12px 6px', minWidth: 140, verticalAlign: 'top' }}>
                    <select value={row.category || 'Food'} onChange={(e) => updateRow(row.id, { category: e.target.value })} style={{ width: '100%', background: '#0b1020', color: '#e8ecf3', border: '1px solid #334155', borderRadius: 6, padding: '6px 8px' }}>
                      {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </td>
                  <td style={{ minWidth: 220, padding: '12px 6px', verticalAlign: 'top' }}>
                    <input value={row.name || ''} onChange={(e) => updateRow(row.id, { name: e.target.value })} placeholder='Name' style={{ width: '100%', background: '#0b1020', color: '#e8ecf3', border: '1px solid #334155', borderRadius: 6, padding: '6px 8px' }} />
                  </td>
                  <td style={{ minWidth: 260, padding: '12px 6px', verticalAlign: 'top' }}>
                    <textarea rows={2} value={row.shortDescription || ''} onChange={(e) => updateRow(row.id, { shortDescription: e.target.value })} placeholder='Short description' style={{ width: '100%', background: '#0b1020', color: '#e8ecf3', border: '1px solid #334155', borderRadius: 6, padding: '6px 8px' }} />
                  </td>
                  <td style={{ minWidth: 320, padding: '12px 6px', verticalAlign: 'top' }}>
                    <div style={{ display: 'grid', gap: 6 }}>
                      {sanitizeLinks(row.links).map((link, idx) => (
                        <div key={`${row.id}-link-${idx}`} style={{ display: 'flex', gap: 6 }}>
                          <input
                            value={link}
                            onChange={(e) => updateLink(row.id, idx, e.target.value)}
                            placeholder='https://example.com'
                            style={{ flex: 1, background: '#0b1020', color: '#e8ecf3', border: '1px solid #334155', borderRadius: 6, padding: '6px 8px' }}
                          />
                          <button onClick={() => removeLink(row.id, idx)} style={{ background: '#7f1d1d', color: 'white', border: 0, borderRadius: 6, padding: '6px 8px', cursor: 'pointer' }}>–</button>
                        </div>
                      ))}
                      <button onClick={() => addLink(row.id)} style={{ background: '#1d4ed8', color: 'white', border: 0, borderRadius: 6, padding: '6px 8px', cursor: 'pointer', width: 'fit-content' }}>+ Add link</button>
                    </div>
                  </td>
                  <td style={{ padding: '12px 6px', verticalAlign: 'top' }}>
                    <select value={Number(row.interest || 3)} onChange={(e) => updateRow(row.id, { interest: Number(e.target.value) })} style={{ background: '#0b1020', color: '#e8ecf3', border: '1px solid #334155', borderRadius: 6, padding: '6px 8px' }}>
                      {INTEREST_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </td>
                  <td style={{ minWidth: 180, padding: '12px 6px', verticalAlign: 'top' }}>
                    <input value={row.location || ''} onChange={(e) => updateRow(row.id, { location: e.target.value })} placeholder='Location' style={{ width: '100%', background: '#0b1020', color: '#e8ecf3', border: '1px solid #334155', borderRadius: 6, padding: '6px 8px' }} />
                  </td>
                  <td style={{ minWidth: 220, padding: '12px 6px', verticalAlign: 'top' }}>
                    <input value={row.distanceFromAirbnb || ''} onChange={(e) => updateRow(row.id, { distanceFromAirbnb: e.target.value })} placeholder='Distance/time estimate' style={{ width: '100%', background: '#0b1020', color: '#e8ecf3', border: '1px solid #334155', borderRadius: 6, padding: '6px 8px' }} />
                  </td>
                  <td style={{ minWidth: 260, padding: '12px 6px', verticalAlign: 'top' }}>
                    <textarea rows={2} value={row.comments || ''} onChange={(e) => updateRow(row.id, { comments: e.target.value })} placeholder='Comments' style={{ width: '100%', background: '#0b1020', color: '#e8ecf3', border: '1px solid #334155', borderRadius: 6, padding: '6px 8px' }} />
                  </td>
                  <td style={{ padding: '12px 6px', verticalAlign: 'top' }}>
                    <button onClick={() => setRows((prev) => prev.filter((r) => r.id !== row.id))} style={{ background: '#7f1d1d', color: 'white', border: 0, borderRadius: 6, padding: '6px 8px', cursor: 'pointer' }}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
          <button onClick={() => setRows((prev) => [...prev, createRow()])} style={{ background: '#1d4ed8', color: 'white', border: 0, borderRadius: 8, padding: '8px 12px', cursor: 'pointer' }}>+ Add Row</button>
          <button onClick={save} disabled={saving} style={{ background: '#16a34a', color: 'white', border: 0, borderRadius: 8, padding: '8px 12px', cursor: 'pointer' }}>{saving ? 'Saving…' : 'Save Changes'}</button>
        </div>

        {!loading && rows.length === 0 && <div style={{ marginTop: 12, opacity: 0.75 }}>No rows yet. Add your first option.</div>}
        {!loading && rows.length > 0 && filteredRows.length === 0 && <div style={{ marginTop: 12, opacity: 0.75 }}>No rows match current filters.</div>}
      </section>
    </main>
  )
}
