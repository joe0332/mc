import { cookies } from 'next/headers'

export async function POST() {
  cookies().delete('mc_unlock')
  return Response.json({ ok: true })
}
