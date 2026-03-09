import { getDateNightPlacesData } from '../../../lib/date-night-places.js'

export async function GET() {
  try {
    const data = getDateNightPlacesData()
    return Response.json(data)
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
