import { getUpworkJobsData, upsertUpworkPreference } from '../../../lib/upwork-jobs.js'

export async function GET() {
  try {
    const data = getUpworkJobsData()
    return Response.json(data)
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(req) {
  try {
    const body = await req.json()
    const saved = upsertUpworkPreference(body || {})
    return Response.json({ ok: true, saved })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 })
  }
}
