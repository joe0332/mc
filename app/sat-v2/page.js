'use client'

import { useEffect, useMemo, useState } from 'react'

const COPY = {
  parent: {
    badge: 'For Parents',
    title: 'Achieve a life-changing SAT score — with a study plan that adapts daily.',
    subtitle:
      'Recall Labs helps your student focus on weak spots, reinforce strengths, and improve efficiently without wasting time on what they already know.',
    bullets: [
      'Adaptive SAT practice based on real performance',
      'Subtopic-level tracking for clear parent visibility',
      'Explanations for every question to prevent repeat mistakes',
    ],
    cta: 'Start Smart SAT Prep — $49',
    support: 'Cancel anytime • Full refund if it\'s not a fit',
  },
  student: {
    badge: 'For Students',
    title: 'Raise your SAT score faster by practicing what you actually need.',
    subtitle:
      'Recall Labs adapts in real time to your mistakes, prioritizes weak subtopics, and keeps daily sessions focused so every minute counts.',
    bullets: [
      'Personalized SAT question flow that adapts as you improve',
      'Instant explanations so you stop repeating the same misses',
      'Spaced reinforcement to lock in concepts over time',
    ],
    cta: 'Start My SAT Plan — $49',
    support: 'Early pricing • Cancel anytime • Full refund if it\'s not a fit',
  },
}

const styles = {
  page: {
    minHeight: '100vh',
    background: 'radial-gradient(1200px 600px at 80% -10%, #244b88 0%, rgba(36,75,136,0) 60%), linear-gradient(180deg, #060b16 0%, #0b1020 100%)',
    color: '#ecf3ff',
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Inter, sans-serif',
  },
  wrap: { maxWidth: 1080, margin: '0 auto', padding: '28px 20px 80px' },
  nav: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22,
    backdropFilter: 'blur(8px)', background: 'rgba(15,23,42,0.45)', border: '1px solid rgba(148,163,184,.25)', borderRadius: 14, padding: '12px 14px'
  },
  badge: {
    display: 'inline-block', padding: '7px 11px', borderRadius: 999, fontSize: 12, fontWeight: 600,
    background: 'rgba(59,130,246,.18)', border: '1px solid rgba(96,165,250,.4)', color: '#bfdbfe', marginBottom: 14
  },
  hero: {
    borderRadius: 28,
    border: '1px solid rgba(148,163,184,.25)',
    background: 'linear-gradient(180deg, rgba(15,23,42,.75) 0%, rgba(15,23,42,.45) 100%)',
    boxShadow: '0 40px 80px rgba(2,6,23,.45)',
    padding: '42px 36px',
  },
  title: { fontSize: 'clamp(2rem, 4.6vw, 4rem)', lineHeight: 1.03, margin: '0 0 14px', letterSpacing: '-.02em' },
  subtitle: { fontSize: 'clamp(1rem, 1.7vw, 1.25rem)', opacity: .9, maxWidth: 860, marginTop: 0 },
  bulletGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 10, marginTop: 20, marginBottom: 26 },
  bullet: { background: 'rgba(2,6,23,.35)', border: '1px solid rgba(148,163,184,.2)', borderRadius: 12, padding: '12px 13px', fontSize: 14 },
  cta: {
    display: 'inline-block', textDecoration: 'none', borderRadius: 999, padding: '13px 20px',
    background: 'linear-gradient(180deg, #3b82f6 0%, #2563eb 100%)', color: 'white', fontWeight: 700,
    boxShadow: '0 10px 30px rgba(37,99,235,.45)'
  },
  support: { marginTop: 9, opacity: .78, fontSize: 13 },
  section: { marginTop: 18, borderRadius: 18, border: '1px solid rgba(148,163,184,.25)', background: 'rgba(15,23,42,.5)', padding: 18 },
  h2: { marginTop: 0, marginBottom: 12, letterSpacing: '-.01em' },
  proofGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 10 },
  proofCard: { border: '1px solid rgba(148,163,184,.2)', borderRadius: 12, padding: 12, background: 'rgba(2,6,23,.28)' },
  code: { background: 'rgba(2,6,23,.45)', border: '1px solid rgba(148,163,184,.25)', borderRadius: 10, padding: 12, whiteSpace: 'pre-wrap', fontSize: 12, lineHeight: 1.45 }
}

export default function SATV2Page() {
  const [mode, setMode] = useState('parent')

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search)
    const aud = (sp.get('aud') || 'parent').toLowerCase()
    setMode(aud === 'student' ? 'student' : 'parent')
  }, [])

  const c = useMemo(() => COPY[mode], [mode])

  return (
    <main style={styles.page}>
      <div style={styles.wrap}>
        <div style={styles.nav}>
          <div style={{ fontWeight: 700 }}>Recall Labs · SAT V2 Demo</div>
          <div style={{ opacity: .85, fontSize: 13 }}>Audience: <strong>{mode}</strong> · <code>?aud=parent</code> / <code>?aud=student</code></div>
        </div>

        <section style={styles.hero}>
          <span style={styles.badge}>{c.badge}</span>
          <h1 style={styles.title}>{c.title}</h1>
          <p style={styles.subtitle}>{c.subtitle}</p>

          <div style={styles.bulletGrid}>
            {c.bullets.map((b) => <div key={b} style={styles.bullet}>✓ {b}</div>)}
          </div>

          <a href="https://buy.stripe.com/dRm6oH0RD2v9aKka8Y6AM01" style={styles.cta}>{c.cta}</a>
          <div style={styles.support}>{c.support}</div>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>Trust + Proof Blocks (Placeholder Structure)</h2>
          <div style={styles.proofGrid}>
            <div style={styles.proofCard}><strong>Score Gains</strong><div style={{ opacity: .85, marginTop: 4 }}>Add pilot results or case proof here.</div></div>
            <div style={styles.proofCard}><strong>What Happens in Week 1</strong><div style={{ opacity: .85, marginTop: 4 }}>Onboarding, diagnostic, first adaptive cycle.</div></div>
            <div style={styles.proofCard}><strong>Parent Visibility</strong><div style={{ opacity: .85, marginTop: 4 }}>Subtopic dashboard screenshot block.</div></div>
          </div>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>UTM Routing (Ready to Use)</h2>
          <pre style={styles.code}>{`Parent campaign URL:
https://www.recalllabs.io/sat-v2?aud=parent&utm_source=google&utm_medium=cpc&utm_campaign=sat_parent&utm_content=heroA

Student campaign URL:
https://www.recalllabs.io/sat-v2?aud=student&utm_source=google&utm_medium=cpc&utm_campaign=sat_student&utm_content=heroA`}</pre>
        </section>
      </div>
    </main>
  )
}
