import { deleteKanbanCard, updateKanbanCard } from '../../../../lib/mission-control.js'

export async function PATCH(request) {
  try {
    const body = await request.json()
    const result = updateKanbanCard(body || {})
    return Response.json(result)
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    const body = await request.json()
    const result = deleteKanbanCard(body || {})
    return Response.json(result)
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
