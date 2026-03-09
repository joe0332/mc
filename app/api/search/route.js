import { searchMissionControl } from '../../../lib/mission-control.js'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q') || ''
    const limit = Number(searchParams.get('limit') || 8)
    const data = searchMissionControl(q, Number.isFinite(limit) ? Math.max(1, Math.min(limit, 25)) : 8)
    return Response.json(data)
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
