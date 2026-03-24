'use client'

import { useEffect, useMemo, useState } from 'react'

const EMPTY_FORM = {
  title: '',
  category: 'other',
  status: 'idea',
  priority: 'P2',
  owner: '',
  summary: '',
  notes: '',
  supportLinksText: '',
  supportFilesText: '',
  relatedRoute: '',
  relatedComponent: '',
  nextStep: ''
}

function prettyLabel(value = '') {
  return String(value).replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase())
}

function normalizeLines(text = '') {
  return String(text)
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean)
}

function makeEmptyCreateForm() {
  return { ...EMPTY_FORM, owner: 'Joe' }
}

export default function OpenClawEnhancementsPage() {
  const [data, setData] = useState({ enhancements: [], categories: [], statuses: [], priorities: [], updatedAt: null })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandedId, setExpandedId] = useState('')
  const [savingId, setSavingId] = useState('')
  const [uploadingId, setUploadingId] = useState('')
  const [forms, setForms] = useState({})
  const [createForm, setCreateForm] = useState(makeEmptyCreateForm())
  const [showCreate, setShowCreate] = useState(false)
  const [filters, setFilters] = useState({ category: 'all', status: 'all', priority: 'all', sort: 'priority' })

  async function load(preferredExpandedId = '') {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/openclaw-enhancements', { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load enhancements')
      setData(json)
      const nextForms = {}
      for (const item of json.enhancements || []) {
        nextForms[item.id] = toForm(item)
      }
      setForms(nextForms)
      const candidate = preferredExpandedId || expandedId || json.enhancements?.[0]?.id || ''
      setExpandedId(candidate)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  function toForm(item) {
    return {
      title: item.title || '',
      category: item.category || 'other',
      status: item.status || 'idea',
      priority: item.priority || 'P2',
      owner: item.owner || '',
      summary: item.summary || '',
      notes: item.notes || '',
      supportLinksText: (item.supportLinks || []).join('\n'),
      supportFilesText: (item.supportFiles || []).join('\n'),
      relatedRoute: item.relatedRoute || '',
      relatedComponent: item.relatedComponent || '',
      nextStep: item.nextStep || ''
    }
  }

  function updateForm(id, patch) {
    setForms((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] || EMPTY_FORM),
        ...patch
      }
    }))
  }

  async function saveItem(id) {
    const form = forms[id]
    if (!form) return
    setSavingId(id)
    setError('')
    try {
      const payload = {
        id,
        title: form.title,
        category: form.category,
        status: form.status,
        priority: form.priority,
        owner: form.owner,
        summary: form.summary,
        notes: form.notes,
        supportLinks: normalizeLines(form.supportLinksText),
        supportFiles: normalizeLines(form.supportFilesText),
        relatedRoute: form.relatedRoute,
        relatedComponent: form.relatedComponent,
        nextStep: form.nextStep
      }
      const res = await fetch('/api/openclaw-enhancements', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to save enhancement')
      setData((prev) => ({
        ...prev,
        updatedAt: json.saved?.updatedAt || prev.updatedAt,
        enhancements: (prev.enhancements || []).map((item) => item.id === id ? json.saved : item)
      }))
      setForms((prev) => ({ ...prev, [id]: toForm(json.saved) }))
    } catch (e) {
      setError(e.message)
    } finally {
      setSavingId('')
    }
  }

  async function createItem() {
    setSavingId('create')
    setError('')
    try {
      const payload = {
        title: createForm.title,
        category: createForm.category,
        status: createForm.status,
        priority: createForm.priority,
        owner: createForm.owner,
        summary: createForm.summary,
        notes: createForm.notes,
        supportLinks: normalizeLines(createForm.supportLinksText),
        supportFiles: normalizeLines(createForm.supportFilesText),
        relatedRoute: createForm.relatedRoute,
        relatedComponent: createForm.relatedComponent,
        nextStep: createForm.nextStep
      }
      const res = await fetch('/api/openclaw-enhancements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to create enhancement')
      const created = json.created
      setCreateForm(makeEmptyCreateForm())
      setShowCreate(false)
      await load(created?.id || '')
    } catch (e) {
      setError(e.message)
    } finally {
      setSavingId('')
    }
  }

  async function uploadFile(id, file) {
    if (!file) return
    setUploadingId(id)
    setError('')
    try {
      const form = new FormData()
      form.append('id', id)
      form.append('file', file)
      const res = await fetch('/api/openclaw-enhancements', { method: 'POST', body: form })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to upload file')
      setData((prev) => ({
        ...prev,
        updatedAt: json.enhancement?.updatedAt || prev.updatedAt,
        enhancements: (prev.enhancements || []).map((item) => item.id === id ? json.enhancement : item)
      }))
      setForms((prev) => ({ ...prev, [id]: toForm(json.enhancement) }))
    } catch (e) {
      setError(e.message)
    } finally {
      setUploadingId('')
    }
  }

  const stats = useMemo(() => {
    const enhancements = data.enhancements || []
    return {
      total: enhancements.length,
      active: enhancements.filter((x) => ['idea', 'researching', 'ready', 'in_progress', 'blocked'].includes(x.status)).length,
      browser: enhancements.filter((x) => x.category === 'browser').length,
      shipped: enhancements.filter((x) => x.status === 'shipped').length
    }
  }, [data])

  const visibleEnhancements = useMemo(() => {
    let rows = [...(data.enhancements || [])]
    if (filters.category !== 'all') rows = rows.filter((x) => x.category === filters.category)
    if (filters.status !== 'all') rows = rows.filter((x) => x.status === filters.status)
    if (filters.priority !== 'all') rows = rows.filter((x) => x.priority === filters.priority)

    if (filters.sort === 'updated') {
      rows.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime())
    } else if (filters.sort === 'title') {
      rows.sort((a, b) => String(a.title || '').localeCompare(String(b.title || '')))
    }
    return rows
  }, [data, filters])

  return (
    <main style={{ minHeight: '100vh', padding: 24, background: '#0b1020', color: '#e8ecf3', fontFamily: 'Inter, Segoe UI, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 30 }}>OpenClaw Enhancements</h1>
          <p style={{ margin: '6px 0 0', opacity: 0.82 }}>Structured tracker for potential enhancements — one idea per record, with notes, support links/files, ownership, and next steps.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <a href='/' style={{ background: '#334155', color: 'white', textDecoration: 'none', borderRadius: 8, padding: '10px 14px' }}>Back to Mission Control</a>
          <button onClick={() => setShowCreate((v) => !v)} style={{ background: '#0f766e', color: 'white', border: 0, borderRadius: 8, padding: '10px 14px', cursor: 'pointer' }}>{showCreate ? 'Hide New Enhancement' : 'New Enhancement'}</button>
          <button onClick={() => load()} style={{ background: '#2563eb', color: 'white', border: 0, borderRadius: 8, padding: '10px 14px', cursor: 'pointer' }}>Refresh</button>
        </div>
      </div>

      {error && <div style={{ background: '#7f1d1d', padding: 10, borderRadius: 8, marginTop: 12 }}>Error: {error}</div>}

      <section style={{ background: '#121a33', borderRadius: 12, padding: 14, marginTop: 14 }}>
        <h2 style={{ marginTop: 0 }}>Snapshot</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 8 }}>
          <div style={statCard}><div style={statLabel}>Total Enhancements</div><div style={statValue}>{stats.total}</div></div>
          <div style={statCard}><div style={statLabel}>Active Pipeline</div><div style={statValue}>{stats.active}</div></div>
          <div style={statCard}><div style={statLabel}>Browser Ideas</div><div style={statValue}>{stats.browser}</div></div>
          <div style={statCard}><div style={statLabel}>Shipped</div><div style={statValue}>{stats.shipped}</div></div>
        </div>
        <div style={{ opacity: 0.7, fontSize: 12, marginTop: 8 }}>Last updated: {data.updatedAt ? new Date(data.updatedAt).toLocaleString() : '—'}</div>
      </section>

      {showCreate && (
        <section style={{ background: '#121a33', borderRadius: 12, padding: 14, marginTop: 14 }}>
          <h2 style={{ marginTop: 0 }}>Create new enhancement</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 10 }}>
            <label style={field}><span>Title</span><input value={createForm.title} onChange={(e) => setCreateForm((p) => ({ ...p, title: e.target.value }))} style={inputStyle} /></label>
            <label style={field}><span>Owner</span><input value={createForm.owner} onChange={(e) => setCreateForm((p) => ({ ...p, owner: e.target.value }))} style={inputStyle} /></label>
            <label style={field}><span>Category</span><select value={createForm.category} onChange={(e) => setCreateForm((p) => ({ ...p, category: e.target.value }))} style={inputStyle}>{(data.categories || []).map((x) => <option key={x} value={x}>{prettyLabel(x)}</option>)}</select></label>
            <label style={field}><span>Status</span><select value={createForm.status} onChange={(e) => setCreateForm((p) => ({ ...p, status: e.target.value }))} style={inputStyle}>{(data.statuses || []).map((x) => <option key={x} value={x}>{prettyLabel(x)}</option>)}</select></label>
            <label style={field}><span>Priority</span><select value={createForm.priority} onChange={(e) => setCreateForm((p) => ({ ...p, priority: e.target.value }))} style={inputStyle}>{(data.priorities || []).map((x) => <option key={x} value={x}>{x}</option>)}</select></label>
            <label style={field}><span>Related route</span><input value={createForm.relatedRoute} onChange={(e) => setCreateForm((p) => ({ ...p, relatedRoute: e.target.value }))} style={inputStyle} /></label>
            <label style={{ ...field, gridColumn: '1 / -1' }}><span>Related component</span><input value={createForm.relatedComponent} onChange={(e) => setCreateForm((p) => ({ ...p, relatedComponent: e.target.value }))} style={inputStyle} /></label>
            <label style={{ ...field, gridColumn: '1 / -1' }}><span>Summary</span><textarea value={createForm.summary} onChange={(e) => setCreateForm((p) => ({ ...p, summary: e.target.value }))} rows={3} style={inputStyle} /></label>
            <label style={{ ...field, gridColumn: '1 / -1' }}><span>Notes</span><textarea value={createForm.notes} onChange={(e) => setCreateForm((p) => ({ ...p, notes: e.target.value }))} rows={4} style={inputStyle} /></label>
            <label style={field}><span>Support links (one per line)</span><textarea value={createForm.supportLinksText} onChange={(e) => setCreateForm((p) => ({ ...p, supportLinksText: e.target.value }))} rows={4} style={inputStyle} /></label>
            <label style={field}><span>Support files (one per line)</span><textarea value={createForm.supportFilesText} onChange={(e) => setCreateForm((p) => ({ ...p, supportFilesText: e.target.value }))} rows={4} style={inputStyle} /></label>
            <label style={{ ...field, gridColumn: '1 / -1' }}><span>Next step / decision</span><textarea value={createForm.nextStep} onChange={(e) => setCreateForm((p) => ({ ...p, nextStep: e.target.value }))} rows={3} style={inputStyle} /></label>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
            <button onClick={createItem} disabled={savingId === 'create' || !createForm.title.trim()} style={{ background: '#2563eb', color: 'white', border: 0, borderRadius: 8, padding: '10px 14px', cursor: 'pointer' }}>{savingId === 'create' ? 'Creating…' : 'Create enhancement'}</button>
          </div>
        </section>
      )}

      <section style={{ background: '#121a33', borderRadius: 12, padding: 14, marginTop: 14 }}>
        <h2 style={{ marginTop: 0 }}>Filters & sorting</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 10 }}>
          <label style={field}><span>Category</span><select value={filters.category} onChange={(e) => setFilters((p) => ({ ...p, category: e.target.value }))} style={inputStyle}><option value='all'>All</option>{(data.categories || []).map((x) => <option key={x} value={x}>{prettyLabel(x)}</option>)}</select></label>
          <label style={field}><span>Status</span><select value={filters.status} onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))} style={inputStyle}><option value='all'>All</option>{(data.statuses || []).map((x) => <option key={x} value={x}>{prettyLabel(x)}</option>)}</select></label>
          <label style={field}><span>Priority</span><select value={filters.priority} onChange={(e) => setFilters((p) => ({ ...p, priority: e.target.value }))} style={inputStyle}><option value='all'>All</option>{(data.priorities || []).map((x) => <option key={x} value={x}>{x}</option>)}</select></label>
          <label style={field}><span>Sort</span><select value={filters.sort} onChange={(e) => setFilters((p) => ({ ...p, sort: e.target.value }))} style={inputStyle}><option value='priority'>Priority</option><option value='updated'>Last updated</option><option value='title'>Title</option></select></label>
        </div>
      </section>

      <section style={{ background: '#121a33', borderRadius: 12, padding: 14, marginTop: 14 }}>
        <div style={{ display: 'grid', gap: 10 }}>
          {loading ? <div>Loading enhancements…</div> : visibleEnhancements.map((item) => {
            const expanded = expandedId === item.id
            const form = forms[item.id] || EMPTY_FORM
            return (
              <div key={item.id} style={{ border: '1px solid #334155', borderRadius: 10, overflow: 'hidden', background: '#0b1020' }}>
                <button onClick={() => setExpandedId(expanded ? '' : item.id)} style={{ width: '100%', textAlign: 'left', background: 'transparent', color: '#e8ecf3', border: 0, padding: 14, cursor: 'pointer' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 18 }}>{item.title}</div>
                      <div style={{ opacity: 0.75, marginTop: 4 }}>{item.summary}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <span style={pillDark}>{prettyLabel(item.category)}</span>
                      <span style={pillBlue}>{prettyLabel(item.status)}</span>
                      <span style={pillGray}>{item.priority}</span>
                    </div>
                  </div>
                </button>

                {expanded && (
                  <div style={{ borderTop: '1px solid #334155', padding: 14 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 10 }}>
                      <label style={field}><span>Title</span><input value={form.title} onChange={(e) => updateForm(item.id, { title: e.target.value })} style={inputStyle} /></label>
                      <label style={field}><span>Owner</span><input value={form.owner} onChange={(e) => updateForm(item.id, { owner: e.target.value })} style={inputStyle} /></label>
                      <label style={field}><span>Category</span><select value={form.category} onChange={(e) => updateForm(item.id, { category: e.target.value })} style={inputStyle}>{(data.categories || []).map((x) => <option key={x} value={x}>{prettyLabel(x)}</option>)}</select></label>
                      <label style={field}><span>Status</span><select value={form.status} onChange={(e) => updateForm(item.id, { status: e.target.value })} style={inputStyle}>{(data.statuses || []).map((x) => <option key={x} value={x}>{prettyLabel(x)}</option>)}</select></label>
                      <label style={field}><span>Priority</span><select value={form.priority} onChange={(e) => updateForm(item.id, { priority: e.target.value })} style={inputStyle}>{(data.priorities || []).map((x) => <option key={x} value={x}>{x}</option>)}</select></label>
                      <label style={field}><span>Related route</span><input value={form.relatedRoute} onChange={(e) => updateForm(item.id, { relatedRoute: e.target.value })} style={inputStyle} /></label>
                      <label style={{ ...field, gridColumn: '1 / -1' }}><span>Related component</span><input value={form.relatedComponent} onChange={(e) => updateForm(item.id, { relatedComponent: e.target.value })} style={inputStyle} /></label>
                      <label style={{ ...field, gridColumn: '1 / -1' }}><span>Summary</span><textarea value={form.summary} onChange={(e) => updateForm(item.id, { summary: e.target.value })} rows={3} style={inputStyle} /></label>
                      <label style={{ ...field, gridColumn: '1 / -1' }}><span>Notes</span><textarea value={form.notes} onChange={(e) => updateForm(item.id, { notes: e.target.value })} rows={5} style={inputStyle} /></label>
                      <label style={field}><span>Support links (one per line)</span><textarea value={form.supportLinksText} onChange={(e) => updateForm(item.id, { supportLinksText: e.target.value })} rows={4} style={inputStyle} /></label>
                      <label style={field}><span>Support files (one per line)</span><textarea value={form.supportFilesText} onChange={(e) => updateForm(item.id, { supportFilesText: e.target.value })} rows={4} style={inputStyle} /></label>
                      <label style={{ ...field, gridColumn: '1 / -1' }}><span>Next step / decision</span><textarea value={form.nextStep} onChange={(e) => updateForm(item.id, { nextStep: e.target.value })} rows={3} style={inputStyle} /></label>
                    </div>

                    <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
                      <div style={{ fontWeight: 600 }}>Attachments</div>
                      <input type='file' onChange={(e) => uploadFile(item.id, e.target.files?.[0])} style={{ color: '#e8ecf3' }} />
                      {uploadingId === item.id && <div style={{ opacity: 0.8 }}>Uploading…</div>}
                      {(normalizeLines(form.supportFilesText).length > 0 || normalizeLines(form.supportLinksText).length > 0) && (
                        <div style={{ display: 'grid', gap: 6 }}>
                          {normalizeLines(form.supportFilesText).map((path) => <div key={path} style={{ fontSize: 13, opacity: 0.9 }}>📎 {path}</div>)}
                          {normalizeLines(form.supportLinksText).map((link) => <a key={link} href={link} target='_blank' rel='noreferrer' style={{ color: '#93c5fd', fontSize: 13 }}>{link}</a>)}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, gap: 12, flexWrap: 'wrap' }}>
                      <div style={{ opacity: 0.7, fontSize: 12 }}>Created: {item.createdAt ? new Date(item.createdAt).toLocaleString() : '—'} · Updated: {item.updatedAt ? new Date(item.updatedAt).toLocaleString() : '—'}</div>
                      <button onClick={() => saveItem(item.id)} disabled={savingId === item.id} style={{ background: '#2563eb', color: 'white', border: 0, borderRadius: 8, padding: '10px 14px', cursor: 'pointer' }}>{savingId === item.id ? 'Saving…' : 'Save changes'}</button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
          {!loading && visibleEnhancements.length === 0 && <div style={{ opacity: 0.8 }}>No enhancements match the current filters.</div>}
        </div>
      </section>
    </main>
  )
}

const field = { display: 'grid', gap: 4 }
const statCard = { border: '1px solid #334155', borderRadius: 8, padding: 10 }
const statLabel = { opacity: 0.72, fontSize: 12 }
const statValue = { fontSize: 24, fontWeight: 700 }
const pillDark = { background: '#1e293b', borderRadius: 999, padding: '4px 8px', fontSize: 12 }
const pillBlue = { background: '#1d4ed8', borderRadius: 999, padding: '4px 8px', fontSize: 12 }
const pillGray = { background: '#374151', borderRadius: 999, padding: '4px 8px', fontSize: 12 }
const inputStyle = {
  background: '#111827',
  color: '#e8ecf3',
  border: '1px solid #334155',
  borderRadius: 8,
  padding: '10px 12px',
  font: 'inherit'
}
