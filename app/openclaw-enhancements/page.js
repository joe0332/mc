'use client'

import { useEffect, useMemo, useState } from 'react'

const POTENTIAL_UPDATES = [
  'Harden small-model sandbox + tool deny defaults for untrusted input.',
  'Fix Browser Janitor PowerShell command path issue and validate sustained clean runs.',
  'Expand OpenClaw update triage to include auto-generated remediation checklist.',
  'Add scheduled-job ownership taxonomy and recurring quarterly cleanup.'
]

const CONTROL_SUMMARY = [
  'Closed-loop completion gate: tasks are not done until Joe receives completion/blocker/question update.',
  'Recovery sweep guardrail: after service recovery, scan 12h missed/failed scheduled work and rerun critical jobs first.',
  'Communication proof requirement for terminal states: done_notice / approval_request / blocking_question.',
  'Browser cleanup gate for sensitive pages: close tabs + stop profile before run completion.',
  'Automation change gate: checklist required for cron/automation changes before task is complete.'
]

const SECRETARY_DOCS = [
  'Admin-Secretary-Controls.md',
  'SECRETARY-CONTROLS-RUNTIME.md',
  'HEARTBEAT.md',
  'GATEWAY-RECOVERY.md',
  'AUTOMATION_CHANGE_CHECKLIST.md',
  'CRON-JOBS.md'
]

function fmtNext(expr = '', tz = '') {
  if (!expr && !tz) return '—'
  return [expr, tz].filter(Boolean).join(' · ')
}

