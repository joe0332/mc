'use client'

import { useMemo, useState } from 'react'

const IDEA_BUCKETS = [
  {
    id: 'in-flight',
    name: 'In Flight',
    status: 'active',
    ideas: [
      {
        title: 'Automation Consultation Business (Tool-Agnostic Local Offer)',
        summary: 'Close first paid local client using the simplest cost-effective automation stack.',
        sourcePath: 'POTENTIAL-PROJECTS.md'
      },
      {
        title: 'Bitcoin/Investment Signal Compression',
        summary: 'Automate weekly signal pipeline (newsletter + X + YouTube talking points).',
        sourcePath: 'POTENTIAL-PROJECTS.md'
      },
      {
        title: 'Life Admin Operating System',
        summary: 'Weekly brain-dump to priority workflow to reduce execution friction.',
        sourcePath: 'POTENTIAL-PROJECTS.md'
      }
    ]
  },
  {
    id: 'potential',
    name: 'Potential',
    status: 'queued',
    ideas: [
      {
        title: 'AI Personal Trainer Check-In Service',
        summary: 'Accountability-first app with reminder escalation and persona modes.',
        sourcePath: 'POTENTIAL-PROJECTS.md'
      },
      {
        title: 'Automated SEO/AEO/GEO Content Orchestration',
        summary: 'Trend discovery + draft generation + scheduled publishing + analytics loop.',
        sourcePath: 'POTENTIAL-PROJECTS.md'
      },
      {
        title: 'Local AI Voice Agent Service',
        summary: 'Compliance-first missed-call recovery service for local businesses.',
        sourcePath: 'POTENTIAL-PROJECTS.md'
      },
      {
        title: 'Keto Chocolate-Covered Almonds',
        summary: 'Simple physical-product idea captured in money-making notes.',
        sourcePath: 'MONEY-MAKING-IDEAS.md'
      }
    ]
  }
]

const SEED_FILES = [
  'POTENTIAL-PROJECTS.md',
  'MONEY-MAKING-IDEAS.md',
  'AUTOMATION-OUTREACH-PLAYBOOK.md',
  'AUTOMATION-SERVICE-CATALOG.md'
]

export default function IncomeIdeasPage() {
  const [selectedPath, setSelectedPath] = useState('POTENTIAL-PROJECTS.md')
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
    const buckets = IDEA_BUCKETS.length
    const totalIdeas = IDEA_BUCKETS.reduce((sum, b) => sum + b.ideas.length, 0)
    const active = IDEA_BUCKETS.filter((b) => b.status === 'active').length
    const queued = IDEA_BUCKETS.filter((b) => b.status === 'queued').length
    return { buckets, totalIdeas, active, queued }
  }, [])

  return (
    <main style={{ minHeight: '100vh', padding: 24, background: '#0b1020', color: '#e8ecf3', fontFamily: 'Inter, Segoe UI, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 30 }}>Income Ideas Hub</h1>
          <p style={{ margin: '6px 0 0', opacity: 0.82 }}>Seeded from your existing money-making and project notes, with room to keep adding ideas.</p>
        </div>
        <a href='/' style={{ background: '#334155', color: 'white', textDecoration: 'none', borderRadius: 8, padding: '10px 14px' }}>Back to Mission Control</a>
      </div>

      <section style={{ background: '#121a33', borderRadius: 12, padding: 14, marginTop: 14 }}>
        <h2 style={{ marginTop: 0 }}>Portfolio Snapshot</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8 }}>
          <div style={{ border: '1px solid #334155', borderRadius: 8, padding: 10 }}><div style={{ opacity: 0.72, fontSize: 12 }}>Idea Buckets</div><div style={{ fontSize: 24, fontWeight: 700 }}>{counts.buckets}</div></div>
          <div style={{ border: '1px solid #334155', borderRadius: 8, padding: 10 }}><div style={{ opacity: 0.72, fontSize: 12 }}>Seeded Ideas</div><div style={{ fontSize: 24, fontWeight: 700 }}>{counts.totalIdeas}</div></div>
          <div style={{ border: '1px solid #334155', borderRadius: 8, padding: 10 }}><div style={{ opacity: 0.72, fontSize: 12 }}>Active Tracks</div><div style={{ fontSize: 24, fontWeight: 700 }}>{counts.active}</div></div>
          <div style={{ border: '1px solid #334155', borderRadius: 8, padding: 10 }}><div style={{ opacity: 0.72, fontSize: 12 }}>Queued Tracks</div><div style={{ fontSize: 24, fontWeight: 700 }}>{counts.queued}</div></div>
        </div>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: '42% 58%', gap: 12, marginTop: 14 }}>
        <div style={{ background: '#121a33', borderRadius: 12, padding: 14 }}>
          <h2 style={{ marginTop: 0 }}>Idea Buckets</h2>
          {IDEA_BUCKETS.map((bucket) => (
            <div key={bucket.id} style={{ border: '1px solid #334155', borderRadius: 10, padding: 10, marginBottom: 10, background: '#0b1020' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <strong>{bucket.name}</strong>
                <span style={{ fontSize: 12, opacity: 0.8, textTransform: 'capitalize' }}>{bucket.status}</span>
              </div>
              <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
                {bucket.ideas.map((idea, idx) => (
                  <div key={`${bucket.id}-${idx}`} style={{ border: '1px solid #26314f', borderRadius: 8, padding: 8 }}>
                    <div style={{ fontWeight: 600 }}>{idea.title}</div>
                    <div style={{ marginTop: 4, fontSize: 13, opacity: 0.85 }}>{idea.summary}</div>
                    <button onClick={() => openDoc(idea.sourcePath)} style={{ marginTop: 6, textAlign: 'left', background: '#1d4ed8', color: 'white', border: 0, borderRadius: 6, padding: '5px 8px', cursor: 'pointer', fontSize: 12 }}>
                      Open source: {idea.sourcePath}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div style={{ border: '1px dashed #334155', borderRadius: 10, padding: 10, background: '#0b1020' }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Add More Ideas</div>
            <div style={{ fontSize: 13, opacity: 0.85 }}>Append ideas in <code>MONEY-MAKING-IDEAS.md</code> or <code>POTENTIAL-PROJECTS.md</code>. This page is designed to keep seeding from those files.</div>
            <div style={{ marginTop: 8, display: 'grid', gap: 6 }}>
              {SEED_FILES.map((path) => (
                <button key={path} onClick={() => openDoc(path)} style={{ textAlign: 'left', background: '#334155', color: 'white', border: 0, borderRadius: 6, padding: '6px 8px', cursor: 'pointer' }}>
                  Open: {path}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ background: '#121a33', borderRadius: 12, padding: 14 }}>
          <h2 style={{ marginTop: 0 }}>Research Reader</h2>
          <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 8 }}>Selected: {selectedPath || '—'}</div>
          {!selectedPath && <div style={{ opacity: 0.75 }}>Select a source document to open.</div>}
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
