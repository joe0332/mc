import { NextResponse } from 'next/server'

const COOKIE_NAME = 'mc_unlock'
const PASSCODE = '12365'

export function middleware(req) {
  const { pathname } = req.nextUrl

  const publicPaths = [
    '/unlock',
    '/api/auth/unlock',
    '/api/auth/logout'
  ]

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/public') ||
    publicPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  ) {
    return NextResponse.next()
  }

  const token = req.cookies.get(COOKIE_NAME)?.value || ''
  if (token === PASSCODE) return NextResponse.next()

  const url = req.nextUrl.clone()
  url.pathname = '/unlock'
  url.searchParams.set('next', pathname)
  return NextResponse.redirect(url)
}

export const config = {
  matcher: ['/((?!.*\\..*).*)']
}