export default function OpenClawEnhancementsPage() {
  const [collapsed, setCollapsed] = useState({
    potential: false,
    controls: false,
    secretary: false,
    jobs: false
  })
  const [data, setData] = useState({ jobs: [], categories: [] })
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState('')
  const [error, setError] = useState('')
  const [selectedDoc, setSelectedDoc] = useState(SECRETARY_DOCS[0])
  const [docLoading, setDocLoading] = useState(false)
  const [docError, setDocError] = useState('')
  const [docData, setDocData] = useState({ title: '', relPath: '', content: '' })

  async function load() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/openclaw-enhancements', { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load enhancements data')
      setData(json)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function updateCategory(jobId, category) {
    setSavingId(jobId)
    try {
      const res = await fetch('/api/openclaw-enhancements', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, category })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to save category')
      setData((prev) => ({
        ...prev,
        jobs: (prev.jobs || []).map((j) => j.id === jobId ? { ...j, category } : j)
      }))
    } catch (e) {
      setError(e.message)
    } finally {
      setSavingId('')
    }
  }

  async function loadDoc(relPath) {
    if (!relPath) return
    setSelectedDoc(relPath)
    setDocLoading(true)
    setDocError('')
    try {
      const res = await fetch(`/api/memory/doc?path=${encodeURIComponent(relPath)}`, { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load document')
      setDocData({
        title: json.title || relPath,
        relPath: json.relPath || relPath,
        content: json.content || ''
      })
    } catch (e) {
      setDocError(e.message)
    } finally {
      setDocLoading(false)
    }
  }

  useEffect(() => {
    load()
    loadDoc(SECRETARY_DOCS[0])
  }, [])

  const stats = useMemo(() => ({
    totalJobs: (data.jobs || []).length,
    enabledJobs: (data.jobs || []).filter((j) => j.enabled).length,
    categorizedJobs: (data.jobs || []).filter((j) => (j.category || '') !== 'Uncategorized').length
  }), [data])

  return (
    <main style={{ minHeight: '100vh', padding: 24, background: '#0b1020', color: '#e8ecf3', fontFamily: 'Inter, Segoe UI, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 30 }}>OpenClaw Control Center</h1>
          <p style={{ margin: '6px 0 0', opacity: 0.82 }}>Potential updates, current controls/configs, secretary reliability summary, and scheduled job catalog.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <a href='/' style={{ background: '#334155', color: 'white', textDecoration: 'none', borderRadius: 8, padding: '10px 14px' }}>Back to Mission Control</a>
          <button onClick={load} style={{ background: '#2563eb', color: 'white', border: 0, borderRadius: 8, padding: '10px 14px', cursor: 'pointer' }}>Refresh</button>
        </div>
      </div>

      {error && <div style={{ background: '#7f1d1d', padding: 10, borderRadius: 8, marginTop: 12 }}>Error: {error}</div>}

      <section style={{ background: '#121a33', borderRadius: 12, padding: 14, marginTop: 14 }}>
        <h2 style={{ marginTop: 0 }}>Snapshot</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 8 }}>
          <div style={{ border: '1px solid #334155', borderRadius: 8, padding: 10 }}><div style={{ opacity: 0.72, fontSize: 12 }}>Total Scheduled Jobs</div><div style={{ fontSize: 24, fontWeight: 700 }}>{stats.totalJobs}</div></div>
          <div style={{ border: '1px solid #334155', borderRadius: 8, padding: 10 }}><div style={{ opacity: 0.72, fontSize: 12 }}>Enabled Jobs</div><div style={{ fontSize: 24, fontWeight: 700 }}>{stats.enabledJobs}</div></div>
          <div style={{ border: '1px solid #334155', borderRadius: 8, padding: 10 }}><div style={{ opacity: 0.72, fontSize: 12 }}>Categorized Jobs</div><div style={{ fontSize: 24, fontWeight: 700 }}>{stats.categorizedJobs}</div></div>
        </div>
      </section>

      <section style={{ background: '#121a33', borderRadius: 12, padding: 14, marginTop: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0 }}>Potential Updates</h2>
          <button onClick={() => setCollapsed((s) => ({ ...s, potential: !s.potential }))} style={{ background: '#334155', color: 'white', border: 0, borderRadius: 8, padding: '6px 10px', cursor: 'pointer' }}>{collapsed.potential ? 'Expand' : 'Collapse'}</button>
        </div>
        {!collapsed.potential && <ul style={{ marginTop: 10 }}>{POTENTIAL_UPDATES.map((x, i) => <li key={i} style={{ marginBottom: 6 }}>{x}</li>)}</ul>}
      </section>

      <section style={{ background: '#121a33', borderRadius: 12, padding: 14, marginTop: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0 }}>Current Configurations & Controls</h2>
          <button onClick={() => setCollapsed((s) => ({ ...s, controls: !s.controls }))} style={{ background: '#334155', color: 'white', border: 0, borderRadius: 8, padding: '6px 10px', cursor: 'pointer' }}>{collapsed.controls ? 'Expand' : 'Collapse'}</button>
        </div>
        {!collapsed.controls && <ul style={{ marginTop: 10 }}>{CONTROL_SUMMARY.map((x, i) => <li key={i} style={{ marginBottom: 6 }}>{x}</li>)}</ul>}
      </section>

      <section style={{ background: '#121a33', borderRadius: 12, padding: 14, marginTop: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0 }}>Secretary/Admin Controls (Doc Summary)</h2>
          <button onClick={() => setCollapsed((s) => ({ ...s, secretary: !s.secretary }))} style={{ background: '#334155', color: 'white', border: 0, borderRadius: 8, padding: '6px 10px', cursor: 'pointer' }}>{collapsed.secretary ? 'Expand' : 'Collapse'}</button>
        </div>
        {!collapsed.secretary && (
          <div style={{ marginTop: 10 }}>
            <div style={{ opacity: 0.8, marginBottom: 8 }}>Key reference docs:</div>
            <div style={{ display: 'grid', gridTemplateColumns: '260px minmax(0, 1fr)', gap: 12 }}>
              <div style={{ display: 'grid', gap: 6, alignContent: 'start' }}>
                {SECRETARY_DOCS.map((d) => (
                  <button
                    key={d}
                    onClick={() => loadDoc(d)}
                    style={{
                      textAlign: 'left',
                      background: selectedDoc === d ? '#1d4ed8' : '#0b1020',
                      color: selectedDoc === d ? 'white' : '#93c5fd',
                      border: '1px solid #334155',
                      borderRadius: 8,
                      padding: '8px 10px',
                      cursor: 'pointer'
                    }}
                  >
                    {d}
                  </button>
                ))}
                <a href={`/api/memory/doc?path=${encodeURIComponent(selectedDoc)}`} target='_blank' rel='noreferrer' style={{ color: '#93c5fd', marginTop: 4 }}>Open raw JSON in new tab</a>
              </div>

              <div style={{ border: '1px solid #334155', borderRadius: 10, background: '#0b1020', minHeight: 360, overflow: 'hidden' }}>
                <div style={{ padding: '10px 12px', borderBottom: '1px solid #26314f', fontWeight: 600 }}>
                  {docData.title || selectedDoc}
                </div>
                <div style={{ padding: 12, maxHeight: 520, overflow: 'auto' }}>
                  {docLoading && <div>Loading document…</div>}
                  {!docLoading && docError && <div style={{ color: '#fca5a5' }}>Error: {docError}</div>}
                  {!docLoading && !docError && (
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.45, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 12 }}>
                      {docData.content || 'No content found.'}
                    </pre>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      <section style={{ background: '#121a33', borderRadius: 12, padding: 14, marginTop: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0 }}>Scheduled Jobs Catalog</h2>
          <button onClick={() => setCollapsed((s) => ({ ...s, jobs: !s.jobs }))} style={{ background: '#334155', color: 'white', border: 0, borderRadius: 8, padding: '6px 10px', cursor: 'pointer' }}>{collapsed.jobs ? 'Expand' : 'Collapse'}</button>
        </div>

        {!collapsed.jobs && (
          <div style={{ marginTop: 10, overflowX: 'auto' }}>
            {loading ? <div>Loading jobs…</div> : (
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1100 }}>
                <thead>
                  <tr style={{ textAlign: 'left', opacity: 0.9 }}>
                    <th>Name</th>
                    <th>Description</th>
                    <th>Schedule</th>
                    <th>Status</th>
                    <th>Purpose Category</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.jobs || []).map((j) => (
                    <tr key={j.id} style={{ borderTop: '1px solid #26314f' }}>
                      <td style={{ padding: '8px 6px' }}>
                        <div style={{ fontWeight: 600 }}>{j.name}</div>
                        <div style={{ opacity: 0.65, fontSize: 12 }}>{j.id}</div>
                      </td>
                      <td style={{ maxWidth: 420 }}>{j.description || '—'}</td>
                      <td>{fmtNext(j.scheduleExpr, j.scheduleTz)}</td>
                      <td>{j.enabled ? 'Enabled' : 'Disabled'}</td>
                      <td>
                        <select
                          value={j.category || 'Uncategorized'}
                          onChange={(e) => updateCategory(j.id, e.target.value)}
                          disabled={savingId === j.id}
                          style={{ background: '#0b1020', color: '#e8ecf3', border: '1px solid #334155', borderRadius: 6, padding: '6px 8px' }}
                        >
                          {(data.categories || []).map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </section>
    </main>
  )
}
