import type { BusinessConfig, Choice } from '../../src/config/business.js'
import type { Business, BusinessAsset, BusinessChoice, BusinessLocation, ReviewSettings } from './schema.js'

type BusinessConfigInput = {
  business: Business
  locations: BusinessLocation[]
  choices: BusinessChoice[]
  assets: BusinessAsset[]
  settings: ReviewSettings
  assetUrl: (storageKey: string) => string
}

export function toBusinessConfig({ business, locations, choices, assets, settings, assetUrl }: BusinessConfigInput): BusinessConfig {
  if (business.status !== 'active') throw new Error('Business is inactive')
  if (settings.businessId !== business.id) throw new Error('Settings do not belong to business')
  const location = locations.find((entry) => entry.businessId === business.id && entry.isPrimary && entry.status === 'active')
    ?? locations.find((entry) => entry.businessId === business.id && entry.status === 'active')
  const ownedAssets = assets.filter((asset) => asset.businessId === business.id)
  const mainLogo = ownedAssets.find((asset) => asset.kind === 'logo')
  const headerImages = ownedAssets.filter((asset) => asset.kind === 'header_image').sort((a, b) => (a.width ?? 0) - (b.width ?? 0))
  const header = headerImages.at(-1)
  const mappedChoices: Choice[] = choices.filter((choice) => choice.businessId === business.id && choice.status === 'active')
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((choice) => {
      const logo = ownedAssets.find((asset) => asset.choiceId === choice.id && asset.kind === 'choice_logo')
      const image = ownedAssets.find((asset) => asset.choiceId === choice.id && asset.kind === 'choice_image')
      return {
        id: choice.code,
        label: choice.label,
        reviewLabel: choice.reviewLabel,
        ...(choice.art ? { art: choice.art } : {}),
        ...(choice.wordmark ? { wordmark: choice.wordmark } : {}),
        ...(logo ? { logoUrl: assetUrl(logo.storageKey) } : {}),
        ...(image ? { imageUrl: assetUrl(image.storageKey) } : {})
      }
    })
  return {
    id: business.slug,
    name: business.name,
    location: location?.displayAddress ?? '',
    category: business.category,
    choiceTitle: settings.choiceTitle,
    primaryColor: business.primaryColor,
    ...(mainLogo ? { logo: assetUrl(mainLogo.storageKey) } : {}),
    ...(header ? { headerImage: {
      src: assetUrl(header.storageKey),
      ...(headerImages.length > 1 ? { srcSet: headerImages.filter((entry) => entry.width).map((entry) => `${assetUrl(entry.storageKey)} ${entry.width}w`).join(', ') } : {})
    } } : {}),
    destinationUrl: location?.destinationUrl ?? business.destinationUrl,
    choices: mappedChoices
  }
}
