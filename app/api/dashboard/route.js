import { getDashboardData } from '../../../lib/mission-control.js'

export async function GET() {
  try {
    const data = getDashboardData()
    return Response.json(data)
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
