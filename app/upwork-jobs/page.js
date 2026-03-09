'use client'

import { useEffect, useState } from 'react'

function fmt(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString()
}

export default function UpworkJobsPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [prefsDraft, setPrefsDraft] = useState({})
  const [savingKey, setSavingKey] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/upwork-jobs', { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load Upwork jobs')
      setData(json)
      const nextDraft = {}
      ;(json.rows || []).forEach((r) => {
        const key = String(r.job_url || r.job_title || '')
        if (!key) return
        nextDraft[key] = { interest: r.interest || '', feedback: r.feedback || '' }
      })
      setPrefsDraft(nextDraft)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function savePreference(row) {
    const key = String(row.job_url || row.job_title || '')
    if (!key) return
    const draft = prefsDraft[key] || {}
    setSavingKey(key)
    try {
      const res = await fetch('/api/upwork-jobs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, interest: draft.interest, feedback: draft.feedback })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to save preference')
      await load()
    } catch (e) {
      setError(e.message)
    } finally {
      setSavingKey('')
    }
  }

  useEffect(() => { load() }, [])

  return (
    <main style={{ minHeight: '100vh', padding: 24, background: '#0b1020', color: '#e8ecf3', fontFamily: 'Inter, Segoe UI, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 30 }}>Upwork Job Radar</h1>
          <p style={{ margin: '6px 0 0', opacity: 0.8 }}>Daily shortlist archive for automation opportunities.</p>
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
              <div style={{ border: '1px solid #334155', borderRadius: 8, padding: 10 }}><div style={{ opacity: 0.72, fontSize: 12 }}>Total Logged Jobs</div><div style={{ fontSize: 24, fontWeight: 700 }}>{data.metrics?.total ?? 0}</div></div>
              <div style={{ border: '1px solid #334155', borderRadius: 8, padding: 10 }}><div style={{ opacity: 0.72, fontSize: 12 }}>Fixed Price</div><div style={{ fontSize: 24, fontWeight: 700 }}>{data.metrics?.fixed ?? 0}</div></div>
              <div style={{ border: '1px solid #334155', borderRadius: 8, padding: 10 }}><div style={{ opacity: 0.72, fontSize: 12 }}>Hourly</div><div style={{ fontSize: 24, fontWeight: 700 }}>{data.metrics?.hourly ?? 0}</div></div>
              <div style={{ border: '1px solid #334155', borderRadius: 8, padding: 10 }}><div style={{ opacity: 0.72, fontSize: 12 }}>3+ Months/Ongoing</div><div style={{ fontSize: 24, fontWeight: 700 }}>{data.metrics?.longTerm ?? 0}</div></div>
            </div>
          </section>

          <section style={{ background: '#121a33', borderRadius: 12, padding: 14, marginTop: 14 }}>
            <h2 style={{ marginTop: 0 }}>Daily Job Log</h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1200 }}>
                <thead>
                  <tr style={{ textAlign: 'left', opacity: 0.9 }}>
                    <th>Timestamp (EST)</th>
                    <th>Title</th>
                    <th>Type</th>
                    <th>Budget/Rate</th>
                    <th>Duration</th>
                    <th>Summary</th>
                    <th>Why Fit</th>
                    <th>Status</th>
                    <th>Interest (1-5)</th>
                    <th>Your Feedback</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.rows || []).map((r, i) => (
                    <tr key={`${r.job_url || r.job_title}-${i}`} style={{ borderTop: '1px solid #26314f' }}>
                      <td style={{ padding: '8px 6px' }}>{r.scan_timestamp_est || '—'}</td>
                      <td style={{ maxWidth: 320 }}>
                        {r.job_url ? <a href={r.job_url} target='_blank' style={{ color: '#93c5fd' }} rel='noreferrer'>{r.job_title || r.job_url}</a> : (r.job_title || '—')}
                      </td>
                      <td>{r.job_type || '—'}</td>
                      <td>{r.budget_or_rate || '—'}</td>
                      <td>{r.duration_hint || '—'}</td>
                      <td style={{ maxWidth: 320 }}>{r.summary || '—'}</td>
                      <td style={{ maxWidth: 260 }}>{r.why_fit || '—'}</td>
                      <td>{r.status || 'shortlisted'}</td>
                      <td>
                        <select
                          value={prefsDraft[String(r.job_url || r.job_title || '')]?.interest || ''}
                          onChange={(e) => {
                            const key = String(r.job_url || r.job_title || '')
                            setPrefsDraft((prev) => ({ ...prev, [key]: { ...(prev[key] || {}), interest: e.target.value } }))
                          }}
                          style={{ background: '#0b1020', color: '#e8ecf3', border: '1px solid #334155', borderRadius: 6, padding: '6px 8px' }}
                        >
                          <option value=''>—</option>
                          <option value='1'>1</option>
                          <option value='2'>2</option>
                          <option value='3'>3</option>
                          <option value='4'>4</option>
                          <option value='5'>5</option>
                        </select>
                      </td>
                      <td style={{ minWidth: 260 }}>
                        <textarea
                          rows={2}
                          value={prefsDraft[String(r.job_url || r.job_title || '')]?.feedback || ''}
                          onChange={(e) => {
                            const key = String(r.job_url || r.job_title || '')
                            setPrefsDraft((prev) => ({ ...prev, [key]: { ...(prev[key] || {}), feedback: e.target.value } }))
                          }}
                          placeholder='What you like / dislike'
                          style={{ width: '100%', background: '#0b1020', color: '#e8ecf3', border: '1px solid #334155', borderRadius: 6, padding: '6px 8px' }}
                        />
                      </td>
                      <td>
                        <button onClick={() => savePreference(r)} disabled={savingKey === String(r.job_url || r.job_title || '')} style={{ background: '#2563eb', color: 'white', border: 0, borderRadius: 6, padding: '6px 10px', cursor: 'pointer', opacity: savingKey === String(r.job_url || r.job_title || '') ? 0.7 : 1 }}>
                          {savingKey === String(r.job_url || r.job_title || '') ? 'Saving…' : 'Save'}
                        </button>
                      </td>
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
