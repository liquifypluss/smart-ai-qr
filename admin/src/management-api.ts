import { request } from './api'

export type Page<T> = { items: T[]; total: number; page: number; limit: number }
export type BusinessRow = { id: string; name: string; slug: string; category: string; primaryColor: string; status: 'active' | 'inactive'; locationCount: number; qrCount: number; libraries: string; logoId: string | null; createdAt: string }
export type Business = { id: string; name: string; slug: string; category: string; primaryColor: string; destinationUrl: string | null; status: 'active' | 'inactive'; createdAt: string }
export type Location = { id: string; businessId: string; code: string; name: string; displayAddress: string; city: string | null; region: string | null; country: string | null; destinationUrl: string | null; isPrimary: boolean; status: 'active' | 'inactive' }
export type Choice = { id: string; code: string; label: string; reviewLabel: string; art: string | null; wordmark: string | null; sortOrder: number; status: 'active' | 'inactive' }
export type QrRecord = { id: string; publicId: string; label: string | null; locationId: string | null; template: 'signature' | 'minimal' | 'business'; status: 'active' | 'inactive'; createdAt: string }
export type ReviewSettings = { id: string; choiceTitle: string; languages: ('en' | 'hi' | 'hinglish')[] }
export type Asset = { id: string; kind: 'logo' | 'header_image' | 'choice_image' | 'choice_logo'; variant: string; choiceId: string | null; width: number | null; height: number | null; mimeType: string }
export type LibraryAssignment = { id: string; name: string; slug: string; status: 'active' | 'inactive'; priority: number; isDefault: boolean }
export type BusinessDetail = { business: Business; locations: Location[]; choices: Choice[]; assets: Asset[]; qrCodes: QrRecord[]; settings: ReviewSettings | null; assignedLibraries: LibraryAssignment[] }
export type LibraryRow = { id: string; slug: string; name: string; description: string; industry: string | null; ownerBusinessId: string | null; status: 'active' | 'inactive'; businessCount: number; phraseCount: number; createdAt: string }
export type Phrase = { id: string; language: 'en' | 'hi' | 'hinglish'; rating: number; part: 'opening' | 'details' | 'item' | 'closing'; phrase: string; sortOrder: number; isActive: boolean }
export type LibraryDetail = { library: LibraryRow; phrases: Phrase[]; businesses: { id: string; name: string; slug: string; priority: number; isDefault: boolean }[] }
export type Activity = { id: string; action: string; entityType: string; businessId: string | null; businessName: string | null; details: Record<string, unknown>; createdAt: string }

const root = '/api/v1/admin'
const get = <T>(path: string) => request<T>(root + path)
const change = <T>(path: string, method: 'POST' | 'PATCH' | 'DELETE', csrf: string, data?: object) => request<T>(root + path, { method, headers: { 'x-csrf-token': csrf }, ...(data ? { body: JSON.stringify(data) } : {}) })
const query = (values: Record<string, string | number | undefined>) => {
  const p = new URLSearchParams()
  for (const [key, value] of Object.entries(values)) if (value !== undefined && value !== '') p.set(key, String(value))
  return `?${p.toString()}`
}

export const managementApi = {
  businesses: (filters: { q?: string; page?: number; status?: string; category?: string }) => get<Page<BusinessRow>>('/businesses' + query(filters)),
  business: (id: string) => get<BusinessDetail>(`/businesses/${id}`),
  createBusiness: (csrf: string, value: object) => change<Business>('/businesses', 'POST', csrf, value),
  updateBusiness: (csrf: string, id: string, value: object) => change<Business>(`/businesses/${id}`, 'PATCH', csrf, value),
  createLocation: (csrf: string, id: string, value: object) => change<Location>(`/businesses/${id}/locations`, 'POST', csrf, value),
  updateLocation: (csrf: string, id: string, child: string, value: object) => change<Location>(`/businesses/${id}/locations/${child}`, 'PATCH', csrf, value),
  createChoice: (csrf: string, id: string, value: object) => change<Choice>(`/businesses/${id}/choices`, 'POST', csrf, value),
  updateChoice: (csrf: string, id: string, child: string, value: object) => change<Choice>(`/businesses/${id}/choices/${child}`, 'PATCH', csrf, value),
  updateSettings: (csrf: string, id: string, value: object) => change<ReviewSettings>(`/businesses/${id}/review-settings`, 'PATCH', csrf, value),
  createQr: (csrf: string, id: string, value: object) => change<QrRecord>(`/businesses/${id}/qr-codes`, 'POST', csrf, value),
  updateQr: (csrf: string, id: string, child: string, value: object) => change<QrRecord>(`/businesses/${id}/qr-codes/${child}`, 'PATCH', csrf, value),
  uploadAsset: (csrf: string, id: string, kind: string, file: File, choiceId?: string) => {
    const data = new FormData(); data.append('file', file)
    return request<Asset>(root + `/businesses/${id}/assets` + query({ kind, choiceId }), { method: 'POST', headers: { 'x-csrf-token': csrf }, body: data })
  },
  libraries: (filters: { q?: string; page?: number; status?: string; category?: string }) => get<Page<LibraryRow>>('/phrase-libraries' + query(filters)),
  library: (id: string) => get<LibraryDetail>(`/phrase-libraries/${id}`),
  createLibrary: (csrf: string, value: object) => change<LibraryRow>('/phrase-libraries', 'POST', csrf, value),
  updateLibrary: (csrf: string, id: string, value: object) => change<LibraryRow>(`/phrase-libraries/${id}`, 'PATCH', csrf, value),
  duplicateLibrary: (csrf: string, id: string, value: object) => change<LibraryRow>(`/phrase-libraries/${id}/duplicate`, 'POST', csrf, value),
  createPhrase: (csrf: string, id: string, value: object) => change<Phrase>(`/phrase-libraries/${id}/phrases`, 'POST', csrf, value),
  updatePhrase: (csrf: string, id: string, phraseId: string, value: object) => change<Phrase>(`/phrase-libraries/${id}/phrases/${phraseId}`, 'PATCH', csrf, value),
  assignLibrary: (csrf: string, id: string, value: object) => change<LibraryAssignment>(`/businesses/${id}/phrase-libraries`, 'POST', csrf, value),
  unassignLibrary: (csrf: string, id: string, libraryId: string) => change<void>(`/businesses/${id}/phrase-libraries/${libraryId}`, 'DELETE', csrf),
  preview: (id: string, values: { language: string; rating: number; choiceId?: string }) => get<{ text: string; source: string }>(`/businesses/${id}/review-preview` + query(values)),
  activity: (filters: { page?: number; action?: string; businessId?: string }) => get<Page<Activity>>('/activity' + query(filters))
}
