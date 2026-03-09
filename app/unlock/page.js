'use client'

import { useState } from 'react'

export default function UnlockPage() {
  const [code, setCode] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setErr('')
    try {
      const next = new URLSearchParams(window.location.search).get('next') || '/'
      const res = await fetch('/api/auth/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, next })
      })
      const json = await res.json()
      if (!res.ok || !json?.ok) throw new Error(json?.error || 'Invalid code')
      window.location.href = json.next || '/'
    } catch (e2) {
      setErr(e2.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#0b1020', color: '#e8ecf3', fontFamily: 'Inter, Segoe UI, sans-serif' }}>
      <form onSubmit={submit} style={{ width: 320, background: '#121a33', border: '1px solid #334155', borderRadius: 12, padding: 16 }}>
        <h1 style={{ marginTop: 0, fontSize: 22 }}>Mission Control Unlock</h1>
        <p style={{ opacity: 0.8, marginTop: 4 }}>Enter 5-digit passcode</p>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 5))}
          inputMode='numeric'
          placeholder='12345'
          style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #334155', background: '#0b1020', color: '#e8ecf3' }}
        />
        {err && <div style={{ marginTop: 8, color: '#fca5a5', fontSize: 13 }}>{err}</div>}
        <button disabled={busy || code.length !== 5} style={{ marginTop: 10, width: '100%', border: 0, borderRadius: 8, padding: '10px 12px', background: '#2563eb', color: 'white', cursor: 'pointer' }}>
          {busy ? 'Unlocking…' : 'Unlock'}
        </button>
      </form>
    </main>
  )
}
