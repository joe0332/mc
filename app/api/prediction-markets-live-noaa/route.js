import { getLivePredictionMarketsOverview } from '../../../lib/prediction-markets-live-noaa.js'

export async function GET() {
  try {
    const data = await getLivePredictionMarketsOverview()
    return Response.json(data)
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
