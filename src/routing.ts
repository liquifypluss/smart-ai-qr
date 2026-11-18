export type PageRoute =
  | { kind: 'demo' }
  | { kind: 'business'; id: string }
  | { kind: 'qr'; id: string }
  | { kind: 'notFound' }

export type PublicRoute = Extract<PageRoute, { kind: 'business' | 'qr' }>

export function resolvePageRoute(pathname: string, base = '/'): PageRoute {
  const path = base !== '/' && pathname.startsWith(base) ? `/${pathname.slice(base.length)}` : pathname
  if (path === '/' || path === '') return { kind: 'demo' }
  const business = /^\/b\/([a-z0-9]+(?:-[a-z0-9]+)*)\/?$/.exec(path)
  if (business && business[1].length <= 90) return { kind: 'business', id: business[1] }
  const qr = /^\/q\/([A-Za-z0-9_-]{24,60})\/?$/.exec(path)
  if (qr) return { kind: 'qr', id: qr[1] }
  return { kind: 'notFound' }
}
