import { getMomBirthdayPlannerData, saveMomBirthdayPlannerData } from '../../../lib/mom-birthday-planner.js'

export async function GET() {
  try {
    return Response.json(getMomBirthdayPlannerData())
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

export async function PUT(req) {
  try {
    const body = await req.json()
    const saved = saveMomBirthdayPlannerData(body || {})
    return Response.json({ ok: true, ...saved })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 })
  }
}
