'use client'

const ASSUMED_GROSS_CAPITAL = 1000000

const tableRows = [
  {
    window: 'Dec 2025 SATA #1',
    ticker: 'SATA',
    buyBy: '2025-11-28',
    buyClose: '93.71',
    exDate: '2025-12-01',
    sellDate: '2025-12-01',
    sellClose: '91.65',
    dividend: '1.1333',
    priceChange: '-2.06',
    netCapture: '-0.9267',
    returnPct: '-0.99%',
    payout: '2025-12-15',
    status: 'Confirmed',
    notes: 'Yahoo Finance historical closes via relay-backed tab. Dec 2025 SATA window was a loser.'
  },
  {
    window: 'Dec 2025 STRC',
    ticker: 'STRC',
    buyBy: '2025-12-15',
    buyClose: '97.84',
    exDate: '2025-12-15',
    sellDate: '2025-12-16',
    sellClose: '97.33',
    dividend: '0.8958',
    priceChange: '-0.51',
    netCapture: '+0.3858',
    returnPct: '+0.39%',
    payout: '2025-12-31',
    status: 'Rough proxy',
    notes: 'Uses quick-access Dec 15 / Dec 16 pair, so treat as directional rather than perfect.'
  },
  {
    window: 'Dec 2025 / Jan 2026 SATA #2',
    ticker: 'SATA',
    buyBy: '2025-12-30',
    buyClose: '95.00',
    exDate: '2025-12-31',
    sellDate: '2025-12-31',
    sellClose: '95.09',
    dividend: '1.0208',
    priceChange: '+0.09',
    netCapture: '+1.1108',
    returnPct: '+1.17%',
    payout: '2026-01-15',
    status: 'Confirmed',
    notes: 'Yahoo Finance historical closes via relay-backed tab. This SATA window outperformed the later Jan/Feb examples.'
  },
  {
    window: 'Jan 2026 STRC',
    ticker: 'STRC',
    buyBy: '2026-01-14',
    buyClose: '100.05',
    exDate: '2026-01-15',
    sellDate: '2026-01-15',
    sellClose: '99.99',
    dividend: '0.9167',
    priceChange: '-0.06',
    netCapture: '+0.8567',
    returnPct: '+0.86%',
    payout: '2026-01-31',
    status: 'Confirmed',
    notes: 'Good STRC window. Ex-date drop far smaller than dividend.'
  },
  {
    window: 'Jan 2026 SATA',
    ticker: 'SATA',
    buyBy: '2026-01-29',
    buyClose: '96.24',
    exDate: '2026-01-30',
    sellDate: '2026-01-30',
    sellClose: '94.84',
    dividend: '1.0208',
    priceChange: '-1.40',
    netCapture: '-0.3792',
    returnPct: '-0.39%',
    payout: '2026-02-15',
    status: 'Confirmed',
    notes: 'Observed ex-date drop exceeded dividend amount.'
  },
  {
    window: 'Feb 2026 STRC',
    ticker: 'STRC',
    buyBy: '2026-02-12',
    buyClose: '100.03',
    exDate: '2026-02-13',
    sellDate: '2026-02-13',
    sellClose: '99.80',
    dividend: '0.9375',
    priceChange: '-0.23',
    netCapture: '+0.7075',
    returnPct: '+0.71%',
    payout: '2026-02-28',
    status: 'Confirmed',
    notes: 'Again STRC held up better than a generic dividend-capture objection would suggest.'
  },
  {
    window: 'Feb 2026 SATA',
    ticker: 'SATA',
    buyBy: '2026-02-26',
    buyClose: '96.39',
    exDate: '2026-02-27',
    sellDate: '2026-02-27',
    sellClose: '94.81',
    dividend: '1.0417',
    priceChange: '-1.58',
    netCapture: '-0.5383',
    returnPct: '-0.56%',
    payout: '2026-03-15',
    status: 'Confirmed',
    notes: 'Second observed SATA window where price damage was worse than dividend income.'
  },
  {
    window: 'Mar 2026 STRC',
    ticker: 'STRC',
    buyBy: '2026-03-12',
    buyClose: '100.01',
    exDate: '2026-03-13',
    sellDate: '2026-03-13',
    sellClose: '99.75',
    dividend: '0.9583',
    priceChange: '-0.26',
    netCapture: '+0.6983',
    returnPct: '+0.70%',
    payout: '2026-03-31',
    status: 'Confirmed',
    notes: 'Consistent with recent STRC behavior clustering close to par.'
  }
]

