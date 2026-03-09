import { refreshDashboardData } from '../../../lib/mission-control.js'

export async function POST() {
  try {
    const data = refreshDashboardData()
    return Response.json({ ok: true, ...data })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
