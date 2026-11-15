export type Choice = {
  id: string
  label: string
  reviewLabel: string
  art?: 'silver' | 'violet' | 'blue' | 'green' | 'lavender' | 'graphite' | 'gold' | 'charcoal' | 'mint'
  imageUrl?: string
  logoUrl?: string
  wordmark?: string
}

export type BusinessConfig = {
  id: string
  name: string
  location: string
  category: string
  choiceTitle: string
  primaryColor: string
  logo?: string
  headerImage?: { src: string; srcSet?: string }
  destinationUrl: string | null
  choices: Choice[]
}

export const demoBusiness: BusinessConfig = {
  id: 'gadget-gallery',
  name: 'Gadget Gallery',
  location: 'Sigra, Varanasi, Uttar Pradesh',
  category: 'electronics',
  choiceTitle: 'Which brand do you choose?',
  primaryColor: '#0753dd',
  logo: undefined,
  headerImage: {
    src: new URL('../assets/gadget-gallery-header-960.webp', import.meta.url).href,
    srcSet: `${new URL('../assets/gadget-gallery-header-480.webp', import.meta.url).href} 480w, ${new URL('../assets/gadget-gallery-header-960.webp', import.meta.url).href} 960w`
  },
  destinationUrl: null,
  choices: [
    { id: 'apple', logoUrl: new URL('../assets/brands/apple.svg', import.meta.url).href, label: 'Apple', reviewLabel: 'Apple phones', art: 'silver' },
    { id: 'samsung', logoUrl: new URL('../assets/brands/samsung.svg', import.meta.url).href, label: 'Samsung', reviewLabel: 'Samsung phones', art: 'violet', wordmark: 'SAMSUNG' },
    { id: 'vivo', logoUrl: new URL('../assets/brands/vivo.svg', import.meta.url).href, label: 'Vivo', reviewLabel: 'Vivo phones', art: 'blue', wordmark: 'vivo' },
    { id: 'oppo', logoUrl: new URL('../assets/brands/oppo.svg', import.meta.url).href, label: 'Oppo', reviewLabel: 'Oppo phones', art: 'green', wordmark: 'oppo' },
    { id: 'redmi', logoUrl: new URL('../assets/brands/redmi.svg', import.meta.url).href, label: 'Redmi', reviewLabel: 'Redmi phones', art: 'lavender', wordmark: 'Redmi' },
    { id: 'oneplus', logoUrl: new URL('../assets/brands/oneplus.svg', import.meta.url).href, label: 'OnePlus', reviewLabel: 'OnePlus phones', art: 'graphite', wordmark: 'OnePlus' },
    { id: 'motorola', label: 'Motorola', reviewLabel: 'Motorola phones', art: 'gold' },
    { id: 'realme', label: 'Realme', reviewLabel: 'Realme phones', art: 'charcoal' },
    { id: 'nothing', label: 'Nothing', reviewLabel: 'Nothing phones', art: 'mint' }
  ]
}
