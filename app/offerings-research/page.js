'use client'

import { useMemo, useState } from 'react'

const OFFERINGS = [
  {
    id: 'voice-agent',
    name: 'Voice Agent',
    status: 'active',
    objective: 'Build/test voice-agent service offerings for automation clients.',
    folder: 'Voice-Agent',
    artifacts: [
      'Voice-Agent/VOICE-AGENT-RESEARCH-SUMMARY-2026-03-03.md'
    ],
    notes: [
      'Focus on narrow pilot flows first (inbound qualification + scheduling).',
      'Track outcome quality + cost-per-success before scaling.'
    ]
  },
  {
    id: 'content-creator-studio',
    name: 'Content Creator Studio',
    status: 'queued',
    objective: 'Design and validate content-system offering for creators/brands.',
    folder: 'Content-Creator-Studio',
    artifacts: [
      'Content-Creator-Studio/README.md'
    ],
    notes: [
      'Define offer scope, delivery workflow, KPIs, and pricing model.',
      'Capture experiments and lessons learned in this folder.'
    ]
  }
]

const POTENTIAL_PROJECTS = [
  {
    id: 'diy-local-cloud-storage',
    name: 'DIY Local “Cloud” Storage / Personal NAS',
    source: 'https://www.youtube.com/shorts/afE0pWlqq0Y',
    status: 'idea',
    notes: 'Evaluate as a server-style home storage option (remote access, backup reliability, security hardening).'
  }
]

export default function OfferingsResearchPage() {
  const [selectedPath, setSelectedPath] = useState('Voice-Agent/VOICE-AGENT-RESEARCH-SUMMARY-2026-03-03.md')
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
    const total = OFFERINGS.length
    const active = OFFERINGS.filter((o) => o.status === 'active').length
    const queued = OFFERINGS.filter((o) => o.status === 'queued').length
    return { total, active, queued }
  }, [])

  return (
    <main style={{ minHeight: '100vh', padding: 24, background: '#0b1020', color: '#e8ecf3', fontFamily: 'Inter, Segoe UI, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 30 }}>Offerings Research Hub</h1>
          <p style={{ margin: '6px 0 0', opacity: 0.82 }}>Dedicated Mission Control page for research, findings, and lessons learned across offerings.</p>
        </div>
        <a href='/' style={{ background: '#334155', color: 'white', textDecoration: 'none', borderRadius: 8, padding: '10px 14px' }}>Back to Mission Control</a>
      </div>

      <section style={{ background: '#121a33', borderRadius: 12, padding: 14, marginTop: 14 }}>
        <h2 style={{ marginTop: 0 }}>Portfolio Snapshot</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
          <div style={{ border: '1px solid #334155', borderRadius: 8, padding: 10 }}><div style={{ opacity: 0.72, fontSize: 12 }}>Tracked Offerings</div><div style={{ fontSize: 24, fontWeight: 700 }}>{counts.total}</div></div>
          <div style={{ border: '1px solid #334155', borderRadius: 8, padding: 10 }}><div style={{ opacity: 0.72, fontSize: 12 }}>Active</div><div style={{ fontSize: 24, fontWeight: 700 }}>{counts.active}</div></div>
          <div style={{ border: '1px solid #334155', borderRadius: 8, padding: 10 }}><div style={{ opacity: 0.72, fontSize: 12 }}>Queued</div><div style={{ fontSize: 24, fontWeight: 700 }}>{counts.queued}</div></div>
        </div>
      </section>

      <section style={{ background: '#121a33', borderRadius: 12, padding: 14, marginTop: 14 }}>
        <h2 style={{ marginTop: 0 }}>Potential Projects</h2>
        <div style={{ display: 'grid', gap: 10 }}>
          {POTENTIAL_PROJECTS.map((p) => (
            <div key={p.id} style={{ border: '1px solid #334155', borderRadius: 10, padding: 10, background: '#0b1020' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                <strong>{p.name}</strong>
                <span style={{ fontSize: 12, opacity: 0.8, textTransform: 'capitalize' }}>{p.status}</span>
              </div>
              <div style={{ marginTop: 6, fontSize: 13, opacity: 0.85 }}>{p.notes}</div>
              <a href={p.source} target='_blank' rel='noreferrer' style={{ display: 'inline-block', marginTop: 8, color: '#93c5fd', fontSize: 12 }}>
                Source link
              </a>
            </div>
          ))}
        </div>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: '42% 58%', gap: 12, marginTop: 14 }}>
        <div style={{ background: '#121a33', borderRadius: 12, padding: 14 }}>
          <h2 style={{ marginTop: 0 }}>Offerings</h2>
          {OFFERINGS.map((o) => (
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
                    Open: {a}
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
          <h2 style={{ marginTop: 0 }}>Research Reader</h2>
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
