import { refreshDashboardData } from '../../../lib/mission-control.js'
import { isSnapshotMode } from '../../../lib/snapshot-store.js'

export async function POST() {
  try {
    if (isSnapshotMode()) {
      return Response.json({ ok: true, snapshot: true, refreshedJobs: 0 })
    }

    const data = refreshDashboardData()
    return Response.json({ ok: true, ...data })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
