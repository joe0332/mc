import { logCommunication } from '../../../lib/mission-control.js'

export async function POST(req) {
  try {
    const body = await req.json()
    const result = logCommunication(body || {})
    return Response.json({ ok: true, ...result })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 })
  }
}
