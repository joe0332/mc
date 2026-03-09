import { getTodoListData } from '../../../lib/todo-list.js'

function bad(msg, status = 400) {
  return Response.json({ error: msg }, { status })
}

function extractPaths(text) {
  const raw = String(text || '')
  const rx = /\.\/media\/inbound\/[\w\-.]+\.(?:jpg|jpeg|png|webp|gif)/gi
  const out = []
  let m
  while ((m = rx.exec(raw)) !== null) out.push(m[0])
  return Array.from(new Set(out))
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const id = String(searchParams.get('id') || '').trim()
    if (!id) return bad('Missing todo id')

    const data = getTodoListData()
    const row = (Array.isArray(data.rows) ? data.rows : []).find((r) => String(r?.id || '') === id)
    if (!row) return bad('Todo not found', 404)

    const paths = extractPaths(row.comments)
    const items = paths.map((p) => {
      const href = `/api/attachment?path=${encodeURIComponent(p)}`
      return `<li style=\"margin:6px 0\"><a href=\"${href}\" target=\"_blank\" rel=\"noreferrer\">${p.replace('./media/inbound/', '')}</a></li>`
    }).join('')

    const html = `<!doctype html>
<html>
<head><meta charset=\"utf-8\"><title>Support Folder</title></head>
<body style=\"font-family:Segoe UI,Arial,sans-serif;padding:16px;background:#0b1020;color:#e8ecf3\">
  <h2 style=\"margin-top:0\">Support folder</h2>
  <div style=\"opacity:.8;margin-bottom:6px\">Todo: ${String(row.task || '(untitled)')}</div>
  <div style=\"opacity:.7;margin-bottom:12px;font-size:13px\">Only items explicitly referenced in this todo's comments are shown.</div>
  ${paths.length ? `<ul>${items}</ul>` : '<div>No support items linked for this todo yet.</div>'}
</body>
</html>`

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store'
      }
    })
  } catch (err) {
    return bad(err.message || 'Support folder error', 500)
  }
}
