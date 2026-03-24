import { createEnhancement, getEnhancementsData, saveUploadedEnhancementFile, updateEnhancement } from '../../../lib/openclaw-enhancements.js'

export async function GET() {
  try {
    return Response.json(getEnhancementsData())
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req) {
  try {
    const contentType = req.headers.get('content-type') || ''

    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData()
      const id = String(form.get('id') || '').trim()
      const file = form.get('file')
      const saved = await saveUploadedEnhancementFile(id, file)
      return Response.json({ ok: true, ...saved })
    }

    const body = await req.json()
    const created = createEnhancement(body || {})
    return Response.json({ ok: true, created })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 })
  }
}

export async function PATCH(req) {
  try {
    const body = await req.json()
    const saved = updateEnhancement(body || {})
    return Response.json({ ok: true, saved })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 })
  }
}
