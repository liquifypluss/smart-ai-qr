const string = { type: 'string' } as const
const maybeString = { anyOf: [string, { type: 'null' }] } as const
const choice = {
  type: 'object',
  additionalProperties: false,
  required: ['id', 'label', 'reviewLabel'],
  properties: {
    id: string, label: string, reviewLabel: string, art: string,
    wordmark: string, imageUrl: string, logoUrl: string
  }
} as const
const business = {
  type: 'object',
  additionalProperties: false,
  required: ['id', 'name', 'location', 'category', 'choiceTitle', 'primaryColor', 'destinationUrl', 'choices'],
  properties: {
    id: string, name: string, location: string, category: string, choiceTitle: string,
    primaryColor: string, logo: string, headerImage: {
      type: 'object', additionalProperties: false, required: ['src'],
      properties: { src: string, srcSet: string }
    },
    destinationUrl: maybeString, choices: { type: 'array', items: choice }
  }
} as const
const phrases = {
  type: 'object',
  additionalProperties: false,
  required: ['opening', 'details', 'item', 'closing'],
  properties: Object.fromEntries(['opening', 'details', 'item', 'closing'].map((part) => [part, { type: 'array', items: string }]))
}
const languagePhrases = {
  type: 'object', additionalProperties: false,
  required: ['0', '1', '2', '3', '4', '5'],
  properties: Object.fromEntries([0, 1, 2, 3, 4, 5].map((rating) => [String(rating), phrases]))
}
export const publicPayload = {
  type: 'object', additionalProperties: false,
  required: ['business', 'languages', 'phraseLibrary'],
  properties: {
    business,
    languages: { type: 'array', items: { type: 'string', enum: ['en', 'hi', 'hinglish'] } },
    phraseLibrary: {
      type: 'object', additionalProperties: false,
      properties: { en: languagePhrases, hi: languagePhrases, hinglish: languagePhrases }
    }
  }
} as const
export const qrPayload = {
  ...publicPayload,
  required: [...publicPayload.required, 'qr'],
  properties: {
    ...publicPayload.properties,
    qr: { type: 'object', additionalProperties: false, required: ['publicId', 'label'],
      properties: { publicId: string, label: maybeString } }
  }
}
export const notFound = { type: 'object', additionalProperties: false, required: ['error'], properties: { error: string } } as const
export const slugParams = {
  type: 'object', additionalProperties: false, required: ['slug'],
  properties: { slug: { type: 'string', minLength: 1, maxLength: 90, pattern: '^[a-z0-9]+(-[a-z0-9]+)*$' } }
} as const
export const qrParams = {
  type: 'object', additionalProperties: false, required: ['publicId'],
  properties: { publicId: { type: 'string', minLength: 24, maxLength: 60, pattern: '^[A-Za-z0-9_-]{24,60}$' } }
} as const
export const assetParams = {
  type: 'object', additionalProperties: false, required: ['id'],
  properties: { id: { type: 'string', format: 'uuid' } }
} as const
