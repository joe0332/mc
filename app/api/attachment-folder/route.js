import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const WORKSPACE_ALLOWED_ROOT = path.join(ROOT, 'media', 'inbound')
const OPENCLAW_ALLOWED_ROOT = path.join(process.env.USERPROFILE || '', '.openclaw', 'media', 'inbound')

function bad(msg, status = 400) {
  return Response.json({ error: msg }, { status })
}

function getAllowedRoots() {
  return [WORKSPACE_ALLOWED_ROOT, OPENCLAW_ALLOWED_ROOT]
    .map((p) => path.resolve(p))
    .filter((p) => p && fs.existsSync(p))
}

function resolveFolder(rel) {
  const normalizedRel = String(rel || '').replace(/^\.\//, '').trim()
  if (!normalizedRel) return null

  const workspaceTarget = path.resolve(ROOT, normalizedRel)
  const openclawTarget = path.resolve(process.env.USERPROFILE || '', '.openclaw', normalizedRel)
  const allowedRoots = getAllowedRoots()

  const candidate = [workspaceTarget, openclawTarget].find((candidatePath) => {
    const insideAllowed = allowedRoots.some((allowed) => candidatePath.startsWith(allowed + path.sep) || candidatePath === allowed)
    return insideAllowed && fs.existsSync(candidatePath) && fs.statSync(candidatePath).isDirectory()
  })

  return candidate || null
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const rel = String(searchParams.get('path') || '').trim()
    if (!rel) return bad('Missing path')

    const folder = resolveFolder(rel)
    if (!folder) return bad('Folder not found', 404)

    const entries = fs.readdirSync(folder, { withFileTypes: true })
      .filter((e) => e.isFile())
      .map((e) => e.name)
      .sort((a, b) => a.localeCompare(b))

    const relFolder = rel.replace(/^\.\//, '')
    const items = entries.map((name) => {
      const relFile = `./${relFolder}/${name}`.replace(/\\/g, '/')
      const href = `/api/attachment?path=${encodeURIComponent(relFile)}`
      return `<li style=\"margin:6px 0\"><a href=\"${href}\" target=\"_blank\" rel=\"noreferrer\">${name}</a></li>`
    }).join('')

    const html = `<!doctype html>
<html>
<head><meta charset=\"utf-8\"><title>Support Folder</title></head>
<body style=\"font-family:Segoe UI,Arial,sans-serif;padding:16px;background:#0b1020;color:#e8ecf3\">
  <h2 style=\"margin-top:0\">Support folder</h2>
  <div style=\"opacity:.8;margin-bottom:12px\">${rel}</div>
  ${entries.length ? `<ul>${items}</ul>` : '<div>No files found.</div>'}
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
