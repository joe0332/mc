'use client'

import { useEffect, useState } from 'react'

function fmt(ts) {
  if (!ts) return '—'
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(new Date(ts)) + ' EST'
}

function pct(v) {
  if (v == null || Number.isNaN(Number(v))) return '—'
  return `${Number(v).toFixed(1)}%`
}

function edgeTone(v) {
  if (v == null) return '#94a3b8'
  if (v > 0) return '#86efac'
  if (v < 0) return '#fca5a5'
  return '#cbd5e1'
}

function usd(v) {
  if (v == null || Number.isNaN(Number(v))) return '—'
  return `$${Number(v).toFixed(2)}`
}

export default function PredictionMarketsPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [settling, setSettling] = useState(false)
  const [error, setError] = useState('')
  const [settleMsg, setSettleMsg] = useState('')
  const [commitFilter, setCommitFilter] = useState('all')

  async function load() {
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/prediction-markets-noaa', { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load prediction market data')
      setData(json)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function runSettlementCheck() {
    setSettleMsg('')
    setSettling(true)
    setError('')
    try {
      const res = await fetch('/api/prediction-markets-noaa', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Settlement check failed')
      setData(json.overview)
      const r = json.result || {}
      setSettleMsg(`Checked ${r.checkedMarkets || 0} market(s), settled ${r.settledMarkets || 0}, updated ${r.updatedRows || 0} row(s).`)
    } catch (e) {
      setError(e.message)
    } finally {
      setSettling(false)
    }
  }

  useEffect(() => { load() }, [])

  const filteredTrades = (data?.trades || []).filter((t) => {
    if (commitFilter === 'commits') return !!t.committed
    if (commitFilter === 'non_commits') return !t.committed
    return true
  })

  return (
    <main style={{ minHeight: '100vh', padding: 24, background: '#0b1020', color: '#e8ecf3', fontFamily: 'Inter, Segoe UI, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 30 }}>NOAA/NWS Prediction Markets Overview</h1>
          <p style={{ margin: '6px 0 0', opacity: 0.8 }}>NOAA/NWS-only paper-trade commits, edge evolution, and win/loss tracking.</p>
          <div style={{ marginTop: 6, opacity: 0.72, fontSize: 13 }}>Last CSV update: {fmt(data?.updatedAtMs)}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <a href='/' style={{ background: '#334155', color: 'white', textDecoration: 'none', borderRadius: 8, padding: '10px 14px' }}>Back to Mission Control</a>
          <button onClick={runSettlementCheck} disabled={settling} style={{ background: '#0f766e', color: 'white', border: 0, borderRadius: 8, padding: '10px 14px', cursor: 'pointer', opacity: settling ? 0.7 : 1 }}>{settling ? 'Checking…' : 'Run Settlement Check'}</button>
          <button onClick={load} style={{ background: '#2563eb', color: 'white', border: 0, borderRadius: 8, padding: '10px 14px', cursor: 'pointer' }}>Refresh</button>
        </div>
      </div>

      {error && <div style={{ background: '#7f1d1d', padding: 10, borderRadius: 8, marginTop: 12 }}>Error: {error}</div>}
      {settleMsg && <div style={{ background: '#14532d', padding: 10, borderRadius: 8, marginTop: 12 }}>{settleMsg}</div>}
      {loading && <div style={{ marginTop: 14 }}>Loading…</div>}

      {data && (
        <>
          <section style={{ background: '#121a33', borderRadius: 12, padding: 14, marginTop: 14 }}>
            <h2 style={{ marginTop: 0 }}>Performance Snapshot</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 8 }}>
              <div style={{ border: '1px solid #334155', borderRadius: 8, padding: 10 }}><div style={{ opacity: 0.72, fontSize: 12 }}>Commits</div><div style={{ fontSize: 24, fontWeight: 700 }}>{data.metrics?.totalCommits ?? 0}</div></div>
              <div style={{ border: '1px solid #334155', borderRadius: 8, padding: 10 }}><div style={{ opacity: 0.72, fontSize: 12 }}>Resolved</div><div style={{ fontSize: 24, fontWeight: 700 }}>{data.metrics?.resolvedCommits ?? 0}</div></div>
              <div style={{ border: '1px solid #334155', borderRadius: 8, padding: 10 }}><div style={{ opacity: 0.72, fontSize: 12 }}>Wins</div><div style={{ fontSize: 24, fontWeight: 700, color: '#86efac' }}>{data.metrics?.wins ?? 0}</div></div>
              <div style={{ border: '1px solid #334155', borderRadius: 8, padding: 10 }}><div style={{ opacity: 0.72, fontSize: 12 }}>Losses</div><div style={{ fontSize: 24, fontWeight: 700, color: '#fca5a5' }}>{data.metrics?.losses ?? 0}</div></div>
              <div style={{ border: '1px solid #334155', borderRadius: 8, padding: 10 }}><div style={{ opacity: 0.72, fontSize: 12 }}>Win Rate</div><div style={{ fontSize: 24, fontWeight: 700 }}>{pct(data.metrics?.winRate)}</div></div>
              <div style={{ border: '1px solid #334155', borderRadius: 8, padding: 10 }}><div style={{ opacity: 0.72, fontSize: 12 }}>Avg Commit Edge</div><div style={{ fontSize: 24, fontWeight: 700 }}>{pct(data.metrics?.avgCommitEdge)}</div></div>
            </div>
          </section>

          <section style={{ background: '#121a33', borderRadius: 12, padding: 14, marginTop: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h2 style={{ marginTop: 0, marginBottom: 0 }}>Trade Ledger</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, opacity: 0.8 }}>Filter</span>
                <select value={commitFilter} onChange={(e) => setCommitFilter(e.target.value)} style={{ background: '#0b1020', color: '#e8ecf3', border: '1px solid #334155', borderRadius: 8, padding: '6px 8px' }}>
                  <option value='all'>All rows</option>
                  <option value='commits'>Commits only</option>
                  <option value='non_commits'>Non-commits only</option>
                </select>
                <span style={{ fontSize: 12, opacity: 0.75 }}>{filteredTrades.length} shown</span>
              </div>
            </div>
            <div style={{ overflowX: 'auto', marginTop: 10 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1200 }}>
                <thead>
                  <tr style={{ textAlign: 'left', opacity: 0.9 }}>
                    <th>Market</th>
                    <th>3 Options</th>
                    <th>Chosen</th>
                    <th>Pos.</th>
                    <th>Multi-Pos</th>
                    <th>Trade Date</th>
                    <th>Commit</th>
                    <th>Outcome</th>
                    <th>Winning Option</th>
                    <th>Settlement Source</th>
                    <th>Commit Edge</th>
                    <th>Latest Edge</th>
                    <th>Edge Drift</th>
                    <th>Commit Mkt/Est</th>
                    <th>Latest Mkt/Est</th>
                    <th>Scans</th>
                    <th>Estimated Wager</th>
                    <th>Payout</th>
                    <th>Edge Timeline</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTrades.map((t) => (
                    <tr key={t.marketKey || t.contractLabel} style={{ borderTop: '1px solid #26314f' }}>
                      <td style={{ padding: '8px 6px', maxWidth: 280 }}>
                        <div>{t.tradeDate ? `${t.tradeDate} · ${t.marketKey || t.contractLabel}` : (t.marketKey || t.contractLabel || '—')}</div>
                        <div style={{ fontSize: 11, opacity: 0.72 }}>{t.contractLabel || '—'}</div>
                      </td>
                      <td style={{ fontSize: 12, opacity: 0.9, maxWidth: 260 }}>
                        <div>1) {t.option1 || '—'}</div>
                        <div>2) {t.option2 || '—'}</div>
                        <div>3) {t.option3 || '—'}</div>
                      </td>
                      <td style={{ maxWidth: 220 }}>{t.chosenOption || '—'}</td>
                      <td>{t.positions?.length ? t.positions.join(' / ') : (t.position || '—')}</td>
                      <td>{t.multiPosition ? 'YES' : 'NO'}</td>
                      <td>{t.commitDate || t.latestDate || '—'}</td>
                      <td>{t.committed ? fmt(t.commitAtMs) : 'No commit'}</td>
                      <td style={{ color: (t.outcome || t.outcomeEstimate) === 'WIN' ? '#86efac' : (t.outcome || t.outcomeEstimate) === 'LOSS' ? '#fca5a5' : '#cbd5e1', fontWeight: 700 }}>
                        {t.outcome || (t.outcomeEstimate ? `${t.outcomeEstimate} (EST)` : 'OPEN')}
                        {!t.outcome && t.estimateConfidence ? <div style={{ fontSize: 11, opacity: 0.8, fontWeight: 500 }}>Confidence: {t.estimateConfidence}</div> : null}
                      </td>
                      <td>{t.settlementWinningOption || '—'}</td>
                      <td style={{ maxWidth: 250, fontSize: 12 }}>
                        {t.settlementSourceUrl ? <a href={t.settlementSourceUrl} target='_blank' rel='noopener noreferrer' style={{ color: '#93c5fd' }}>Source</a> : '—'}
                        {t.settlementSourceNote ? <div style={{ opacity: 0.78 }}>{t.settlementSourceNote}</div> : null}
                        {!t.settlementSourceNote && t.estimateSourceNote ? <div style={{ opacity: 0.78 }}>Provisional: {t.estimateSourceNote}</div> : null}
                      </td>
                      <td style={{ color: edgeTone(t.commitEdge), fontWeight: 700 }}>{pct(t.commitEdge)}</td>
                      <td style={{ color: edgeTone(t.latestEdge), fontWeight: 700 }}>{pct(t.latestEdge)}</td>
                      <td style={{ color: edgeTone(t.edgeDrift), fontWeight: 700 }}>{pct(t.edgeDrift)}</td>
                      <td>{pct(t.commitMarketProb)} / {pct(t.commitEstProb)}</td>
                      <td>{pct(t.latestMarketProb)} / {pct(t.latestEstProb)}</td>
                      <td>{t.scans}</td>
                      <td>{usd(t.estimatedWager)}</td>
                      <td style={{ fontWeight: 700, color: t.payout != null ? (t.payout > 0 ? '#86efac' : '#fca5a5') : '#cbd5e1' }}>
                        {t.payout != null
                          ? usd(t.payout)
                          : (t.payoutEstimate != null ? `${usd(t.payoutEstimate)} (EST)` : '—')}
                      </td>
                      <td style={{ maxWidth: 360, fontSize: 12, opacity: 0.9 }}>
                        {(t.edgeTimeline || []).slice(-5).map((e, idx) => (
                          <div key={`${t.marketKey || t.contractLabel}-${idx}`}>{fmt(e.ts)} · <span style={{ color: edgeTone(e.edge), fontWeight: 700 }}>{pct(e.edge)}</span> ({pct(e.marketProb)}/{pct(e.estProb)})</div>
                        ))}
                      </td>
                    </tr>
                  ))}
                  {filteredTrades.length === 0 && (
                    <tr>
                      <td colSpan={19} style={{ padding: '10px 6px', opacity: 0.75 }}>No rows for the selected filter.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </main>
  )
}
