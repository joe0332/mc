import { runJobNow } from '../../../../lib/mission-control.js'

export async function POST(request) {
  try {
    const body = await request.json()
    const data = runJobNow(body?.id)
    return Response.json({ ok: true, ...data })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
