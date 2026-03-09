import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const WORKSPACE_ALLOWED_ROOT = path.join(ROOT, 'media', 'inbound')
const OPENCLAW_ALLOWED_ROOT = path.join(process.env.USERPROFILE || '', '.openclaw', 'media', 'inbound')

function bad(msg, status = 400) {
  return Response.json({ error: msg }, { status })
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const rel = String(searchParams.get('path') || '').trim()
    if (!rel) return bad('Missing path')

    const normalizedRel = rel.replace(/^\.\//, '')
    const workspaceTarget = path.resolve(ROOT, normalizedRel)
    const openclawTarget = path.resolve(process.env.USERPROFILE || '', '.openclaw', normalizedRel)

    const allowedRoots = [WORKSPACE_ALLOWED_ROOT, OPENCLAW_ALLOWED_ROOT]
      .map((p) => path.resolve(p))
      .filter((p) => p && fs.existsSync(p))

    const candidateTargets = [workspaceTarget, openclawTarget]
    const target = candidateTargets.find((candidate) => {
      const insideAllowed = allowedRoots.some((allowed) => candidate.startsWith(allowed + path.sep) || candidate === allowed)
      return insideAllowed && fs.existsSync(candidate) && fs.statSync(candidate).isFile()
    })

    if (!target) {
      return bad('File not found', 404)
    }

    const ext = path.extname(target).toLowerCase()
    const contentType = ext === '.jpg' || ext === '.jpeg'
      ? 'image/jpeg'
      : ext === '.png'
        ? 'image/png'
        : ext === '.webp'
          ? 'image/webp'
          : ext === '.gif'
            ? 'image/gif'
            : 'application/octet-stream'

    const buf = fs.readFileSync(target)
    return new Response(buf, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'no-store'
      }
    })
  } catch (err) {
    return bad(err.message || 'Attachment error', 500)
  }
}
