import { cookies } from 'next/headers'

const COOKIE_NAME = 'mc_unlock'
const PASSCODE = '12365'

export async function POST(req) {
  try {
    const body = await req.json()
    const code = String(body?.code || '')
    const next = String(body?.next || '/').startsWith('/') ? String(body?.next || '/') : '/'

    if (code !== PASSCODE) {
      return Response.json({ ok: false, error: 'Incorrect passcode' }, { status: 401 })
    }

    cookies().set(COOKIE_NAME, PASSCODE, {
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
      path: '/'
    })

    return Response.json({ ok: true, next })
  } catch (err) {
    return Response.json({ ok: false, error: err.message }, { status: 400 })
  }
}
