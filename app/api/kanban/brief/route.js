import { getArtifactBrief } from '../../../../lib/mission-control.js'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const relPath = searchParams.get('path')
    const data = getArtifactBrief(relPath)
    return Response.json(data)
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
