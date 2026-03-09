'use client'

import { Fragment, useEffect, useMemo, useState } from 'react'

const HORIZONS = ['All', 'Long-term', 'Monthly', 'Weekly', 'Daily']
const CATEGORIES = ['All', 'Day Job', 'Personal']
const STATUSES = ['Not Started', 'In Progress', 'Complete']

function fmt(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString()
}

function createRow() {
  return {
    id: `todo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    task: '',
    horizon: 'Weekly',
    category: 'Personal',
    status: 'Not Started',
    comments: '',
    dateAdded: Date.now(),
    dueDate: '',
    kanbanCardId: '',
    kanbanSentAtMs: null,
    completedAtMs: null
  }
}

function extractAttachmentPath(comments) {
  const text = String(comments || '')
  const match = text.match(/(\.\/media\/inbound\/[\w\-.]+\.(?:jpg|jpeg|png|webp|gif))/i)
  return match ? match[1] : ''
}

function hasSupportItems(comments) {
  return /\.\/media\/inbound\/[\w\-.]+\.(?:jpg|jpeg|png|webp|gif)/i.test(String(comments || ''))
}

export default function TodoListPage() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [updatedAtMs, setUpdatedAtMs] = useState(null)
  const [kanbanBusyByRow, setKanbanBusyByRow] = useState({})

  const [horizonFilter, setHorizonFilter] = useState('All')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [completedExpanded, setCompletedExpanded] = useState(false)

  async function load() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/todo-list', { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load todo list')
      setRows(Array.isArray(json.rows) ? json.rows : [])
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
      const res = await fetch('/api/todo-list', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to save todo list')
      setRows(Array.isArray(json.rows) ? json.rows : [])
      setUpdatedAtMs(json.updatedAtMs || null)
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function sendRowToKanban(row) {
    const rowId = String(row?.id || '')
    const title = String(row?.task || '').trim()
    if (!rowId || !title) return

    setKanbanBusyByRow((prev) => ({ ...prev, [rowId]: true }))
    setError('')
    try {
      const detailsParts = []
      detailsParts.push(`Source: To-Do List`)
      detailsParts.push(`Horizon: ${row?.horizon || 'Weekly'}`)
      detailsParts.push(`Category: ${row?.category || 'Personal'}`)
      detailsParts.push(`Status: ${row?.status || 'In Progress'}`)
      if (String(row?.comments || '').trim()) detailsParts.push(`Comments: ${String(row.comments).trim()}`)

      const res = await fetch('/api/kanban', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          owner: 'Joe',
          status: 'new',
          type: 'todo',
          priority: 'P2',
          sourceTodoId: rowId,
          details: detailsParts.join('\n')
        })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to create Kanban card')

      const cardId = String(json?.id || json?.card?.id || '')
      if (!cardId) throw new Error('Kanban card created but no card ID returned')
      const sentAt = Date.now()
      const nextRows = rows.map((r) => r.id === rowId ? { ...r, kanbanCardId: cardId, kanbanSentAtMs: sentAt } : r)
      setRows(nextRows)

      const saveRes = await fetch('/api/todo-list', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: nextRows })
      })
      const saveJson = await saveRes.json()
      if (saveRes.ok) setUpdatedAtMs(saveJson.updatedAtMs || sentAt)
    } catch (e) {
      setError(e.message)
    } finally {
      setKanbanBusyByRow((prev) => ({ ...prev, [rowId]: false }))
    }
  }

  useEffect(() => { load() }, [])

  async function persistRows(nextRows) {
    try {
      const res = await fetch('/api/todo-list', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: nextRows })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to save todo list')
      setRows(Array.isArray(json.rows) ? json.rows : nextRows)
      setUpdatedAtMs(json.updatedAtMs || null)
    } catch (e) {
      setError(e.message)
    }
  }

  function setRowStatus(rowId, nextStatus) {
    setRows((prev) => {
      const nextRows = prev.map((r) => {
        if (r.id !== rowId) return r
        if (nextStatus === 'Complete') return { ...r, status: nextStatus, completedAtMs: r.completedAtMs || Date.now() }
        return { ...r, status: nextStatus, completedAtMs: null }
      })
      void persistRows(nextRows)
      return nextRows
    })
  }

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      const horizonOk = horizonFilter === 'All' || r.horizon === horizonFilter
      const categoryOk = categoryFilter === 'All' || r.category === categoryFilter
      const statusOk = statusFilter === 'All' || r.status === statusFilter
      return horizonOk && categoryOk && statusOk
    })
  }, [rows, horizonFilter, categoryFilter, statusFilter])

  const activeRows = useMemo(() => filteredRows.filter((r) => r.status !== 'Complete'), [filteredRows])
  const completedRows = useMemo(() => {
    return filteredRows
      .filter((r) => r.status === 'Complete')
      .slice()
      .sort((a, b) => (Number(b.completedAtMs || 0) - Number(a.completedAtMs || 0)))
  }, [filteredRows])

  return (
    <main style={{ minHeight: '100vh', padding: 24, background: '#0b1020', color: '#e8ecf3', fontFamily: 'Inter, Segoe UI, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 30 }}>To-Do List</h1>
          <p style={{ margin: '6px 0 0', opacity: 0.8 }}>Standalone Mission Control page for daily/weekly/monthly/long-term tracking.</p>
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
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
          <strong style={{ marginRight: 4 }}>Filters:</strong>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ opacity: 0.8, fontSize: 13 }}>Horizon</span>
            <select value={horizonFilter} onChange={(e) => setHorizonFilter(e.target.value)} style={{ background: '#0b1020', color: '#e8ecf3', border: '1px solid #334155', borderRadius: 6, padding: '6px 8px' }}>
              {HORIZONS.map((h) => <option key={h} value={h}>{h}</option>)}
            </select>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ opacity: 0.8, fontSize: 13 }}>Category</span>
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} style={{ background: '#0b1020', color: '#e8ecf3', border: '1px solid #334155', borderRadius: 6, padding: '6px 8px' }}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ opacity: 0.8, fontSize: 13 }}>Status</span>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ background: '#0b1020', color: '#e8ecf3', border: '1px solid #334155', borderRadius: 6, padding: '6px 8px' }}>
              <option value='All'>All</option>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>

          <button onClick={() => { setHorizonFilter('All'); setCategoryFilter('All'); setStatusFilter('All') }} style={{ background: '#475569', color: 'white', border: 0, borderRadius: 6, padding: '6px 10px', cursor: 'pointer' }}>Clear Filters</button>

          <div style={{ marginLeft: 'auto', opacity: 0.75, fontSize: 12 }}>Showing {activeRows.length} active + {completedRows.length} completed (filtered from {rows.length})</div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 980 }}>
            <tbody>
              {activeRows.map((row) => {
                const idx = rows.findIndex((r) => r.id === row.id)
                return (
                  <Fragment key={row.id}>
                    <tr key={`${row.id}-minihead`} style={{ background: '#0a1124' }}>
                      <td colSpan={9} style={{ padding: '8px 6px 4px 6px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 1fr 1fr 1.3fr 1fr 1.4fr 1fr 1fr', gap: 8, fontSize: 11, opacity: 0.75, fontWeight: 600 }}>
                          <div>Task</div>
                          <div>Horizon</div>
                          <div>Category</div>
                          <div>Status</div>
                          <div>Date Added</div>
                          <div>Due</div>
                          <div>Kanban Status</div>
                          <div>Kanban</div>
                          <div>Row</div>
                        </div>
                      </td>
                    </tr>
                    <tr key={`${row.id}-main`} style={{ borderTop: '1px solid #3b4a6b', background: '#0f1730' }}>
                      <td style={{ minWidth: 320, padding: '8px 6px' }}>
                        <input
                          value={row.task || ''}
                          onChange={(e) => setRows((prev) => prev.map((r) => r.id === row.id ? { ...r, task: e.target.value } : r))}
                          placeholder='Enter todo item'
                          style={{ width: '100%', background: '#0b1020', color: '#e8ecf3', border: '1px solid #334155', borderRadius: 6, padding: '6px 8px' }}
                        />
                      </td>
                      <td><select value={row.horizon || 'Weekly'} onChange={(e) => setRows((prev) => prev.map((r) => r.id === row.id ? { ...r, horizon: e.target.value } : r))} style={{ background: '#0b1020', color: '#e8ecf3', border: '1px solid #334155', borderRadius: 6, padding: '6px 8px' }}>{HORIZONS.filter((h) => h !== 'All').map((h) => <option key={h} value={h}>{h}</option>)}</select></td>
                      <td><select value={row.category || 'Personal'} onChange={(e) => setRows((prev) => prev.map((r) => r.id === row.id ? { ...r, category: e.target.value } : r))} style={{ background: '#0b1020', color: '#e8ecf3', border: '1px solid #334155', borderRadius: 6, padding: '6px 8px' }}>{CATEGORIES.filter((c) => c !== 'All').map((c) => <option key={c} value={c}>{c}</option>)}</select></td>
                      <td><select value={row.status || 'Not Started'} onChange={(e) => setRowStatus(row.id, e.target.value)} style={{ background: '#0b1020', color: '#e8ecf3', border: '1px solid #334155', borderRadius: 6, padding: '6px 8px' }}>{STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</select></td>
                      <td style={{ minWidth: 160, fontSize: 13, opacity: 0.85 }}>{fmt(row.dateAdded)}</td>
                      <td style={{ minWidth: 135 }}>
                        <input type='date' value={row.dueDate || ''} onChange={(e) => setRows((prev) => prev.map((r) => r.id === row.id ? { ...r, dueDate: e.target.value } : r))} style={{ width: '100%', background: '#0b1020', color: '#e8ecf3', border: '1px solid #334155', borderRadius: 6, padding: '6px 8px' }} />
                      </td>
                      <td style={{ minWidth: 170, fontSize: 12 }}>
                        {row.kanbanCardId ? (
                          <div style={{ display: 'grid', gap: 2 }}>
                            <span style={{ background: '#14532d', color: '#dcfce7', borderRadius: 999, padding: '2px 8px', width: 'fit-content' }}>Sent</span>
                            <span style={{ opacity: 0.75 }}>Card: {row.kanbanCardId}</span>
                            <span style={{ opacity: 0.65 }}>{fmt(row.kanbanSentAtMs)}</span>
                          </div>
                        ) : (
                          <span style={{ background: '#334155', color: '#e2e8f0', borderRadius: 999, padding: '2px 8px', width: 'fit-content', display: 'inline-block' }}>Not sent</span>
                        )}
                      </td>
                      <td>
                        <button onClick={() => sendRowToKanban(row)} disabled={!String(row.task || '').trim() || !!kanbanBusyByRow[row.id]} style={{ background: '#7c3aed', color: 'white', border: 0, borderRadius: 6, padding: '6px 8px', cursor: 'pointer', opacity: !String(row.task || '').trim() || !!kanbanBusyByRow[row.id] ? 0.6 : 1 }}>
                          {!!kanbanBusyByRow[row.id] ? 'Sending…' : (row.kanbanCardId ? 'Send Again' : 'Send to Kanban')}
                        </button>
                      </td>
                      <td>
                        <button onClick={() => setRows((prev) => prev.filter((r) => r.id !== row.id))} style={{ background: '#7f1d1d', color: 'white', border: 0, borderRadius: 6, padding: '6px 8px', cursor: 'pointer' }}>Delete</button>
                        <button disabled={idx <= 0} onClick={() => { if (idx <= 0) return; setRows((prev) => { const next = [...prev]; [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]; return next }) }} style={{ marginLeft: 6, background: '#334155', color: 'white', border: 0, borderRadius: 6, padding: '6px 8px', cursor: 'pointer', opacity: idx <= 0 ? 0.5 : 1 }}>↑</button>
                        <button disabled={idx < 0 || idx >= rows.length - 1} onClick={() => { if (idx < 0 || idx >= rows.length - 1) return; setRows((prev) => { const next = [...prev]; [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]; return next }) }} style={{ marginLeft: 4, background: '#334155', color: 'white', border: 0, borderRadius: 6, padding: '6px 8px', cursor: 'pointer', opacity: idx < 0 || idx >= rows.length - 1 ? 0.5 : 1 }}>↓</button>
                      </td>
                    </tr>
                    <tr key={`${row.id}-notes`} style={{ background: '#0c1428', borderBottom: '1px solid #3b4a6b' }}>
                      <td colSpan={9} style={{ padding: '8px 6px 12px 6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 11, background: '#1e293b', color: '#cbd5e1', borderRadius: 999, padding: '2px 8px' }}>Task {idx + 1}</span>
                          <span style={{ fontSize: 12, opacity: 0.8, fontWeight: 600 }}>Comments</span>
                        </div>
                        <textarea
                          rows={2}
                          value={row.comments || ''}
                          onChange={(e) => setRows((prev) => prev.map((r) => r.id === row.id ? { ...r, comments: e.target.value } : r))}
                          placeholder='Notes/comments'
                          style={{ width: '100%', background: '#0b1020', color: '#e8ecf3', border: '1px solid #334155', borderRadius: 6, padding: '6px 8px' }}
                        />
                        {extractAttachmentPath(row.comments) && (
                          <div style={{ marginTop: 6, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                            <a
                              href={`/api/attachment?path=${encodeURIComponent(extractAttachmentPath(row.comments))}`}
                              target='_blank'
                              rel='noreferrer'
                              style={{ color: '#93c5fd', fontSize: 12, textDecoration: 'underline' }}
                            >
                              Open attachment
                            </a>
                            {hasSupportItems(row.comments) && (
                              <a
                                href={`/api/todo-support?id=${encodeURIComponent(row.id)}`}
                                target='_blank'
                                rel='noreferrer'
                                style={{ color: '#a7f3d0', fontSize: 12, textDecoration: 'underline' }}
                              >
                                Open support folder
                              </a>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                    <tr key={`${row.id}-sep`}>
                      <td colSpan={9} style={{ padding: '0 6px 8px 6px', background: '#121a33' }}>
                        <div style={{ height: 8, borderRadius: 6, background: '#1f2a44', opacity: 0.8 }} />
                      </td>
                    </tr>
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
          <button onClick={() => setRows((prev) => [...prev, createRow()])} style={{ background: '#1d4ed8', color: 'white', border: 0, borderRadius: 8, padding: '8px 12px', cursor: 'pointer' }}>+ Add Row</button>
          <button onClick={save} disabled={saving} style={{ background: '#16a34a', color: 'white', border: 0, borderRadius: 8, padding: '8px 12px', cursor: 'pointer' }}>{saving ? 'Saving…' : 'Save Changes'}</button>
        </div>

        <section style={{ marginTop: 12, border: '1px solid #334155', borderRadius: 10, padding: 10, background: '#0c1428' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <div style={{ fontWeight: 700 }}>Completed ({completedRows.length})</div>
            <button onClick={() => setCompletedExpanded((v) => !v)} style={{ background: '#334155', color: 'white', border: 0, borderRadius: 6, padding: '4px 8px', cursor: 'pointer' }}>
              {completedExpanded ? 'Collapse' : 'Expand'}
            </button>
          </div>
          {completedExpanded && (
            <div style={{ marginTop: 8, display: 'grid', gap: 10 }}>
              {completedRows.map((row) => {
                const idx = rows.findIndex((r) => r.id === row.id)
                return (
                  <div key={`${row.id}-completed`} style={{ border: '1px solid #334155', borderRadius: 10, padding: 10, background: '#0b1020' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 1fr 1fr 1.3fr 1fr 1.4fr', gap: 8, fontSize: 11, opacity: 0.75, fontWeight: 600, marginBottom: 6 }}>
                      <div>Task</div>
                      <div>Horizon</div>
                      <div>Category</div>
                      <div>Status</div>
                      <div>Date Added</div>
                      <div>Due</div>
                      <div>Kanban Status</div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 1fr 1fr 1.3fr 1fr 1.4fr', gap: 8, alignItems: 'start' }}>
                      <div style={{ minWidth: 260, fontWeight: 600 }}>{row.task || '(untitled task)'}</div>
                      <div>{row.horizon || 'Weekly'}</div>
                      <div>{row.category || 'Personal'}</div>
                      <div>
                        <span style={{ background: '#14532d', color: '#dcfce7', borderRadius: 999, padding: '2px 8px', width: 'fit-content', display: 'inline-block' }}>
                          {row.status || 'Complete'}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, opacity: 0.85 }}>{fmt(row.dateAdded)}</div>
                      <div style={{ fontSize: 13 }}>{row.dueDate || '—'}</div>
                      <div style={{ minWidth: 160, fontSize: 12 }}>
                        {row.kanbanCardId ? (
                          <div style={{ display: 'grid', gap: 2 }}>
                            <span style={{ background: '#14532d', color: '#dcfce7', borderRadius: 999, padding: '2px 8px', width: 'fit-content' }}>Sent</span>
                            <span style={{ opacity: 0.75 }}>Card: {row.kanbanCardId}</span>
                            <span style={{ opacity: 0.65 }}>{fmt(row.kanbanSentAtMs)}</span>
                          </div>
                        ) : (
                          <span style={{ background: '#334155', color: '#e2e8f0', borderRadius: 999, padding: '2px 8px', width: 'fit-content', display: 'inline-block' }}>Not sent</span>
                        )}
                      </div>
                    </div>

                    <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, background: '#1e293b', color: '#cbd5e1', borderRadius: 999, padding: '2px 8px' }}>Task {idx + 1}</span>
                      <span style={{ fontSize: 12, opacity: 0.75 }}>Completed: {fmt(row.completedAtMs)}</span>
                      <button
                        onClick={() => setRowStatus(row.id, 'In Progress')}
                        style={{ marginLeft: 'auto', background: '#1d4ed8', color: 'white', border: 0, borderRadius: 6, padding: '6px 8px', cursor: 'pointer' }}
                      >
                        Reopen
                      </button>
                    </div>

                    <div style={{ marginTop: 6 }}>
                      <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4, fontWeight: 600 }}>Comments</div>
                      <div style={{ background: '#0f1730', border: '1px solid #334155', borderRadius: 6, padding: '8px 10px', minHeight: 36, whiteSpace: 'pre-wrap' }}>
                        {row.comments ? row.comments : <span style={{ opacity: 0.6 }}>No comments</span>}
                      </div>
                      {extractAttachmentPath(row.comments) && (
                        <div style={{ marginTop: 6, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                          <a
                            href={`/api/attachment?path=${encodeURIComponent(extractAttachmentPath(row.comments))}`}
                            target='_blank'
                            rel='noreferrer'
                            style={{ color: '#93c5fd', fontSize: 12, textDecoration: 'underline' }}
                          >
                            Open attachment
                          </a>
                          {hasSupportItems(row.comments) && (
                            <a
                              href={`/api/todo-support?id=${encodeURIComponent(row.id)}`}
                              target='_blank'
                              rel='noreferrer'
                              style={{ color: '#a7f3d0', fontSize: 12, textDecoration: 'underline' }}
                            >
                              Open support folder
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
              {completedRows.length === 0 && <div style={{ opacity: 0.7 }}>No completed items in current filter.</div>}
            </div>
          )}
        </section>

        {!loading && rows.length === 0 && (
          <div style={{ marginTop: 12, opacity: 0.75 }}>No to-do items yet. Add your first row.</div>
        )}
        {!loading && rows.length > 0 && activeRows.length === 0 && (
          <div style={{ marginTop: 12, opacity: 0.75 }}>No active items in current filter.</div>
        )}
      </section>
    </main>
  )
}
