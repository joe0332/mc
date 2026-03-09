import { getPredictionMarketsOverview, runPredictionMarketSettlementCheck } from '../../../lib/prediction-markets-noaa.js'

export async function GET() {
  try {
    const data = await getPredictionMarketsOverview()
    return Response.json(data)
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

export async function POST() {
  try {
    const result = await runPredictionMarketSettlementCheck()
    const overview = await getPredictionMarketsOverview()
    return Response.json({ ok: true, result, overview })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