const enrichedRows = tableRows.map((row) => {
  const buyClose = Number(row.buyClose)
  const netCapture = Number(String(row.netCapture).replace('+', ''))
  const shares = Number.isFinite(buyClose) && buyClose > 0 ? ASSUMED_GROSS_CAPITAL / buyClose : 0
  const pnlDollars = shares * netCapture
  return {
    ...row,
    pnlDollars,
    pnlDisplay: `${pnlDollars >= 0 ? '+' : '-'}$${Math.abs(pnlDollars).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
  }
})

const totalPnlDollars = enrichedRows.reduce((sum, row) => sum + row.pnlDollars, 0)

const summaryRows = [
  { label: 'Confirmed-window per-share net capture', value: '+1.9149', note: 'Simple sum of all now-confirmed rows with usable data.' },
  { label: '$1M gross total hop P/L', value: `${totalPnlDollars >= 0 ? '+' : '-'}$${Math.abs(totalPnlDollars).toLocaleString(undefined, { maximumFractionDigits: 0 })}`, note: 'Adds the modeled dollar P/L from each hop assuming $1,000,000 gross deployed per trade.' },
  { label: '$1M gross exposure rough P/L', value: `${totalPnlDollars >= 0 ? '+' : '-'}$${Math.abs(totalPnlDollars).toLocaleString(undefined, { maximumFractionDigits: 0 })}`, note: 'Same assumption as the row-by-row table: $1,000,000 gross deployed on each hop.' },
  { label: '$500k margin interest estimate', value: '-$7,300', note: 'Assumes $500,000 borrowed at 5% annual over roughly 3.5 months.' },
  { label: 'Net after interest on $500k equity / $1M gross', value: '+$11,600', note: 'Roughly +2.32% on equity over the observed period.' }
]

const risks = [
  'SATA has shown mixed ex-date behavior: one Dec 2025 window worked well, but Dec 2025 #1 plus the later Jan/Feb windows still showed price drops large enough to erase or overpower the dividend.',
  'This framework assumes clean execution at the close before ex-date and exit on ex-date, which real-world slippage can worsen.',
  'Margin magnifies even modest drawdowns and can force ugly exits if price behavior gets unstable.',
  'Issuer schedule changes, board declarations, and ex-date shifts can break the alternating rhythm if not monitored closely.',
  'Taxes, spreads, and borrow-rate changes were excluded here; each can materially reduce realized returns.',
  'Yahoo historical closes are good enough for review, but final trading decisions should still be checked against a broker-grade source before sizing up.'
]

const mechanics = [
  'Own the shares by the close of the trading day before the ex-dividend date.',
  'In normal U.S. market processing, selling on the ex-date still preserves dividend entitlement.',
  'The payment date matters for cash arrival, not for whether the dividend was earned.',
  'This is why a rotation between two monthly dividend names is mechanically possible at all.'
]

export default function StretchDividendStrategyPage() {
  return (
    <main style={{ minHeight: '100vh', padding: 24, background: '#0b1020', color: '#e8ecf3', fontFamily: 'Inter, Segoe UI, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 30 }}>Stretch Dividend Strategy</h1>
          <p style={{ margin: '8px 0 0', opacity: 0.82, maxWidth: 900 }}>
            Public review page for the STRC / SATA alternating dividend-capture idea: execution windows, backtest table, strategy mechanics, and the main risks.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <a href='/' style={{ background: '#334155', color: 'white', textDecoration: 'none', borderRadius: 8, padding: '10px 14px' }}>Mission Control Home</a>
        </div>
      </div>

      <section style={{ background: '#121a33', borderRadius: 12, padding: 14, marginTop: 14 }}>
        <h2 style={{ marginTop: 0 }}>How the strategy is supposed to work</h2>
        <ul style={{ marginTop: 8, lineHeight: 1.6 }}>
          {mechanics.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </section>

      <section style={{ background: '#121a33', borderRadius: 12, padding: 14, marginTop: 14 }}>
        <h2 style={{ marginTop: 0 }}>High-level verdict</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 10 }}>
          <div style={{ border: '1px solid #334155', borderRadius: 10, padding: 12 }}>
            <div style={{ opacity: 0.72, fontSize: 12 }}>Mechanical feasibility</div>
            <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>Yes</div>
            <div style={{ opacity: 0.8, fontSize: 13, marginTop: 6 }}>The timing works if the trader keys off ex-dates rather than payment dates.</div>
          </div>
          <div style={{ border: '1px solid #334155', borderRadius: 10, padding: 12 }}>
            <div style={{ opacity: 0.72, fontSize: 12 }}>Better leg so far</div>
            <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>STRC</div>
            <div style={{ opacity: 0.8, fontSize: 13, marginTop: 6 }}>Recent STRC ex-date drops were smaller than the dividend amount in observed windows.</div>
          </div>
          <div style={{ border: '1px solid #334155', borderRadius: 10, padding: 12 }}>
            <div style={{ opacity: 0.72, fontSize: 12 }}>Weak leg so far</div>
            <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>SATA</div>
            <div style={{ opacity: 0.8, fontSize: 13, marginTop: 6 }}>Observed SATA windows in Jan/Feb showed price drops larger than the dividend captured.</div>
          </div>
        </div>
      </section>

      <section style={{ background: '#121a33', borderRadius: 12, padding: 14, marginTop: 14 }}>
        <h2 style={{ marginTop: 0 }}>Execution + backtest table</h2>
        <div style={{ opacity: 0.78, marginBottom: 6 }}>Method used: buy at the close before ex-date, sell at the close on ex-date, assume dividend still received, ignore tax/commissions/slippage unless noted.</div>
        <div style={{ opacity: 0.78, marginBottom: 10 }}>Dollar P/L column assumes <strong>${ASSUMED_GROSS_CAPITAL.toLocaleString()}</strong> gross exposure deployed on each hop.</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: 1680, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', opacity: 0.88 }}>
                <th style={{ padding: '8px 10px' }}>Window</th>
                <th style={{ padding: '8px 10px' }}>Ticker</th>
                <th style={{ padding: '8px 10px' }}>Buy by</th>
                <th style={{ padding: '8px 10px' }}>Buy close</th>
                <th style={{ padding: '8px 10px' }}>Ex-date</th>
                <th style={{ padding: '8px 10px' }}>Sell date</th>
                <th style={{ padding: '8px 10px' }}>Sell close</th>
                <th style={{ padding: '8px 10px' }}>Dividend/share</th>
                <th style={{ padding: '8px 10px' }}>Price change</th>
                <th style={{ padding: '8px 10px' }}>Net capture/share</th>
                <th style={{ padding: '8px 10px' }}>Return</th>
                <th style={{ padding: '8px 10px' }}>Hop P/L ($1M)</th>
                <th style={{ padding: '8px 10px' }}>Payout</th>
                <th style={{ padding: '8px 10px' }}>Status</th>
                <th style={{ padding: '8px 10px' }}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {enrichedRows.map((row) => (
                <tr key={`${row.window}-${row.ticker}`} style={{ borderTop: '1px solid #26314f' }}>
                  <td style={{ padding: '10px' }}>{row.window}</td>
                  <td style={{ padding: '10px', fontWeight: 700 }}>{row.ticker}</td>
                  <td style={{ padding: '10px' }}>{row.buyBy}</td>
                  <td style={{ padding: '10px' }}>{row.buyClose}</td>
                  <td style={{ padding: '10px' }}>{row.exDate}</td>
                  <td style={{ padding: '10px' }}>{row.sellDate}</td>
                  <td style={{ padding: '10px' }}>{row.sellClose}</td>
                  <td style={{ padding: '10px' }}>{row.dividend}</td>
                  <td style={{ padding: '10px' }}>{row.priceChange}</td>
                  <td style={{ padding: '10px', fontWeight: 700, color: String(row.netCapture).startsWith('-') ? '#fca5a5' : '#86efac' }}>{row.netCapture}</td>
                  <td style={{ padding: '10px', fontWeight: 700, color: String(row.returnPct).startsWith('-') ? '#fca5a5' : '#86efac' }}>{row.returnPct}</td>
                  <td style={{ padding: '10px', fontWeight: 700, color: row.pnlDollars < 0 ? '#fca5a5' : '#86efac' }}>{row.pnlDisplay}</td>
                  <td style={{ padding: '10px' }}>{row.payout}</td>
                  <td style={{ padding: '10px' }}>{row.status}</td>
                  <td style={{ padding: '10px', minWidth: 260 }}>{row.notes}</td>
                </tr>
              ))}
              <tr style={{ borderTop: '2px solid #475569', background: '#0f172a' }}>
                <td style={{ padding: '10px', fontWeight: 800 }} colSpan={11}>Total modeled hop P/L</td>
                <td style={{ padding: '10px', fontWeight: 800, color: totalPnlDollars < 0 ? '#fca5a5' : '#86efac' }}>
                  {`${totalPnlDollars >= 0 ? '+' : '-'}$${Math.abs(totalPnlDollars).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                </td>
                <td style={{ padding: '10px', opacity: 0.7 }} colSpan={3}>Assumes ${ASSUMED_GROSS_CAPITAL.toLocaleString()} gross exposure deployed on each row.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section style={{ background: '#121a33', borderRadius: 12, padding: 14, marginTop: 14 }}>
        <h2 style={{ marginTop: 0 }}>Modeled summary</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 10 }}>
          {summaryRows.map((row) => (
            <div key={row.label} style={{ border: '1px solid #334155', borderRadius: 10, padding: 12 }}>
              <div style={{ opacity: 0.72, fontSize: 12 }}>{row.label}</div>
              <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4 }}>{row.value}</div>
              <div style={{ opacity: 0.8, fontSize: 13, marginTop: 6 }}>{row.note}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ background: '#121a33', borderRadius: 12, padding: 14, marginTop: 14 }}>
        <h2 style={{ marginTop: 0 }}>Key risks</h2>
        <ul style={{ marginTop: 8, lineHeight: 1.6 }}>
          {risks.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </section>
    </main>
  )
}
