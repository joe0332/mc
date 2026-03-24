'use client'

import { useEffect, useState } from 'react'

function fmt(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString()
}

function dur(ms) {
  if (!ms) return '—'
  if (ms < 1000) return `${ms} ms`
  const s = Math.round(ms / 1000)
  return `${s}s`
}

function num(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function calcRoi(inputs) {
  const weeklyVolume = num(inputs.weeklyVolume)
  const manualMin = num(inputs.manualMin)
  const autoMin = num(inputs.autoMin)
  const hourlyRate = num(inputs.hourlyRate)
  const monthlyToolCost = num(inputs.monthlyToolCost)
  const implementationCost = num(inputs.implementationCost)

  const weeklyHoursSaved = Math.max(((manualMin - autoMin) * weeklyVolume) / 60, 0)
  const monthlyHoursSaved = weeklyHoursSaved * 4.33
  const manualCostPerActivity = (manualMin / 60) * hourlyRate
  const automatedCostPerActivity = (autoMin / 60) * hourlyRate
  const savingsPerActivity = Math.max(manualCostPerActivity - automatedCostPerActivity, 0)

  const weeklyManualCostTotal = manualCostPerActivity * weeklyVolume
  const weeklyAutomatedCostTotal = automatedCostPerActivity * weeklyVolume
  const weeklySavingsTotal = Math.max(weeklyManualCostTotal - weeklyAutomatedCostTotal, 0)

  const monthlyManualCostTotal = weeklyManualCostTotal * 4.33
  const monthlyAutomatedCostTotal = weeklyAutomatedCostTotal * 4.33
  const monthlyGrossSavings = Math.max(monthlyManualCostTotal - monthlyAutomatedCostTotal, 0)
  const monthlyNetSavings = monthlyGrossSavings - monthlyToolCost
  const annualNetSavings = monthlyNetSavings * 12
  const paybackMonths = monthlyNetSavings > 0 ? (implementationCost / monthlyNetSavings) : null

  return {
    weeklyHoursSaved,
    monthlyHoursSaved,
    manualCostPerActivity,
    automatedCostPerActivity,
    savingsPerActivity,
    weeklyManualCostTotal,
    weeklyAutomatedCostTotal,
    weeklySavingsTotal,
    monthlyManualCostTotal,
    monthlyAutomatedCostTotal,
    monthlyGrossSavings,
    monthlyNetSavings,
    annualNetSavings,
    paybackMonths
  }
}

export default function MissionControlPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const [globalQuery, setGlobalQuery] = useState('')
  const [globalLoading, setGlobalLoading] = useState(false)
  const [globalResults, setGlobalResults] = useState({ jobs: [], cards: [], docs: [] })

  const [roiInputs, setRoiInputs] = useState({
    workflow: 'Lead Follow-up',
    weeklyVolume: 40,
    manualMin: 6,
    autoMin: 1,
    hourlyRate: 30,
    monthlyToolCost: 50,
    implementationCost: 1200
  })

  const [selectedJobId, setSelectedJobId] = useState('')
  const [jobDetail, setJobDetail] = useState(null)
  const [jobLoading, setJobLoading] = useState(false)
  const [runningNow, setRunningNow] = useState(false)

  const [memoryQuery, setMemoryQuery] = useState('')
  const [memoryDocs, setMemoryDocs] = useState([])
  const [memoryIndexedAt, setMemoryIndexedAt] = useState(null)
  const [memoryLoading, setMemoryLoading] = useState(false)
  const [selectedDocPath, setSelectedDocPath] = useState('')
  const [selectedDoc, setSelectedDoc] = useState(null)
  const [docLoading, setDocLoading] = useState(false)
  const [reindexing, setReindexing] = useState(false)
  const [memoryExpanded, setMemoryExpanded] = useState(false)
  const [docModalOpen, setDocModalOpen] = useState(false)

  const [kanbanCards, setKanbanCards] = useState([])
  const [kanbanLoading, setKanbanLoading] = useState(false)
  const [newCardTitle, setNewCardTitle] = useState('')
  const [newCardOwner, setNewCardOwner] = useState('Joe')
  const [dragCardId, setDragCardId] = useState('')
  const [editingCard, setEditingCard] = useState(null)
  const [modalCardEdits, setModalCardEdits] = useState({})
  const [savingDraftByCard, setSavingDraftByCard] = useState({})
  const [briefByCard, setBriefByCard] = useState({})
  const [briefLoadingByCard, setBriefLoadingByCard] = useState({})
  const [briefErrorByCard, setBriefErrorByCard] = useState({})
  const [briefUpdatedByCard, setBriefUpdatedByCard] = useState({})
  const [archivedExpanded, setArchivedExpanded] = useState(false)
  const [collapsed, setCollapsed] = useState({
    timeSaved: true,
    roi: true,
    globalSearch: true,
    scheduledJobs: true,
    recentRuns: true,
    jobDetails: true
  })
  const [uiTheme, setUiTheme] = useState('aurora')
  const [density, setDensity] = useState('cozy')
  const [layoutWidth, setLayoutWidth] = useState('wide')
  const [pageStyle, setPageStyle] = useState('modern')

  const themePresets = {
    midnight: {
      appBg: '#0b1020', panelBg: '#121a33', cardBg: '#0b1020', altBg: '#111827',
      text: '#e8ecf3', border: '#334155', softBorder: '#26314f', accent: '#2563eb',
      accentSoft: '#1e3a8a', danger: '#7f1d1d'
    },
    graphite: {
      appBg: '#0f1115', panelBg: '#171b22', cardBg: '#11151c', altBg: '#0e131a',
      text: '#edf2f7', border: '#3a4351', softBorder: '#2a323f', accent: '#0ea5e9',
      accentSoft: '#0c4a6e', danger: '#7f1d1d'
    },
    aurora: {
      appBg: '#07131a', panelBg: '#0d2330', cardBg: '#0a1a24', altBg: '#091620',
      text: '#e6f8ff', border: '#2a5a6d', softBorder: '#1e4557', accent: '#14b8a6',
      accentSoft: '#115e59', danger: '#7f1d1d'
    },
    warmpaper: {
      appBg: '#f7f2e8', panelBg: '#fff9ee', cardBg: '#fffdf7', altBg: '#f4ecdc',
      text: '#2b2a28', border: '#c7bca8', softBorder: '#e2d8c6', accent: '#8b5cf6',
      accentSoft: '#6d28d9', danger: '#9f1239'
    },
    cupertino: {
      appBg: '#f5f5f7', panelBg: 'rgba(255,255,255,0.72)', cardBg: '#ffffff', altBg: '#f0f2f5',
      text: '#1d1d1f', border: 'rgba(0,0,0,0.10)', softBorder: 'rgba(0,0,0,0.06)', accent: '#0071e3',
      accentSoft: '#0058b0', danger: '#b42318'
    }
  }

  async function load() {
    setError('')
    try {
      const res = await fetch('/api/dashboard', { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load dashboard')
      setData(json)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function refresh() {
    setRefreshing(true)
    setError('')
    try {
      const res = await fetch('/api/refresh', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Refresh failed')
      await load()
    } catch (e) {
      setError(e.message)
    } finally {
      setRefreshing(false)
    }
  }

  async function openJob(jobId) {
    setSelectedJobId(jobId)
    setJobDetail(null)
    setJobLoading(true)
    try {
      const res = await fetch(`/api/job?id=${encodeURIComponent(jobId)}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load job details')
      setJobDetail(json)
    } catch (e) {
      setError(e.message)
    } finally {
      setJobLoading(false)
    }
  }

  async function runNow() {
    if (!selectedJobId) return
    setRunningNow(true)
    setError('')
    try {
      const res = await fetch('/api/job/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedJobId })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Run failed')
      await refresh()
      await openJob(selectedJobId)
    } catch (e) {
      setError(e.message)
    } finally {
      setRunningNow(false)
    }
  }

  async function searchMemory(q = memoryQuery) {
    setMemoryLoading(true)
    try {
      const res = await fetch(`/api/memory/search?q=${encodeURIComponent(q)}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Memory search failed')
      setMemoryDocs(json.docs || [])
      setMemoryIndexedAt(json.memoryIndexedAt || null)
      if (!selectedDocPath && (json.docs || []).length > 0) openDoc(json.docs[0].relPath)
    } catch (e) {
      setError(e.message)
    } finally {
      setMemoryLoading(false)
    }
  }

  async function reindexMemory() {
    setReindexing(true)
    try {
      const res = await fetch('/api/memory/reindex', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Memory reindex failed')
      await searchMemory(memoryQuery)
    } catch (e) {
      setError(e.message)
    } finally {
      setReindexing(false)
    }
  }

  async function openDoc(relPath) {
    setSelectedDocPath(relPath)
    setDocLoading(true)
    setSelectedDoc(null)
    try {
      const res = await fetch(`/api/memory/doc?path=${encodeURIComponent(relPath)}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to open memory doc')
      setSelectedDoc(json)
    } catch (e) {
      setError(e.message)
    } finally {
      setDocLoading(false)
    }
  }

  async function loadKanban() {
    setKanbanLoading(true)
    try {
      const res = await fetch('/api/kanban', { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load kanban')
      setKanbanCards(json.cards || [])
    } catch (e) {
      setError(e.message)
    } finally {
      setKanbanLoading(false)
    }
  }

  async function createCard() {
    if (!newCardTitle.trim()) return
    try {
      const res = await fetch('/api/kanban', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newCardTitle.trim(), owner: newCardOwner, status: 'new' })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to create card')
      setNewCardTitle('')
      await loadKanban()
    } catch (e) {
      setError(e.message)
    }
  }

  async function searchAll(q = globalQuery) {
    const query = (q || '').trim()
    if (!query) {
      setGlobalResults({ jobs: [], cards: [], docs: [] })
      return
    }

    setGlobalLoading(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Global search failed')
      setGlobalResults({
        jobs: json.jobs || [],
        cards: json.cards || [],
        docs: json.docs || []
      })
    } catch (e) {
      setError(e.message)
    } finally {
      setGlobalLoading(false)
    }
  }

  async function moveCard(card, status) {
    try {
      // Communication-gate compatibility: log proof before terminal transitions.
      if (['done', 'review', 'completed'].includes(status)) {
        await fetch('/api/communications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channel: 'webchat',
            target: 'joe',
            reason: 'done_notice',
            related_card_id: card.id,
            delivery_status: 'sent',
            notes: `Mission Control move to ${status}`
          })
        })
      } else if (status === 'blocked') {
        await fetch('/api/communications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channel: 'webchat',
            target: 'joe',
            reason: 'blocking_question',
            related_card_id: card.id,
            delivery_status: 'sent',
            notes: 'Mission Control move to blocked'
          })
        })
      }

      const res = await fetch('/api/kanban/card', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: card.id, status })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to move card')
      await loadKanban()
    } catch (e) {
      setError(e.message)
    }
  }

  async function nudgeCardInLane(card, direction) {
    try {
      const laneCards = (kanbanCards || []).filter((c) => !c.isArchived && c.status === card.status)
      const idx = laneCards.findIndex((c) => c.id === card.id)
      if (idx < 0) return

      const targetIdx = direction === 'up' ? idx - 1 : idx + 1
      if (targetIdx < 0 || targetIdx >= laneCards.length) return

      const other = laneCards[targetIdx]
      const thisSort = Number(card.sortOrder || 0)
      const otherSort = Number(other.sortOrder || 0)

      await updateCard({ id: card.id, sortOrder: otherSort })
      await updateCard({ id: other.id, sortOrder: thisSort })
    } catch (e) {
      setError(e.message)
    }
  }

  async function updateCard(patch) {
    try {
      const res = await fetch('/api/kanban/card', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch || {})
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to update card')
      await loadKanban()
    } catch (e) {
      setError(e.message)
    }
  }

  async function deleteCard(card) {
    if (!card?.id) return
    const ok = window.confirm(`Delete card "${card.title || card.id}"?`)
    if (!ok) return
    try {
      const res = await fetch('/api/kanban/card', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: card.id })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to delete card')
      if (editingCard?.id === card.id) setEditingCard(null)
      await loadKanban()
    } catch (e) {
      setError(e.message)
    }
  }

  function getModalDraft(card) {
    const draft = modalCardEdits?.[card?.id] || {}
    return {
      feedback: draft.feedback ?? card?.feedback ?? '',
      nextSteps: draft.nextSteps ?? card?.nextSteps ?? ''
    }
  }

  function setModalDraft(cardId, patch = {}) {
    setModalCardEdits((prev) => ({
      ...prev,
      [cardId]: {
        ...(prev?.[cardId] || {}),
        ...patch
      }
    }))
  }

  async function saveInterimFeedback(card) {
    if (!card?.id) return
    const draft = getModalDraft(card)
    setSavingDraftByCard((prev) => ({ ...prev, [card.id]: true }))
    try {
      await updateCard({
        id: card.id,
        feedback: draft.feedback,
        nextSteps: draft.nextSteps
      })
      setModalCardEdits((prev) => ({ ...prev, [card.id]: draft }))
    } finally {
      setSavingDraftByCard((prev) => ({ ...prev, [card.id]: false }))
    }
  }

  async function handoffCard(card, to) {
    if (!card?.id) return
    const draft = getModalDraft(card)
    if (to === 'alfred') {
      await updateCard({ id: card.id, owner: 'Alfred', status: 'waiting_on_alfred', feedback: draft.feedback, nextSteps: draft.nextSteps })
      return
    }

    // Communication gate proof for review handoff
    await fetch('/api/communications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel: 'webchat',
        target: 'joe',
        reason: 'done_notice',
        related_card_id: card.id,
        delivery_status: 'sent',
        notes: 'Kanban handoff to review from Mission Control UI'
      })
    })

    await updateCard({ id: card.id, owner: 'Joe', status: 'review', feedback: draft.feedback, nextSteps: draft.nextSteps })
  }

  async function saveCardEdits() {
    if (!editingCard?.id) return
    try {
      const res = await fetch('/api/kanban/card', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingCard)
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to save card')
      setEditingCard(null)
      await loadKanban()
    } catch (e) {
      setError(e.message)
    }
  }

  async function generateBrief(card) {
    if (!card?.artifactLink) return
    setBriefLoadingByCard((prev) => ({ ...prev, [card.id]: true }))
    setBriefErrorByCard((prev) => ({ ...prev, [card.id]: '' }))
    try {
      const res = await fetch(`/api/kanban/brief?path=${encodeURIComponent(card.artifactLink)}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Brief generation failed')
      setBriefByCard((prev) => ({ ...prev, [card.id]: json.brief || 'No brief available.' }))
      setBriefUpdatedByCard((prev) => ({ ...prev, [card.id]: new Date().toLocaleTimeString() }))
    } catch (e) {
      const msg = e?.message || 'Brief generation failed'
      setBriefErrorByCard((prev) => ({ ...prev, [card.id]: msg }))
      setError(msg)
    } finally {
      setBriefLoadingByCard((prev) => ({ ...prev, [card.id]: false }))
    }
  }

  async function onDropColumn(status) {
    if (!dragCardId) return
    const card = kanbanCards.find((c) => c.id === dragCardId)
    setDragCardId('')
    if (!card || card.status === status) return
    await moveCard(card, status)
  }

  function isUrl(v = '') {
    return /^https?:\/\//i.test((v || '').trim())
  }

  async function openArtifact(card) {
    const link = (card?.artifactLink || '').trim()
    if (!link) return
    if (isUrl(link)) {
      window.open(link, '_blank', 'noopener,noreferrer')
      return
    }
    await openDoc(link)
    setTimeout(() => {
      const el = document.getElementById('memory-screen')
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 50)
  }

  async function openArtifactPopout(card) {
    const link = (card?.artifactLink || '').trim()
    if (!link) return
    if (isUrl(link)) {
      window.open(link, '_blank', 'noopener,noreferrer')
      return
    }
    await openDoc(link)
    setDocModalOpen(true)
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    const id = setTimeout(() => {
      refresh().catch(() => {})
    }, 150)
    return () => clearTimeout(id)
  }, [])

  useEffect(() => {
    if (!data?.jobs?.length) return
    const exists = data.jobs.some((j) => j.id === selectedJobId)
    if (!selectedJobId || !exists) {
      openJob(data.jobs[0].id)
    }
  }, [data])

  useEffect(() => {
    reindexMemory()
    loadKanban()
  }, [])

  const roi = calcRoi(roiInputs)
  const theme = themePresets[uiTheme] || themePresets.midnight
  const shellPadding = density === 'compact' ? 14 : 24
  const panelPadding = density === 'compact' ? 10 : 14
  const maxWidth = layoutWidth === 'contained' ? 1360 : '100%'
  const docLinkedCards = (kanbanCards || []).filter((c) => {
    const artifact = (c?.artifactLink || '').trim().replace(/\\/g, '/')
    const rel = (selectedDoc?.relPath || selectedDocPath || '').trim().replace(/\\/g, '/')
    return !!artifact && !!rel && artifact === rel
  })

  return (
    <main data-ui-theme={uiTheme} data-density={density} data-page-style={pageStyle} style={{ minHeight: '100vh', padding: shellPadding, background: theme.appBg, color: theme.text, fontFamily: pageStyle === 'apple' ? '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif' : 'Inter, Segoe UI, sans-serif' }}>
      <style jsx global>{`
        main[data-ui-theme] {
          transition: background 220ms ease, color 220ms ease;
        }
        main[data-page-style='modern'] {
          background-image: radial-gradient(circle at 10% 0%, rgba(255,255,255,0.06), transparent 32%), radial-gradient(circle at 90% 100%, rgba(14,165,233,0.14), transparent 28%);
        }
        main[data-page-style='modern'] section {
          border-radius: 16px !important;
          box-shadow: 0 10px 32px rgba(0,0,0,0.25);
        }
        main[data-page-style='modern'] h1 {
          letter-spacing: 0.02em;
          font-size: 36px !important;
        }
        main[data-page-style='modern'] h2 {
          font-size: 22px !important;
        }
        main[data-page-style='executive'] {
          background-image: linear-gradient(180deg, rgba(14,165,233,0.08), transparent 25%), linear-gradient(90deg, rgba(99,102,241,0.09), transparent 35%);
        }
        main[data-page-style='executive'] section {
          border-radius: 18px !important;
          border-width: 2px !important;
          box-shadow: 0 14px 38px rgba(2, 6, 23, 0.45);
        }
        main[data-page-style='executive'] h1 {
          letter-spacing: 0.04em;
          text-transform: uppercase;
          font-size: 40px !important;
          font-weight: 900;
        }
        main[data-page-style='executive'] h2 {
          font-size: 24px !important;
          letter-spacing: 0.01em;
        }
        main[data-page-style='executive'] a,
        main[data-page-style='executive'] button {
          border-radius: 999px !important;
          font-weight: 700;
        }
        main[data-page-style='apple'] {
          background-image: radial-gradient(circle at 15% -10%, rgba(0,113,227,0.16), transparent 32%), linear-gradient(180deg, #f8f8fa, #f1f2f6);
        }
        main[data-page-style='apple'] section {
          border-radius: 22px !important;
          border: 1px solid rgba(255,255,255,0.6) !important;
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.08);
        }
        main[data-page-style='apple'] h1 {
          letter-spacing: -0.02em;
          font-size: 42px !important;
          font-weight: 700;
        }
        main[data-page-style='apple'] h2 {
          letter-spacing: -0.01em;
          font-size: 24px !important;
          font-weight: 600;
        }
        main[data-page-style='apple'] a,
        main[data-page-style='apple'] button {
          border-radius: 14px !important;
          font-weight: 600;
        }
        main[data-page-style='classic'] section {
          border-radius: 8px !important;
          box-shadow: none !important;
        }
        main[data-ui-theme] section {
          background: ${theme.panelBg} !important;
          border-color: ${theme.border} !important;
          padding: ${panelPadding}px !important;
        }
        main[data-ui-theme] input,
        main[data-ui-theme] select,
        main[data-ui-theme] textarea,
        main[data-ui-theme] pre,
        main[data-ui-theme] table,
        main[data-ui-theme] [style*='background: #0b1020'],
        main[data-ui-theme] [style*='background:#0b1020'],
        main[data-ui-theme] [style*='background: #111827'],
        main[data-ui-theme] [style*='background:#111827'],
        main[data-ui-theme] [style*='background: #1f2937'],
        main[data-ui-theme] [style*='background:#1f2937'] {
          background: ${theme.cardBg} !important;
          color: ${theme.text} !important;
          border-color: ${theme.border} !important;
        }
        main[data-ui-theme] tr,
        main[data-ui-theme] [style*='borderTop:'] {
          border-color: ${theme.softBorder} !important;
        }
        main[data-ui-theme] a {
          background: ${theme.accentSoft} !important;
          color: #ffffff !important;
          border-radius: 8px;
        }
        main[data-ui-theme] button {
          border-color: transparent !important;
          filter: saturate(1.05);
        }
      `}</style>

      <div style={{ maxWidth, margin: '0 auto' }}>
      {(pageStyle === 'modern' || pageStyle === 'executive' || pageStyle === 'apple') && (
        <div style={{ marginBottom: 12, padding: pageStyle === 'executive' ? '12px 16px' : '10px 14px', borderRadius: pageStyle === 'executive' ? 16 : 12, background: `linear-gradient(90deg, ${theme.accent}, ${theme.accentSoft})`, color: '#fff', fontWeight: 700, letterSpacing: pageStyle === 'executive' ? '0.03em' : 'normal' }}>
          {pageStyle === 'executive' ? 'Executive Preview Mode — bold layout, strong contrast, premium controls.' : pageStyle === 'apple' ? 'Apple Preview Mode — airy layout, glass cards, calm contrast.' : 'Design Preview Mode — try different themes, density, and layout combinations.'}
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 30 }}>Mission Control</h1>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <a href='/todo-list' style={{ background: '#1e3a8a', color: 'white', textDecoration: 'none', borderRadius: 8, padding: '8px 10px', fontSize: 13 }}>To-Do List</a>
            <a href='/prediction-markets' style={{ background: '#1e3a8a', color: 'white', textDecoration: 'none', borderRadius: 8, padding: '8px 10px', fontSize: 13 }}>Prediction Markets</a>
            <a href='/prediction-markets-noaa' style={{ background: '#1e3a8a', color: 'white', textDecoration: 'none', borderRadius: 8, padding: '8px 10px', fontSize: 13 }}>Prediction Markets (NOAA-only)</a>
            <a href='/prediction-markets-live-noaa' style={{ background: '#1e3a8a', color: 'white', textDecoration: 'none', borderRadius: 8, padding: '8px 10px', fontSize: 13 }}>Live Prediction Markets</a>
            <a href='/upwork-jobs' style={{ background: '#1e3a8a', color: 'white', textDecoration: 'none', borderRadius: 8, padding: '8px 10px', fontSize: 13 }}>Upwork</a>
            <a href='/offerings-research' style={{ background: '#1e3a8a', color: 'white', textDecoration: 'none', borderRadius: 8, padding: '8px 10px', fontSize: 13 }}>Offerings Research</a>
            <a href='/income-ideas' style={{ background: '#1e3a8a', color: 'white', textDecoration: 'none', borderRadius: 8, padding: '8px 10px', fontSize: 13 }}>Income Ideas</a>
            <a href='/openclaw-enhancements' style={{ background: '#1e3a8a', color: 'white', textDecoration: 'none', borderRadius: 8, padding: '8px 10px', fontSize: 13 }}>OpenClaw Enhancements</a>
            <a href='/sat-app' style={{ background: '#1e3a8a', color: 'white', textDecoration: 'none', borderRadius: 8, padding: '8px 10px', fontSize: 13 }}>SAT App</a>
            <a href='/date-night-places' style={{ background: '#1e3a8a', color: 'white', textDecoration: 'none', borderRadius: 8, padding: '8px 10px', fontSize: 13 }}>Date Night</a>
            <a href='/mom-70-birthday-planner' style={{ background: '#1e3a8a', color: 'white', textDecoration: 'none', borderRadius: 8, padding: '8px 10px', fontSize: 13 }}>Mom 70th</a>
            <a href='/recipes' style={{ background: '#1e3a8a', color: 'white', textDecoration: 'none', borderRadius: 8, padding: '8px 10px', fontSize: 13 }}>Recipes</a>
            <a href='/nutrition-macros' style={{ background: '#1e3a8a', color: 'white', textDecoration: 'none', borderRadius: 8, padding: '8px 10px', fontSize: 13 }}>Health Coach</a>
          </div>
          <button onClick={refresh} disabled={refreshing} style={{ background: '#2563eb', color: 'white', border: 0, borderRadius: 8, padding: '10px 14px', cursor: 'pointer' }}>
            {refreshing ? 'Refreshing…' : 'Refresh now'}
          </button>
        </div>
      </div>

      <section style={{ borderRadius: 12, marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <strong>Design Lab</strong>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ opacity: 0.8, fontSize: 12 }}>Theme</span>
            <select value={uiTheme} onChange={(e) => setUiTheme(e.target.value)}>
              <option value='cupertino'>Cupertino Light</option>
              <option value='graphite'>Graphite Blue</option>
              <option value='aurora'>Aurora Teal</option>
              <option value='warmpaper'>Warm Paper</option>
              <option value='midnight'>Midnight</option>
            </select>
          </label>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ opacity: 0.8, fontSize: 12 }}>Density</span>
            <select value={density} onChange={(e) => setDensity(e.target.value)}>
              <option value='cozy'>Cozy</option>
              <option value='compact'>Compact</option>
            </select>
          </label>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ opacity: 0.8, fontSize: 12 }}>Layout</span>
            <select value={layoutWidth} onChange={(e) => setLayoutWidth(e.target.value)}>
              <option value='wide'>Full Width</option>
              <option value='contained'>Contained</option>
            </select>
          </label>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ opacity: 0.8, fontSize: 12 }}>Style</span>
            <select value={pageStyle} onChange={(e) => setPageStyle(e.target.value)}>
              <option value='apple'>Apple</option>
              <option value='executive'>Executive</option>
              <option value='modern'>Modern</option>
              <option value='classic'>Classic</option>
            </select>
          </label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button onClick={() => { setUiTheme('cupertino'); setPageStyle('apple'); setDensity('cozy'); setLayoutWidth('contained') }} style={{ background: '#0071e3', color: '#fff', border: 0, borderRadius: 8, padding: '6px 10px', cursor: 'pointer' }}>Preset: Apple</button>
            <button onClick={() => { setUiTheme('graphite'); setPageStyle('executive'); setDensity('compact'); setLayoutWidth('contained') }} style={{ background: theme.accent, color: '#fff', border: 0, borderRadius: 8, padding: '6px 10px', cursor: 'pointer' }}>Preset: Executive</button>
            <button onClick={() => { setUiTheme('aurora'); setPageStyle('modern'); setDensity('cozy'); setLayoutWidth('wide') }} style={{ background: theme.accentSoft, color: '#fff', border: 0, borderRadius: 8, padding: '6px 10px', cursor: 'pointer' }}>Preset: Creative</button>
            <button onClick={() => { setUiTheme('warmpaper'); setPageStyle('classic'); setDensity('cozy'); setLayoutWidth('contained') }} style={{ background: '#64748b', color: '#fff', border: 0, borderRadius: 8, padding: '6px 10px', cursor: 'pointer' }}>Preset: Minimal</button>
          </div>
        </div>
      </section>

      {error && <div style={{ background: theme.danger, padding: 10, borderRadius: 8, marginBottom: 12 }}>Error: {error}</div>}
      {loading && <div>Loading…</div>}

      {data && (
        <>
          <div style={{ opacity: 0.8, marginBottom: 14 }}>Last refreshed: {fmt(data.lastRefreshedAt)}</div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
          <section style={{ background: '#121a33', borderRadius: 12, padding: 14, marginBottom: 14, order: 3 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ marginTop: 0, marginBottom: 0 }}>Time Saved This Week</h2>
              <button onClick={() => setCollapsed((s) => ({ ...s, timeSaved: !s.timeSaved }))} style={{ background: '#334155', color: 'white', border: 0, borderRadius: 8, padding: '6px 10px', cursor: 'pointer' }}>{collapsed.timeSaved ? 'Expand' : 'Collapse'}</button>
            </div>
            {!collapsed.timeSaved && <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div style={{ border: '1px solid #334155', borderRadius: 10, padding: 10, background: '#0b1020' }}>
                <div style={{ opacity: 0.78, fontSize: 12 }}>Estimated Savings</div>
                <div style={{ fontSize: 28, fontWeight: 800, marginTop: 4 }}>
                  {data.offloadInsights?.timeSavedThisWeek?.minutes ?? 0} min
                  <span style={{ opacity: 0.75, fontSize: 14, marginLeft: 8 }}>({data.offloadInsights?.timeSavedThisWeek?.hours ?? 0}h)</span>
                </div>
                <div style={{ marginTop: 8, opacity: 0.76, fontSize: 12 }}>Based on active automation footprint this week.</div>
              </div>
              <div style={{ border: '1px solid #334155', borderRadius: 10, padding: 10, background: '#0b1020' }}>
                <div style={{ opacity: 0.78, fontSize: 12 }}>Top Manual Task to Offload Next</div>
                <div style={{ fontWeight: 700, marginTop: 6 }}>{data.offloadInsights?.topOffloadNext?.title || '—'}</div>
                <div style={{ marginTop: 6, opacity: 0.78, fontSize: 12 }}>{data.offloadInsights?.topOffloadNext?.reason || ''}</div>
                <div style={{ marginTop: 6, opacity: 0.62, fontSize: 12 }}>{data.offloadInsights?.topOffloadNext?.source || ''}</div>
              </div>
            </div>
            {(data.offloadInsights?.timeSavedThisWeek?.breakdown || []).length > 0 && (
              <div style={{ marginTop: 10, borderTop: '1px solid #26314f', paddingTop: 10 }}>
                <div style={{ opacity: 0.8, marginBottom: 6, fontSize: 12 }}>Savings drivers</div>
                {(data.offloadInsights.timeSavedThisWeek.breakdown || []).map((b) => (
                  <div key={b.name} style={{ fontSize: 13, opacity: 0.86, marginBottom: 4 }}>• {b.name} — ~{b.minutes} min/week</div>
                ))}
              </div>
            )}
            </>}
          </section>

          <section style={{ background: '#121a33', borderRadius: 12, padding: 14, marginBottom: 14, order: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ marginTop: 0, marginBottom: 0 }}>ROI Calculator (MVP)</h2>
              <button onClick={() => setCollapsed((s) => ({ ...s, roi: !s.roi }))} style={{ background: '#334155', color: 'white', border: 0, borderRadius: 8, padding: '6px 10px', cursor: 'pointer' }}>{collapsed.roi ? 'Expand' : 'Collapse'}</button>
            </div>
            {!collapsed.roi && <>
            <div style={{ opacity: 0.75, marginBottom: 10 }}>Quick value model for automation consulting opportunities.</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8 }}>
              <label style={{ display: 'grid', gap: 4 }}>
                <span style={{ fontSize: 12, opacity: 0.8 }}>Workflow Name</span>
                <input value={roiInputs.workflow} onChange={(e) => setRoiInputs({ ...roiInputs, workflow: e.target.value })} placeholder='Lead Follow-up' style={{ background: '#0b1020', color: '#e8ecf3', border: '1px solid #334155', borderRadius: 8, padding: '8px 10px' }} />
              </label>
              <label style={{ display: 'grid', gap: 4 }}>
                <span style={{ fontSize: 12, opacity: 0.8 }}>Weekly Volume (events/week)</span>
                <input value={roiInputs.weeklyVolume} onChange={(e) => setRoiInputs({ ...roiInputs, weeklyVolume: e.target.value })} placeholder='40' style={{ background: '#0b1020', color: '#e8ecf3', border: '1px solid #334155', borderRadius: 8, padding: '8px 10px' }} />
              </label>
              <label style={{ display: 'grid', gap: 4 }}>
                <span style={{ fontSize: 12, opacity: 0.8 }}>Manual Time (min/event)</span>
                <input value={roiInputs.manualMin} onChange={(e) => setRoiInputs({ ...roiInputs, manualMin: e.target.value })} placeholder='6' style={{ background: '#0b1020', color: '#e8ecf3', border: '1px solid #334155', borderRadius: 8, padding: '8px 10px' }} />
              </label>
              <label style={{ display: 'grid', gap: 4 }}>
                <span style={{ fontSize: 12, opacity: 0.8 }}>Automated Time (min/event)</span>
                <input value={roiInputs.autoMin} onChange={(e) => setRoiInputs({ ...roiInputs, autoMin: e.target.value })} placeholder='1' style={{ background: '#0b1020', color: '#e8ecf3', border: '1px solid #334155', borderRadius: 8, padding: '8px 10px' }} />
              </label>
              <label style={{ display: 'grid', gap: 4 }}>
                <span style={{ fontSize: 12, opacity: 0.8 }}>Employee Avg Hourly Rate</span>
                <input value={roiInputs.hourlyRate} onChange={(e) => setRoiInputs({ ...roiInputs, hourlyRate: e.target.value })} placeholder='30' style={{ background: '#0b1020', color: '#e8ecf3', border: '1px solid #334155', borderRadius: 8, padding: '8px 10px' }} />
              </label>
              <label style={{ display: 'grid', gap: 4 }}>
                <span style={{ fontSize: 12, opacity: 0.8 }}>Monthly Tool Cost ($)</span>
                <input value={roiInputs.monthlyToolCost} onChange={(e) => setRoiInputs({ ...roiInputs, monthlyToolCost: e.target.value })} placeholder='50' style={{ background: '#0b1020', color: '#e8ecf3', border: '1px solid #334155', borderRadius: 8, padding: '8px 10px' }} />
              </label>
              <label style={{ display: 'grid', gap: 4 }}>
                <span style={{ fontSize: 12, opacity: 0.8 }}>Implementation Cost ($ one-time)</span>
                <input value={roiInputs.implementationCost} onChange={(e) => setRoiInputs({ ...roiInputs, implementationCost: e.target.value })} placeholder='1200' style={{ background: '#0b1020', color: '#e8ecf3', border: '1px solid #334155', borderRadius: 8, padding: '8px 10px' }} />
              </label>
            </div>
            <div style={{ opacity: 0.75, marginTop: 10, marginBottom: 8, fontSize: 12 }}>
              Loaded hourly rate is your all-in cost for the person doing this work (default $30/hr, editable).
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10, marginTop: 10 }}>
              <div style={{ border: '1px solid #334155', borderRadius: 8, padding: 8 }}><strong>Cost per Activity (Manual):</strong> ${roi.manualCostPerActivity.toFixed(2)}</div>
              <div style={{ border: '1px solid #334155', borderRadius: 8, padding: 8 }}><strong>Cost per Activity (Automated):</strong> ${roi.automatedCostPerActivity.toFixed(2)}</div>
              <div style={{ border: '1px solid #334155', borderRadius: 8, padding: 8 }}><strong>Savings per Activity:</strong> ${roi.savingsPerActivity.toFixed(2)}</div>

              <div style={{ border: '1px solid #334155', borderRadius: 8, padding: 8 }}><strong>Weekly Cost (Manual):</strong> ${roi.weeklyManualCostTotal.toFixed(2)}</div>
              <div style={{ border: '1px solid #334155', borderRadius: 8, padding: 8 }}><strong>Weekly Cost (Automated):</strong> ${roi.weeklyAutomatedCostTotal.toFixed(2)}</div>
              <div style={{ border: '1px solid #334155', borderRadius: 8, padding: 8 }}><strong>Weekly Savings:</strong> ${roi.weeklySavingsTotal.toFixed(2)}</div>

              <div style={{ border: '1px solid #334155', borderRadius: 8, padding: 8 }}><strong>Monthly Cost (Manual):</strong> ${roi.monthlyManualCostTotal.toFixed(2)}</div>
              <div style={{ border: '1px solid #334155', borderRadius: 8, padding: 8 }}><strong>Monthly Cost (Automated):</strong> ${roi.monthlyAutomatedCostTotal.toFixed(2)}</div>
              <div style={{ border: '1px solid #334155', borderRadius: 8, padding: 8 }}><strong>Monthly Gross Savings:</strong> ${roi.monthlyGrossSavings.toFixed(2)}</div>

              <div style={{ border: '1px solid #334155', borderRadius: 8, padding: 8 }}><strong>Weekly Hours Saved:</strong> {roi.weeklyHoursSaved.toFixed(2)}</div>
              <div style={{ border: '1px solid #334155', borderRadius: 8, padding: 8 }}><strong>Monthly Hours Saved:</strong> {roi.monthlyHoursSaved.toFixed(2)}</div>
              <div style={{ border: '1px solid #334155', borderRadius: 8, padding: 8 }}><strong>Monthly Net Savings (after tools):</strong> ${roi.monthlyNetSavings.toFixed(2)}</div>

              <div style={{ border: '1px solid #334155', borderRadius: 8, padding: 8 }}><strong>Annual Net Savings:</strong> ${roi.annualNetSavings.toFixed(2)}</div>
              <div style={{ border: '1px solid #334155', borderRadius: 8, padding: 8 }}><strong>Payback (months):</strong> {roi.paybackMonths == null ? 'N/A' : roi.paybackMonths.toFixed(2)}</div>
            </div>
            </>}
          </section>

          <section style={{ background: '#121a33', borderRadius: 12, padding: 14, marginBottom: 14, order: 5 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ marginTop: 0, marginBottom: 0 }}>Global Search</h2>
              <button onClick={() => setCollapsed((s) => ({ ...s, globalSearch: !s.globalSearch }))} style={{ background: '#334155', color: 'white', border: 0, borderRadius: 8, padding: '6px 10px', cursor: 'pointer' }}>{collapsed.globalSearch ? 'Expand' : 'Collapse'}</button>
            </div>
            {!collapsed.globalSearch && <>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
              <input
                value={globalQuery}
                onChange={(e) => setGlobalQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') searchAll() }}
                placeholder="Search jobs, cards, and memory content..."
                style={{ background: '#0b1020', color: '#e8ecf3', border: '1px solid #334155', borderRadius: 8, padding: '8px 10px', minWidth: 360 }}
              />
              <button onClick={() => searchAll()} disabled={globalLoading} style={{ background: '#2563eb', color: 'white', border: 0, borderRadius: 8, padding: '8px 12px', cursor: 'pointer' }}>{globalLoading ? 'Searching…' : 'Search All'}</button>
            </div>

            {(globalResults.jobs.length > 0 || globalResults.cards.length > 0 || globalResults.docs.length > 0) && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
                <div style={{ border: '1px solid #334155', borderRadius: 8, padding: 8 }}>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>Jobs ({globalResults.jobs.length})</div>
                  {globalResults.jobs.map((j) => (
                    <div key={j.id} style={{ borderTop: '1px solid #26314f', padding: '8px 0' }}>
                      <button onClick={() => openJob(j.id)} style={{ background: 'transparent', color: '#93c5fd', border: 0, padding: 0, cursor: 'pointer', textAlign: 'left' }}>{j.name}</button>
                      <div style={{ opacity: 0.75, fontSize: 12 }}>{j.id}</div>
                      {j.snippet && <div style={{ opacity: 0.82, fontSize: 12, marginTop: 4 }}>{j.snippet}</div>}
                    </div>
                  ))}
                  {globalResults.jobs.length === 0 && <div style={{ opacity: 0.7 }}>No job matches.</div>}
                </div>

                <div style={{ border: '1px solid #334155', borderRadius: 8, padding: 8 }}>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>Cards ({globalResults.cards.length})</div>
                  {globalResults.cards.map((c) => (
                    <div key={c.id} style={{ borderTop: '1px solid #26314f', padding: '8px 0' }}>
                      <button onClick={() => setEditingCard({ ...c })} style={{ background: 'transparent', color: '#93c5fd', border: 0, padding: 0, cursor: 'pointer', textAlign: 'left' }}>{c.title}</button>
                      <div style={{ opacity: 0.75, fontSize: 12 }}>{c.status} · {c.owner || '—'} · {c.priority || 'P2'}</div>
                      {c.snippet && <div style={{ opacity: 0.82, fontSize: 12, marginTop: 4 }}>{c.snippet}</div>}
                    </div>
                  ))}
                  {globalResults.cards.length === 0 && <div style={{ opacity: 0.7 }}>No card matches.</div>}
                </div>

                <div style={{ border: '1px solid #334155', borderRadius: 8, padding: 8 }}>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>Memory Docs ({globalResults.docs.length})</div>
                  {globalResults.docs.map((d) => (
                    <div key={d.relPath} style={{ borderTop: '1px solid #26314f', padding: '8px 0' }}>
                      <button onClick={() => openDoc(d.relPath)} style={{ background: 'transparent', color: '#93c5fd', border: 0, padding: 0, cursor: 'pointer', textAlign: 'left' }}>{d.title}</button>
                      <div style={{ opacity: 0.75, fontSize: 12 }}>{d.relPath}</div>
                      {d.snippet && <div style={{ opacity: 0.82, fontSize: 12, marginTop: 4 }}>{d.snippet}</div>}
                    </div>
                  ))}
                  {globalResults.docs.length === 0 && <div style={{ opacity: 0.7 }}>No memory matches.</div>}
                </div>
              </div>
            )}

            {globalQuery.trim() && !globalLoading && globalResults.jobs.length === 0 && globalResults.cards.length === 0 && globalResults.docs.length === 0 && (
              <div style={{ opacity: 0.72 }}>No matches found for “{globalQuery.trim()}”.</div>
            )}
            </>}
          </section>

          <section style={{ background: '#121a33', borderRadius: 12, padding: 14, marginBottom: 14, order: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ marginTop: 0, marginBottom: 0 }}>Scheduled Jobs ({data.jobs.length})</h2>
              <button onClick={() => setCollapsed((s) => ({ ...s, scheduledJobs: !s.scheduledJobs }))} style={{ background: '#334155', color: 'white', border: 0, borderRadius: 8, padding: '6px 10px', cursor: 'pointer' }}>{collapsed.scheduledJobs ? 'Expand' : 'Collapse'}</button>
            </div>
            {!collapsed.scheduledJobs && <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', opacity: 0.85 }}>
                    <th>Name</th><th>Status</th><th>Next Run</th><th>Last Run</th><th>Duration</th><th>Errors</th>
                  </tr>
                </thead>
                <tbody>
                  {data.jobs.map((j) => (
                    <tr key={j.id} onClick={() => openJob(j.id)} style={{ borderTop: '1px solid #26314f', cursor: 'pointer', background: selectedJobId === j.id ? '#17213f' : 'transparent' }}>
                      <td style={{ padding: '8px 0' }}>{j.name}</td>
                      <td>{j.lastStatus || '—'}</td>
                      <td>{fmt(j.nextRunAtMs)}</td>
                      <td>{fmt(j.lastRunAtMs)}</td>
                      <td>{dur(j.lastDurationMs)}</td>
                      <td>{j.consecutiveErrors ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: 8, opacity: 0.7 }}>Tip: click a row for details + run-now.</div>
            </>}
          </section>

          <section style={{ background: '#121a33', borderRadius: 12, padding: 14, marginBottom: 14, order: 7 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ marginTop: 0, marginBottom: 0 }}>Recent Runs / Failures</h2>
              <button onClick={() => setCollapsed((s) => ({ ...s, recentRuns: !s.recentRuns }))} style={{ background: '#334155', color: 'white', border: 0, borderRadius: 8, padding: '6px 10px', cursor: 'pointer' }}>{collapsed.recentRuns ? 'Expand' : 'Collapse'}</button>
            </div>
            {!collapsed.recentRuns && <>
            {data.recent.length === 0 && <div>No run data yet.</div>}
            {data.recent.map((r) => (
              <div key={r.id} style={{ borderTop: '1px solid #26314f', padding: '8px 0' }}>
                <strong>{r.name}</strong> · {r.lastStatus || 'unknown'} · last run {fmt(r.lastRunAtMs)}
                {r.consecutiveErrors > 0 && <span style={{ color: '#fca5a5' }}> · {r.consecutiveErrors} consecutive errors</span>}
              </div>
            ))}
            </>}
          </section>

          <section style={{ background: '#121a33', borderRadius: 12, padding: 14, marginBottom: 14, order: 1 }}>
            <h2 style={{ marginTop: 0 }}>Kanban Board</h2>
            <div style={{ opacity: 0.75, marginBottom: 10 }}>Shared queue for Alfred + Joe review flow. Use <strong>Edit / Feedback</strong>, then hand off with <strong>Send to Alfred</strong> / <strong>Send to Joe</strong> to volley cards cleanly.</div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
              <input
                value={newCardTitle}
                onChange={(e) => setNewCardTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') createCard() }}
                placeholder="Add a task card..."
                style={{ background: '#0b1020', color: '#e8ecf3', border: '1px solid #334155', borderRadius: 8, padding: '8px 10px', minWidth: 320 }}
              />
              <select value={newCardOwner} onChange={(e) => setNewCardOwner(e.target.value)} style={{ background: '#0b1020', color: '#e8ecf3', border: '1px solid #334155', borderRadius: 8, padding: '8px 10px' }}>
                <option>Joe</option>
                <option>Alfred</option>
              </select>
              <button onClick={createCard} style={{ background: '#2563eb', color: 'white', border: 0, borderRadius: 8, padding: '8px 12px', cursor: 'pointer' }}>Add Card</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 10 }}>
              {[
                { key: 'new', label: 'Inbox / New' },
                { key: 'waiting_on_alfred', label: 'Waiting on Alfred' },
                { key: 'in_progress', label: 'In Progress' },
                { key: 'review', label: 'Waiting on Joe Review' },
                { key: 'blocked', label: 'Blocked' },
                { key: 'done', label: 'Complete' }
              ].map((col) => (
                <div
                  key={col.key}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => onDropColumn(col.key)}
                  style={{ border: '1px solid #334155', borderRadius: 10, minHeight: 180, padding: 8 }}
                >
                  <div style={{ fontWeight: 700, marginBottom: 8 }}>{col.label}</div>
                  {(kanbanCards || []).filter((c) => !c.isArchived && c.status === col.key).map((c) => (
                    <div
                      key={c.id}
                      draggable
                      onDragStart={() => setDragCardId(c.id)}
                      style={{ background: '#0b1020', border: '1px solid #26314f', borderRadius: 8, padding: 8, marginBottom: 8 }}
                    >
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>{c.title}</div>
                      <div style={{ fontSize: 12, opacity: 0.75 }}>{c.owner || '—'} · {c.type || 'Ops'} · {c.priority || 'P2'}</div>
                      <div style={{ fontSize: 11, opacity: 0.62, marginTop: 2 }}>Added {fmt(c.createdAtMs)} · Updated {fmt(c.updatedAtMs)}</div>
                      <div style={{ fontSize: 11, opacity: 0.62, marginTop: 2 }}>Comm: {c.lastCommReason || 'none'} · {c.lastCommStatus || 'n/a'} {c.lastCommAtMs ? `· ${fmt(c.lastCommAtMs)}` : ''}</div>
                      {c.artifactLink && <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>{c.artifactLink}</div>}
                      {c.feedback && <div style={{ fontSize: 12, opacity: 0.9, marginTop: 6, background: '#1f2937', borderRadius: 6, padding: 6 }}><strong>Feedback:</strong> {c.feedback}</div>}
                      {c.nextSteps && <div style={{ fontSize: 12, opacity: 0.9, marginTop: 6, background: '#111827', borderRadius: 6, padding: 6 }}><strong>Next:</strong> {c.nextSteps}</div>}
                      {briefByCard[c.id] && <div style={{ fontSize: 12, opacity: 0.9, marginTop: 6, background: '#111827', borderRadius: 6, padding: 6 }}>{briefByCard[c.id]}</div>}
                      {briefUpdatedByCard[c.id] && <div style={{ fontSize: 11, opacity: 0.65, marginTop: 4 }}>Brief updated {briefUpdatedByCard[c.id]}</div>}
                      {briefErrorByCard[c.id] && <div style={{ fontSize: 11, color: '#fca5a5', marginTop: 4 }}>{briefErrorByCard[c.id]}</div>}
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                        <button onClick={() => setEditingCard({ ...c })} style={{ background: '#1d4ed8', color: 'white', border: 0, borderRadius: 6, padding: '4px 8px', cursor: 'pointer' }}>Edit / Feedback</button>
                        <button onClick={() => nudgeCardInLane(c, 'up')} style={{ background: '#475569', color: 'white', border: 0, borderRadius: 6, padding: '4px 8px', cursor: 'pointer' }}>↑ Up</button>
                        <button onClick={() => nudgeCardInLane(c, 'down')} style={{ background: '#475569', color: 'white', border: 0, borderRadius: 6, padding: '4px 8px', cursor: 'pointer' }}>↓ Down</button>
                        {c.artifactLink && <button onClick={() => openArtifact(c)} style={{ background: '#0ea5e9', color: 'white', border: 0, borderRadius: 6, padding: '4px 8px', cursor: 'pointer' }}>{isUrl(c.artifactLink) ? 'Open Demo' : 'Open Document'}</button>}
                        {c.artifactLink && <button onClick={() => openArtifactPopout(c)} style={{ background: '#0284c7', color: 'white', border: 0, borderRadius: 6, padding: '4px 8px', cursor: 'pointer' }}>{isUrl(c.artifactLink) ? 'Pop Out Demo' : 'Pop Out Reader'}</button>}
                        {c.artifactLink && <button onClick={() => generateBrief(c)} disabled={!!briefLoadingByCard[c.id]} style={{ background: '#475569', color: 'white', border: 0, borderRadius: 6, padding: '4px 8px', cursor: 'pointer', opacity: briefLoadingByCard[c.id] ? 0.7 : 1 }}>{briefLoadingByCard[c.id] ? 'Briefing…' : 'Generate Summary'}</button>}
                        {c.status !== 'waiting_on_alfred' && <button onClick={() => handoffCard(c, 'alfred')} style={{ background: '#7c3aed', color: 'white', border: 0, borderRadius: 6, padding: '4px 8px', cursor: 'pointer' }}>Send to Alfred</button>}
                        {c.status !== 'review' && <button onClick={() => handoffCard(c, 'joe')} style={{ background: '#0f766e', color: 'white', border: 0, borderRadius: 6, padding: '4px 8px', cursor: 'pointer' }}>Send to Joe</button>}
                        {col.key !== 'new' && <button onClick={() => moveCard(c, 'new')} style={{ background: '#1e3a8a', color: 'white', border: 0, borderRadius: 6, padding: '4px 8px', cursor: 'pointer' }}>Move to Inbox</button>}
                        {col.key !== 'in_progress' && <button onClick={() => moveCard(c, 'in_progress')} style={{ background: '#334155', color: 'white', border: 0, borderRadius: 6, padding: '4px 8px', cursor: 'pointer' }}>In Progress</button>}
                        {col.key !== 'done' && <button onClick={() => moveCard(c, 'done')} style={{ background: '#166534', color: 'white', border: 0, borderRadius: 6, padding: '4px 8px', cursor: 'pointer' }}>Complete</button>}
                        {col.key !== 'blocked' && <button onClick={() => moveCard(c, 'blocked')} style={{ background: '#7f1d1d', color: 'white', border: 0, borderRadius: 6, padding: '4px 8px', cursor: 'pointer' }}>Blocked</button>}
                        <button onClick={() => updateCard({ id: c.id, isArchived: true, archivedAtMs: Date.now() })} style={{ background: '#6b7280', color: 'white', border: 0, borderRadius: 6, padding: '4px 8px', cursor: 'pointer' }}>Archive</button>
                        <button onClick={() => deleteCard(c)} style={{ background: '#991b1b', color: 'white', border: 0, borderRadius: 6, padding: '4px 8px', cursor: 'pointer' }}>Delete</button>
                      </div>
                    </div>
                  ))}
                  {kanbanLoading && <div style={{ opacity: 0.75 }}>Loading…</div>}
                </div>
              ))}
            </div>

            <div style={{ marginTop: 12, border: '1px solid #334155', borderRadius: 10, padding: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{ fontWeight: 700 }}>Archived ({(kanbanCards || []).filter((c) => !!c.isArchived).length})</div>
                <button
                  onClick={() => setArchivedExpanded((v) => !v)}
                  style={{ background: '#334155', color: 'white', border: 0, borderRadius: 6, padding: '4px 8px', cursor: 'pointer' }}
                >
                  {archivedExpanded ? 'Collapse' : 'Expand'}
                </button>
              </div>

              {archivedExpanded && (
                <>
                  {(kanbanCards || []).filter((c) => !!c.isArchived).slice(0, 50).map((c) => (
                    <div key={c.id} style={{ background: '#0b1020', border: '1px solid #26314f', borderRadius: 8, padding: 8, marginBottom: 8 }}>
                      <div style={{ fontWeight: 600 }}>{c.title}</div>
                      <div style={{ fontSize: 12, opacity: 0.75 }}>{c.owner || '—'} · {c.type || 'Ops'} · {c.priority || 'P2'} · archived {fmt(c.archivedAtMs)}</div>
                      <div style={{ fontSize: 11, opacity: 0.62, marginTop: 2 }}>Added {fmt(c.createdAtMs)} · Updated {fmt(c.updatedAtMs)}</div>
                      <div style={{ fontSize: 11, opacity: 0.62, marginTop: 2 }}>Comm: {c.lastCommReason || 'none'} · {c.lastCommStatus || 'n/a'} {c.lastCommAtMs ? `· ${fmt(c.lastCommAtMs)}` : ''}</div>
                      {c.feedback && <div style={{ fontSize: 12, opacity: 0.9, marginTop: 6, background: '#1f2937', borderRadius: 6, padding: 6 }}><strong>Feedback:</strong> {c.feedback}</div>}
                      {c.nextSteps && <div style={{ fontSize: 12, opacity: 0.9, marginTop: 6, background: '#111827', borderRadius: 6, padding: 6 }}><strong>Next:</strong> {c.nextSteps}</div>}
                      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                        <button onClick={() => updateCard({ id: c.id, isArchived: false, archivedAtMs: null })} style={{ background: '#1d4ed8', color: 'white', border: 0, borderRadius: 6, padding: '4px 8px', cursor: 'pointer' }}>Unarchive</button>
                        <button onClick={() => setEditingCard({ ...c })} style={{ background: '#475569', color: 'white', border: 0, borderRadius: 6, padding: '4px 8px', cursor: 'pointer' }}>Edit</button>
                      </div>
                    </div>
                  ))}
                  {(kanbanCards || []).filter((c) => !!c.isArchived).length === 0 && <div style={{ opacity: 0.7 }}>No archived cards yet.</div>}
                </>
              )}
            </div>

            {editingCard && (
              <div style={{ marginTop: 12, border: '1px solid #334155', borderRadius: 10, padding: 10, background: '#0b1020' }}>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>Edit Card</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  <input value={editingCard.title || ''} onChange={(e) => setEditingCard({ ...editingCard, title: e.target.value })} placeholder='Title' style={{ background: '#111827', color: '#e8ecf3', border: '1px solid #334155', borderRadius: 6, padding: '8px 10px' }} />
                  <select value={editingCard.owner || 'Joe'} onChange={(e) => setEditingCard({ ...editingCard, owner: e.target.value })} style={{ background: '#111827', color: '#e8ecf3', border: '1px solid #334155', borderRadius: 6, padding: '8px 10px' }}><option>Joe</option><option>Alfred</option></select>
                  <select value={editingCard.priority || 'P2'} onChange={(e) => setEditingCard({ ...editingCard, priority: e.target.value })} style={{ background: '#111827', color: '#e8ecf3', border: '1px solid #334155', borderRadius: 6, padding: '8px 10px' }}><option>P1</option><option>P2</option><option>P3</option></select>
                  <input value={editingCard.type || ''} onChange={(e) => setEditingCard({ ...editingCard, type: e.target.value })} placeholder='Type' style={{ background: '#111827', color: '#e8ecf3', border: '1px solid #334155', borderRadius: 6, padding: '8px 10px' }} />
                  <input value={editingCard.artifactLink || ''} onChange={(e) => setEditingCard({ ...editingCard, artifactLink: e.target.value })} placeholder='Artifact link (file)' style={{ background: '#111827', color: '#e8ecf3', border: '1px solid #334155', borderRadius: 6, padding: '8px 10px' }} />
                  <select value={editingCard.status || 'new'} onChange={(e) => setEditingCard({ ...editingCard, status: e.target.value })} style={{ background: '#111827', color: '#e8ecf3', border: '1px solid #334155', borderRadius: 6, padding: '8px 10px' }}><option value='new'>Inbox / New</option><option value='waiting_on_alfred'>Waiting on Alfred</option><option value='in_progress'>In Progress</option><option value='review'>Waiting on Joe Review</option><option value='blocked'>Blocked</option><option value='done'>Complete</option></select>
                </div>
                <textarea value={editingCard.details || ''} onChange={(e) => setEditingCard({ ...editingCard, details: e.target.value })} rows={3} placeholder='Details' style={{ width: '100%', marginTop: 8, background: '#111827', color: '#e8ecf3', border: '1px solid #334155', borderRadius: 6, padding: '8px 10px' }} />
                <textarea value={editingCard.feedback || ''} onChange={(e) => setEditingCard({ ...editingCard, feedback: e.target.value })} rows={2} placeholder='Feedback (from Joe)' style={{ width: '100%', marginTop: 8, background: '#111827', color: '#e8ecf3', border: '1px solid #334155', borderRadius: 6, padding: '8px 10px' }} />
                <textarea value={editingCard.nextSteps || ''} onChange={(e) => setEditingCard({ ...editingCard, nextSteps: e.target.value })} rows={2} placeholder='Next steps' style={{ width: '100%', marginTop: 8, background: '#111827', color: '#e8ecf3', border: '1px solid #334155', borderRadius: 6, padding: '8px 10px' }} />
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button onClick={saveCardEdits} style={{ background: '#16a34a', color: 'white', border: 0, borderRadius: 6, padding: '6px 10px', cursor: 'pointer' }}>Save</button>
                  <button onClick={() => setEditingCard(null)} style={{ background: '#475569', color: 'white', border: 0, borderRadius: 6, padding: '6px 10px', cursor: 'pointer' }}>Cancel</button>
                </div>
              </div>
            )}
          </section>

          {selectedJobId && (
            <section style={{ background: '#111827', border: '1px solid #334155', borderRadius: 12, padding: 14, marginBottom: 14, order: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h2 style={{ marginTop: 0, marginBottom: 0 }}>Job Details</h2>
                <button onClick={() => setCollapsed((s) => ({ ...s, jobDetails: !s.jobDetails }))} style={{ background: '#334155', color: 'white', border: 0, borderRadius: 8, padding: '6px 10px', cursor: 'pointer' }}>{collapsed.jobDetails ? 'Expand' : 'Collapse'}</button>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <select value={selectedJobId} onChange={(e) => openJob(e.target.value)} style={{ background: '#0b1020', color: '#e8ecf3', border: '1px solid #334155', borderRadius: 8, padding: '8px 10px' }}>
                    {(data.jobs || []).map((j) => <option key={j.id} value={j.id}>{j.name}</option>)}
                  </select>
                  <button onClick={() => { setSelectedJobId(''); setJobDetail(null) }} style={{ background: '#334155', color: 'white', border: 0, borderRadius: 8, padding: '8px 12px', cursor: 'pointer' }}>Close</button>
                  <button onClick={runNow} disabled={runningNow || jobLoading} style={{ background: '#16a34a', color: 'white', border: 0, borderRadius: 8, padding: '8px 12px', cursor: 'pointer' }}>{runningNow ? 'Running…' : 'Run now'}</button>
                </div>
              </div>

              {!collapsed.jobDetails && (
                <>
              {jobLoading && <div>Loading details…</div>}
              {jobDetail && (
                <>
                  <div><strong>{jobDetail.job.name}</strong> ({jobDetail.job.id})</div>
                  <div style={{ opacity: 0.85, marginTop: 4 }}>Schedule: {jobDetail.job.schedule?.expr || '—'} ({jobDetail.job.schedule?.tz || '—'})</div>
                  <div style={{ opacity: 0.85, marginTop: 4 }}>Last status: {jobDetail.job.state?.lastStatus || '—'} · Last run: {fmt(jobDetail.job.state?.lastRunAtMs)}</div>

                  <h3 style={{ marginBottom: 6, marginTop: 14 }}>Last Error Text</h3>
                  <pre style={{ whiteSpace: 'pre-wrap', background: '#0b1020', padding: 10, borderRadius: 8, maxHeight: 180, overflow: 'auto' }}>{jobDetail.lastErrorText || 'No recent error found.'}</pre>

                  <h3 style={{ marginBottom: 6, marginTop: 14 }}>Recent Run Summaries</h3>
                  {(jobDetail.runs || []).map((r, i) => (
                    <div key={i} style={{ borderTop: '1px solid #26314f', padding: '8px 0' }}>
                      <strong>{r.status || 'unknown'}</strong> · {fmt(r.runAtMs)} · {dur(r.durationMs)}
                      <pre style={{ whiteSpace: 'pre-wrap', marginTop: 6, background: '#0b1020', padding: 8, borderRadius: 8 }}>{r.summary || '(no summary)'}</pre>
                    </div>
                  ))}
                </>
              )}
                </>
              )}
            </section>
          )}

          <section id="memory-screen" style={{ background: '#121a33', borderRadius: 12, padding: 14, order: 2 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div>
                <h2 style={{ margin: 0 }}>Memory Screen</h2>
                <div style={{ opacity: 0.75, marginTop: 4 }}>Indexed: {fmt(memoryIndexedAt)}</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={memoryQuery}
                  onChange={(e) => setMemoryQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') searchMemory() }}
                  placeholder="Search memories..."
                  style={{ background: '#0b1020', color: '#e8ecf3', border: '1px solid #334155', borderRadius: 8, padding: '8px 10px', minWidth: 260 }}
                />
                <button onClick={() => searchMemory()} disabled={memoryLoading} style={{ background: '#2563eb', color: 'white', border: 0, borderRadius: 8, padding: '8px 12px', cursor: 'pointer' }}>{memoryLoading ? 'Searching…' : 'Search'}</button>
                <button onClick={reindexMemory} disabled={reindexing} style={{ background: '#475569', color: 'white', border: 0, borderRadius: 8, padding: '8px 12px', cursor: 'pointer' }}>{reindexing ? 'Reindexing…' : 'Reindex'}</button>
                <button onClick={() => setMemoryExpanded((v) => !v)} style={{ background: '#334155', color: 'white', border: 0, borderRadius: 8, padding: '8px 12px', cursor: 'pointer' }}>{memoryExpanded ? 'Compact View' : 'Expand View'}</button>
                <button onClick={() => setDocModalOpen(true)} disabled={!selectedDoc} style={{ background: '#0ea5e9', color: 'white', border: 0, borderRadius: 8, padding: '8px 12px', cursor: 'pointer', opacity: selectedDoc ? 1 : 0.6 }}>Pop-out Reader</button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: memoryExpanded ? '28% 72%' : '36% 64%', gap: 12, marginTop: 12 }}>
              <div style={{ border: '1px solid #334155', borderRadius: 10, maxHeight: memoryExpanded ? 650 : 420, overflow: 'auto' }}>
                {(memoryDocs || []).map((d) => (
                  <div
                    key={d.relPath}
                    onClick={() => openDoc(d.relPath)}
                    style={{ padding: 10, cursor: 'pointer', borderTop: '1px solid #26314f', background: selectedDocPath === d.relPath ? '#17213f' : 'transparent' }}
                  >
                    <div style={{ fontWeight: 600 }}>{d.title}</div>
                    <div style={{ opacity: 0.75, fontSize: 12 }}>{d.relPath}</div>
                    {d.snippet && <div style={{ opacity: 0.82, marginTop: 4, fontSize: 13 }}>{d.snippet}</div>}
                  </div>
                ))}
                {(!memoryDocs || memoryDocs.length === 0) && <div style={{ padding: 12, opacity: 0.75 }}>No memory docs found.</div>}
              </div>

              <div style={{ border: '1px solid #334155', borderRadius: 10, padding: 10, maxHeight: memoryExpanded ? 650 : 420, overflow: 'auto' }}>
                {docLoading && <div>Loading document…</div>}
                {!docLoading && !selectedDoc && <div style={{ opacity: 0.75 }}>Select a memory document to view it.</div>}
                {selectedDoc && (
                  <>
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontWeight: 700 }}>{selectedDoc.title}</div>
                      <div style={{ opacity: 0.75, fontSize: 12 }}>{selectedDoc.relPath} · updated {fmt(selectedDoc.updatedAtMs)}</div>
                    </div>
                    <pre style={{ whiteSpace: 'pre-wrap', margin: 0, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 13 }}>{selectedDoc.content}</pre>
                  </>
                )}
              </div>
            </div>
          </section>


          </div>
        </>
      )}
      </div>
      {docModalOpen && selectedDoc && (
        <div
          onClick={() => setDocModalOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.78)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: 'min(1200px, 96vw)', height: '90vh', background: '#0b1020', border: '1px solid #334155', borderRadius: 12, display: 'flex', flexDirection: 'column' }}
          >
            <div style={{ padding: 12, borderBottom: '1px solid #26314f', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <div>
                <div style={{ fontWeight: 700 }}>{selectedDoc.title}</div>
                <div style={{ opacity: 0.75, fontSize: 12 }}>{selectedDoc.relPath}</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => navigator.clipboard?.writeText(selectedDoc.content || '')} style={{ background: '#475569', color: 'white', border: 0, borderRadius: 8, padding: '8px 10px', cursor: 'pointer' }}>Copy Text</button>
                <button onClick={() => setDocModalOpen(false)} style={{ background: '#1d4ed8', color: 'white', border: 0, borderRadius: 8, padding: '8px 10px', cursor: 'pointer' }}>Close</button>
              </div>
            </div>
            {docLinkedCards.length > 0 && (
              <div style={{ padding: 12, borderBottom: '1px solid #26314f', display: 'grid', gap: 8 }}>
                {docLinkedCards.map((c) => {
                  const draft = getModalDraft(c)
                  const showInlineEditor = !!modalCardEdits?.[c.id]?.showEditor
                  return (
                    <div key={c.id} style={{ background: '#0a122a', border: '1px solid #26314f', borderRadius: 8, padding: 8 }}>
                      <div style={{ fontSize: 12, opacity: 0.78, marginBottom: 6 }}>{c.title}</div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button onClick={() => setModalDraft(c.id, { showEditor: !showInlineEditor })} style={{ background: '#1d4ed8', color: 'white', border: 0, borderRadius: 6, padding: '4px 8px', cursor: 'pointer' }}>{showInlineEditor ? 'Hide Editor' : 'Edit / Feedback'}</button>
                        <button onClick={() => openArtifact(c)} style={{ background: '#0ea5e9', color: 'white', border: 0, borderRadius: 6, padding: '4px 8px', cursor: 'pointer' }}>Open Document</button>
                        <button onClick={() => openArtifactPopout(c)} style={{ background: '#0284c7', color: 'white', border: 0, borderRadius: 6, padding: '4px 8px', cursor: 'pointer' }}>Pop Out Reader</button>
                        <button onClick={() => generateBrief(c)} disabled={!!briefLoadingByCard[c.id]} style={{ background: '#475569', color: 'white', border: 0, borderRadius: 6, padding: '4px 8px', cursor: 'pointer', opacity: briefLoadingByCard[c.id] ? 0.7 : 1 }}>{briefLoadingByCard[c.id] ? 'Generating…' : 'Generate Summary'}</button>
                        <button onClick={() => saveInterimFeedback(c)} disabled={!!savingDraftByCard[c.id]} style={{ background: '#334155', color: 'white', border: 0, borderRadius: 6, padding: '4px 8px', cursor: 'pointer', opacity: savingDraftByCard[c.id] ? 0.7 : 1 }}>{savingDraftByCard[c.id] ? 'Saving…' : 'Save Interim'}</button>
                        {c.status !== 'waiting_on_alfred' && <button onClick={() => handoffCard(c, 'alfred')} style={{ background: '#7c3aed', color: 'white', border: 0, borderRadius: 6, padding: '4px 8px', cursor: 'pointer' }}>Send to Alfred</button>}
                        {c.status !== 'review' && <button onClick={() => handoffCard(c, 'joe')} style={{ background: '#0f766e', color: 'white', border: 0, borderRadius: 6, padding: '4px 8px', cursor: 'pointer' }}>Send to Joe</button>}
                        {c.status !== 'new' && <button onClick={() => moveCard(c, 'new')} style={{ background: '#1e3a8a', color: 'white', border: 0, borderRadius: 6, padding: '4px 8px', cursor: 'pointer' }}>Move to Inbox</button>}
                        {c.status !== 'done' && <button onClick={() => moveCard(c, 'done')} style={{ background: '#166534', color: 'white', border: 0, borderRadius: 6, padding: '4px 8px', cursor: 'pointer' }}>Complete</button>}
                        {c.status !== 'blocked' && <button onClick={() => moveCard(c, 'blocked')} style={{ background: '#991b1b', color: 'white', border: 0, borderRadius: 6, padding: '4px 8px', cursor: 'pointer' }}>Blocked</button>}
                        <button onClick={() => updateCard({ id: c.id, isArchived: true, archivedAtMs: Date.now() })} style={{ background: '#6b7280', color: 'white', border: 0, borderRadius: 6, padding: '4px 8px', cursor: 'pointer' }}>Archive</button>
                        <button onClick={() => deleteCard(c)} style={{ background: '#991b1b', color: 'white', border: 0, borderRadius: 6, padding: '4px 8px', cursor: 'pointer' }}>Delete</button>
                      </div>
                      {showInlineEditor && (
                        <div style={{ marginTop: 8, display: 'grid', gap: 8 }}>
                          <textarea
                            value={draft.feedback}
                            onChange={(e) => setModalDraft(c.id, { feedback: e.target.value })}
                            rows={3}
                            placeholder='Interim feedback (save now, send later)'
                            style={{ width: '100%', background: '#111827', color: '#e8ecf3', border: '1px solid #334155', borderRadius: 6, padding: '8px 10px' }}
                          />
                          <textarea
                            value={draft.nextSteps}
                            onChange={(e) => setModalDraft(c.id, { nextSteps: e.target.value })}
                            rows={2}
                            placeholder='Next steps / notes to Alfred'
                            style={{ width: '100%', background: '#111827', color: '#e8ecf3', border: '1px solid #334155', borderRadius: 6, padding: '8px 10px' }}
                          />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
            <div style={{ padding: 12, overflow: 'auto', flex: 1 }}>
              <pre style={{ whiteSpace: 'pre-wrap', margin: 0, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 14, lineHeight: 1.5 }}>{selectedDoc.content}</pre>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

