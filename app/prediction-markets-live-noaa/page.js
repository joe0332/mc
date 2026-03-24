'use client'

import { useEffect, useState } from 'react'

function fmt(ts) {
  if (!ts) return '—'
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false
  }).format(new Date(ts)) + ' EST'
}

function usd(v) {
  if (v == null || Number.isNaN(Number(v))) return '—'
  return `$${Number(v).toFixed(2)}`
}

function pct(v) {
  if (v == null || Number.isNaN(Number(v))) return '—'
  return `${Number(v).toFixed(1)}%`
}

export default function LiveNoaaPredictionMarketsPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/prediction-markets-live-noaa', { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load live prediction market data')
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
          <h1 style={{ margin: 0, fontSize: 30 }}>Live NOAA-Only Prediction Markets</h1>
          <p style={{ margin: '6px 0 0', opacity: 0.8 }}>Real-cash Coinbase weather trades using the NOAA-only strategy with transaction-based settlement tracking.</p>
          <div style={{ marginTop: 6, opacity: 0.72, fontSize: 13 }}>Last ledger update: {fmt(data?.updatedAtMs)}</div>
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
            <h2 style={{ marginTop: 0 }}>Bankroll Guardrails</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 8 }}>
              <div style={card}><div style={label}>Budget Ceiling</div><div style={value}>{usd(data.bankroll?.configuredBudget)}</div></div>
              <div style={card}><div style={label}>Max Per Trade</div><div style={value}>{usd(data.bankroll?.maxPerTrade)}</div></div>
              <div style={card}><div style={label}>Open Stake</div><div style={value}>{usd(data.bankroll?.openStake)}</div></div>
              <div style={card}><div style={label}>Realized Net P/L</div><div style={{ ...value, color: Number(data.bankroll?.realizedPnl || 0) >= 0 ? '#86efac' : '#fca5a5' }}>{usd(data.bankroll?.realizedPnl)}</div></div>
              <div style={card}><div style={label}>Available To Deploy</div><div style={value}>{usd(data.bankroll?.availableToDeploy)}</div></div>
            </div>
          </section>

          <section style={{ background: '#121a33', borderRadius: 12, padding: 14, marginTop: 14 }}>
            <h2 style={{ marginTop: 0 }}>Performance Snapshot</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 8 }}>
              <div style={card}><div style={label}>Trades</div><div style={value}>{data.metrics?.totalTrades ?? 0}</div></div>
              <div style={card}><div style={label}>Open</div><div style={value}>{data.metrics?.openTrades ?? 0}</div></div>
              <div style={card}><div style={label}>Wins</div><div style={{ ...value, color: '#86efac' }}>{data.metrics?.wins ?? 0}</div></div>
              <div style={card}><div style={label}>Losses</div><div style={{ ...value, color: '#fca5a5' }}>{data.metrics?.losses ?? 0}</div></div>
              <div style={card}><div style={label}>Win Rate</div><div style={value}>{pct(data.metrics?.winRate)}</div></div>
              <div style={card}><div style={label}>Net P/L</div><div style={{ ...value, color: Number(data.metrics?.netPnl || 0) >= 0 ? '#86efac' : '#fca5a5' }}>{usd(data.metrics?.netPnl)}</div></div>
            </div>
          </section>

          <section style={{ background: '#121a33', borderRadius: 12, padding: 14, marginTop: 14 }}>
            <h2 style={{ marginTop: 0 }}>Live Trade Ledger</h2>
            <div style={{ overflowX: 'auto', marginTop: 10 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1700 }}>
                <thead>
                  <tr style={{ textAlign: 'left', opacity: 0.9 }}>
                    <th>Entry</th><th>City / Context</th><th>Market</th><th>Option</th><th>Side</th><th>Stake</th><th>To Win</th><th>Shares</th><th>Market/NOAA</th><th>Edge</th><th>Status</th><th>Payout</th><th>Net</th><th>Outcome</th><th>Settlement</th><th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.trades || []).map((t, idx) => (
                    <tr key={`${t.EntryTimestamp}-${idx}`} style={{ borderTop: '1px solid #26314f' }}>
                      <td style={{ padding: '8px 6px' }}><div>{fmt(t.EntryTimestamp)}</div><div style={{ fontSize: 11, opacity: 0.72 }}>{t.EntryTimeLocal || '—'}</div></td>
                      <td style={{ maxWidth: 260 }}><div>{t.City || '—'}</div><div style={{ fontSize: 11, opacity: 0.72 }}>Temp {t.CurrentTempAtEntryF || '—'}°F · High so far {t.OfficialHighSoFarAtEntryF || '—'}°F</div><div style={{ fontSize: 11, opacity: 0.72 }}>Sunset T-{t.MinutesToSunsetAtEntry || '—'}m · {t.CurrentWeatherAtEntry || '—'}</div><div style={{ fontSize: 11, opacity: 0.72 }}>Stage {t.ExecutionStage || '—'}</div></td>
                      <td style={{ maxWidth: 280 }}><div>{t.MarketKey || '—'}</div><div style={{ fontSize: 11, opacity: 0.72 }}>{t.Contract || '—'}</div><div style={{ fontSize: 11, opacity: 0.72, wordBreak: 'break-all' }}>{t.MarketURL || '—'}</div></td>
                      <td>{t.ChosenOption || '—'}</td>
                      <td>{t.Side || '—'}</td>
                      <td>{usd(t.stakeUSD)}</td>
                      <td>{usd(t.amountToWinUSD)}</td>
                      <td>{t.Shares || '—'}</td>
                      <td>{pct(t.marketProb)} / {pct(t.noaaEstProb)}</td>
                      <td>{t.edgePct != null ? `${Number(t.edgePct).toFixed(1)}pp` : '—'}</td>
                      <td>{t.Status || '—'}</td>
                      <td>{usd(t.actualPayoutUSD)}</td>
                      <td style={{ color: t.netPnLUSD == null ? '#cbd5e1' : Number(t.netPnLUSD) >= 0 ? '#86efac' : '#fca5a5', fontWeight: 700 }}>{usd(t.netPnLUSD)}</td>
                      <td style={{ color: t.Outcome === 'WIN' ? '#86efac' : t.Outcome === 'LOSS' ? '#fca5a5' : '#cbd5e1', fontWeight: 700 }}>{t.Outcome || 'OPEN'}</td>
                      <td style={{ maxWidth: 240 }}><div>{t.SettlementSource || '—'}</div><div style={{ fontSize: 11, opacity: 0.72 }}>{t.CoinbaseTransactionRef || ''}</div></td>
                      <td style={{ maxWidth: 320, fontSize: 12, opacity: 0.9 }}>{t.Notes || t.SettlementNotes || '—'}</td>
                    </tr>
                  ))}
                  {(data.trades || []).length === 0 && <tr><td colSpan={16} style={{ padding: '10px 6px', opacity: 0.75 }}>No live trades logged yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </main>
  )
}

const card = { border: '1px solid #334155', borderRadius: 8, padding: 10 }
const label = { opacity: 0.72, fontSize: 12 }
const value = { fontSize: 24, fontWeight: 700 }
