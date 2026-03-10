import {
  addBiomarkerEntry,
  addBowelLog,
  addHabitEntry,
  addNutritionEntry,
  addNutritionFeedback,
  deleteNutritionEntry,
  getNutritionDay,
  updateNutritionMeta
} from '../../../lib/nutrition-macros.js'

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const date = searchParams.get('date') || undefined
    const data = getNutritionDay(date)
    return Response.json(data)
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req) {
  try {
    const body = await req.json()
    const action = String(body?.action || '')
    const date = body?.date

    if (action === 'add_entry') {
      const saved = addNutritionEntry({ date, entry: body?.entry })
      return Response.json({ ok: true, saved, day: getNutritionDay(date) })
    }

    if (action === 'delete_entry') {
      const out = deleteNutritionEntry({ date, id: body?.id })
      return Response.json({ ok: true, ...out, day: getNutritionDay(date) })
    }

    if (action === 'add_habit_entry') {
      const saved = addHabitEntry({ date, entry: body?.entry })
      return Response.json({ ok: true, saved, day: getNutritionDay(date) })
    }

    if (action === 'add_biomarker') {
      const saved = addBiomarkerEntry({ date, entry: body?.entry })
      return Response.json({ ok: true, saved, day: getNutritionDay(date) })
    }

    if (action === 'add_bowel') {
      const saved = addBowelLog({ date, entry: body?.entry })
      return Response.json({ ok: true, saved, day: getNutritionDay(date) })
    }

    if (action === 'update_meta') {
      updateNutritionMeta({ date, trainingDay: body?.trainingDay, supplements: body?.supplements, checkins: body?.checkins })
      return Response.json({ ok: true, day: getNutritionDay(date) })
    }

    if (action === 'add_feedback') {
      const saved = addNutritionFeedback({ date, text: body?.text })
      return Response.json({ ok: true, saved, day: getNutritionDay(date) })
    }

    return Response.json({ error: 'Unsupported action' }, { status: 400 })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 })
  }
}
