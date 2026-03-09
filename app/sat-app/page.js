'use client'

import { useMemo, useState } from 'react'

const SAT_ASSETS = [
  {
    id: 'acely-sat-keyword-map',
    name: 'Acely SAT Competitor Keyword Map',
    status: 'active',
    objective: 'Track likely Acely SAT keyword clusters, ad-angle themes, and exploitable positioning gaps.',
    folder: 'SAT App',
    artifacts: [
      'SAT App/ACELY-SAT-COMPETITOR-KEYWORD-MAP.md',
      'SAT App/README.md'
    ],
    notes: [
      'Keep this SAT-only (no ACT/PSAT bleed).',
      'Use this as baseline before building ad groups and landing-page messaging.'
    ]
  }
]

const SAT_FOLDER_FILES = [
  'SAT App/ACELY-SAT-COMPETITOR-KEYWORD-MAP.md',
  'SAT App/README.md',
  'SAT App/019caa5b-2f26-7925-9585-d4c92948cc76-yCeIvman4Gmc-2026-03-03-21-35.zip'
]

export default function SatAppPage() {
  const [selectedPath, setSelectedPath] = useState('SAT App/ACELY-SAT-COMPETITOR-KEYWORD-MAP.md')
  const [docTitle, setDocTitle] = useState('')
  const [docContent, setDocContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function openDoc(path) {
    setSelectedPath(path)
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/memory/doc?path=${encodeURIComponent(path)}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to open document')
      setDocTitle(json.title || path)
      setDocContent(json.content || '')
    } catch (e) {
      setError(e.message)
      setDocTitle(path)
      setDocContent('')
    } finally {
      setLoading(false)
    }
  }

  const counts = useMemo(() => {
    const total = SAT_ASSETS.length
    const active = SAT_ASSETS.filter((o) => o.status === 'active').length
    const queued = SAT_ASSETS.filter((o) => o.status === 'queued').length
    return { total, active, queued }
  }, [])

  return (
    <main style={{ minHeight: '100vh', padding: 24, background: '#0b1020', color: '#e8ecf3', fontFamily: 'Inter, Segoe UI, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 30 }}>SAT App Mission Control</h1>
          <p style={{ margin: '6px 0 0', opacity: 0.82 }}>Dedicated Mission Control page for SAT app strategy, keyword research, and execution docs.</p>
        </div>
        <a href='/' style={{ background: '#334155', color: 'white', textDecoration: 'none', borderRadius: 8, padding: '10px 14px' }}>Back to Mission Control</a>
      </div>

      <section style={{ background: '#121a33', borderRadius: 12, padding: 14, marginTop: 14 }}>
        <h2 style={{ marginTop: 0 }}>SAT Portfolio Snapshot</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
          <div style={{ border: '1px solid #334155', borderRadius: 8, padding: 10 }}><div style={{ opacity: 0.72, fontSize: 12 }}>Tracked Assets</div><div style={{ fontSize: 24, fontWeight: 700 }}>{counts.total}</div></div>
          <div style={{ border: '1px solid #334155', borderRadius: 8, padding: 10 }}><div style={{ opacity: 0.72, fontSize: 12 }}>Active</div><div style={{ fontSize: 24, fontWeight: 700 }}>{counts.active}</div></div>
          <div style={{ border: '1px solid #334155', borderRadius: 8, padding: 10 }}><div style={{ opacity: 0.72, fontSize: 12 }}>Queued</div><div style={{ fontSize: 24, fontWeight: 700 }}>{counts.queued}</div></div>
        </div>
      </section>

      <section style={{ background: '#121a33', borderRadius: 12, padding: 14, marginTop: 14 }}>
        <h2 style={{ marginTop: 0 }}>SAT Folder Contents</h2>
        <div style={{ display: 'grid', gap: 8 }}>
          {SAT_FOLDER_FILES.map((f) => (
            <div key={f} style={{ border: '1px solid #334155', borderRadius: 8, padding: 8, background: '#0b1020', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <div style={{ fontSize: 13, opacity: 0.9 }}>{f}</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => openDoc(f)} style={{ background: '#1d4ed8', color: 'white', border: 0, borderRadius: 6, padding: '6px 8px', cursor: 'pointer' }}>Open</button>
                <button onClick={() => navigator.clipboard?.writeText(f)} style={{ background: '#475569', color: 'white', border: 0, borderRadius: 6, padding: '6px 8px', cursor: 'pointer' }}>Copy path</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: '42% 58%', gap: 12, marginTop: 14 }}>
        <div style={{ background: '#121a33', borderRadius: 12, padding: 14 }}>
          <h2 style={{ marginTop: 0 }}>SAT App Assets</h2>
          {SAT_ASSETS.map((o) => (
            <div key={o.id} style={{ border: '1px solid #334155', borderRadius: 10, padding: 10, marginBottom: 10, background: '#0b1020' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                <strong>{o.name}</strong>
                <span style={{ fontSize: 12, opacity: 0.8, textTransform: 'capitalize' }}>{o.status}</span>
              </div>
              <div style={{ marginTop: 6, fontSize: 13, opacity: 0.85 }}>{o.objective}</div>
              <div style={{ marginTop: 6, fontSize: 12, opacity: 0.7 }}>Folder: {o.folder}</div>
              <div style={{ marginTop: 8, fontSize: 12, fontWeight: 700 }}>Artifacts</div>
              <div style={{ display: 'grid', gap: 6, marginTop: 6 }}>
                {o.artifacts.map((a) => (
                  <button key={a} onClick={() => openDoc(a)} style={{ textAlign: 'left', background: '#1d4ed8', color: 'white', border: 0, borderRadius: 6, padding: '6px 8px', cursor: 'pointer' }}>
                    {a === 'SAT App/README.md' ? 'Open: SAT App folder' : `Open: ${a}`}
                  </button>
                ))}
              </div>
              <div style={{ marginTop: 8, fontSize: 12, fontWeight: 700 }}>Current notes</div>
              <ul style={{ marginTop: 6, marginBottom: 0, paddingLeft: 18 }}>
                {o.notes.map((n, i) => <li key={`${o.id}-${i}`} style={{ fontSize: 13, opacity: 0.85 }}>{n}</li>)}
              </ul>
            </div>
          ))}
        </div>

        <div style={{ background: '#121a33', borderRadius: 12, padding: 14 }}>
          <h2 style={{ marginTop: 0 }}>SAT Research Reader</h2>
          <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 8 }}>Selected: {selectedPath || '—'}</div>
          {!selectedPath && <div style={{ opacity: 0.75 }}>Select an artifact to open.</div>}
          {loading && <div>Loading document…</div>}
          {error && <div style={{ background: '#7f1d1d', padding: 10, borderRadius: 8, marginBottom: 8 }}>Error: {error}</div>}
          {!loading && docTitle && (
            <>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>{docTitle}</div>
              <pre style={{ whiteSpace: 'pre-wrap', margin: 0, background: '#0b1020', border: '1px solid #334155', borderRadius: 8, padding: 10, maxHeight: 620, overflow: 'auto', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 13 }}>{docContent || '(empty document)'}</pre>
            </>
          )}
        </div>
      </section>
    </main>
  )
}
