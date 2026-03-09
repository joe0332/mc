import { addTodoItemValidated, getTodoListData, saveTodoListData } from '../../../lib/todo-list.js'

export async function GET() {
  try {
    return Response.json(getTodoListData())
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

export async function PUT(req) {
  try {
    const body = await req.json()
    const saved = saveTodoListData(body || {})
    return Response.json({ ok: true, ...saved })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 })
  }
}

export async function POST(req) {
  try {
    const body = await req.json()
    const result = addTodoItemValidated(body || {})
    return Response.json(result)
  } catch (err) {
    return Response.json({ ok: false, error: err.message }, { status: 400 })
  }
}
