import { createKanbanCard, getKanbanBoard } from '../../../lib/mission-control.js'

export async function GET() {
  try {
    return Response.json(getKanbanBoard())
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const created = createKanbanCard(body || {})
    return Response.json({ ok: true, ...created })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
