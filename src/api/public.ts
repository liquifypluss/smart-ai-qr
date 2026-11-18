import type { BusinessConfig } from '../config/business'
import type { Language, PhraseLibrarySource } from '../review/phrases'
import type { PublicRoute } from '../routing'

export type PublicPayload = {
  business: BusinessConfig
  languages: Language[]
  phraseLibrary: PhraseLibrarySource
  qr?: { publicId: string; label: string | null }
}

export class PublicApiError extends Error {
  constructor(readonly status: 'notFound' | 'network') {
    super(status)
  }
}

const cache = new Map<string, { value: PublicPayload; until: number }>()
const supportedLanguages: Language[] = ['en', 'hi', 'hinglish']
const isObject = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)

export function parsePublicPayload(value: unknown): PublicPayload {
  if (!isObject(value) || !isObject(value.business) || !isObject(value.phraseLibrary) || !Array.isArray(value.languages)) {
    throw new PublicApiError('network')
  }
  const { business } = value
  if (typeof business.id !== 'string' || typeof business.name !== 'string' ||
    typeof business.category !== 'string' || typeof business.location !== 'string' ||
    typeof business.choiceTitle !== 'string' || !/^#[a-f0-9]{6}$/i.test(String(business.primaryColor)) ||
    !Array.isArray(business.choices) || !business.choices.every((choice) => isObject(choice) &&
      typeof choice.id === 'string' && typeof choice.label === 'string' && typeof choice.reviewLabel === 'string') ||
    (business.destinationUrl !== null && typeof business.destinationUrl !== 'string')) {
    throw new PublicApiError('network')
  }
  const enabled: unknown[] = value.languages
  const languages = supportedLanguages.filter((language) => enabled.includes(language))
  if (!languages.length) throw new PublicApiError('network')
  return {
    business: business as BusinessConfig,
    languages,
    phraseLibrary: value.phraseLibrary as PhraseLibrarySource,
    ...(isObject(value.qr) && typeof value.qr.publicId === 'string' &&
      (value.qr.label === null || typeof value.qr.label === 'string')
      ? { qr: { publicId: value.qr.publicId, label: value.qr.label as string | null } }
      : {})
  }
}

export async function loadPublicPage(route: PublicRoute, signal: AbortSignal, rawOrigin: string): Promise<PublicPayload> {
  let origin: URL
  try {
    origin = new URL(rawOrigin)
    if (origin.protocol !== 'https:' || origin.origin !== rawOrigin) throw new Error('Invalid origin')
  } catch {
    throw new PublicApiError('network')
  }
  const url = `${origin.origin}/api/v1/public/${route.kind === 'business' ? 'businesses' : 'qr'}/${encodeURIComponent(route.id)}`
  const cached = cache.get(url)
  if (cached && cached.until > Date.now()) return cached.value
  let response: Response
  try {
    response = await fetch(url, { signal, headers: { Accept: 'application/json' } })
  } catch {
    throw new PublicApiError('network')
  }
  if (response.status === 404 || response.status === 400) throw new PublicApiError('notFound')
  if (!response.ok) throw new PublicApiError('network')
  let value: unknown
  try {
    value = await response.json()
  } catch {
    throw new PublicApiError('network')
  }
  const payload = parsePublicPayload(value)
  if (route.kind === 'qr' && payload.qr?.publicId !== route.id) throw new PublicApiError('network')
  cache.set(url, { value: payload, until: Date.now() + 15000 })
  if (cache.size > 12) cache.delete(cache.keys().next().value ?? '')
  return payload
}
