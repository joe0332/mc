import { getEnhancementsData, saveJobCategory } from '../../../lib/openclaw-enhancements.js'

export async function GET() {
  try {
    return Response.json(getEnhancementsData())
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(req) {
  try {
    const body = await req.json()
    const saved = saveJobCategory({ jobId: body?.jobId, category: body?.category })
    return Response.json({ ok: true, saved })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 })
  }
}
