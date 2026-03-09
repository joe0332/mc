import { getRecipesData } from '../../../lib/recipes.js'

export async function GET() {
  try {
    const data = getRecipesData()
    return Response.json(data)
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
