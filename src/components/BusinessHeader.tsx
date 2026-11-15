import type { BusinessConfig } from '../config/business'
import { BagIcon, PinIcon } from './Icons'

export function BusinessHeader({ business }: { business: BusinessConfig }) {
  return <header className="business-header">
    {business.headerImage && <img className="header-background" src={business.headerImage.src} srcSet={business.headerImage.srcSet} sizes="(min-width: 520px) 440px, 100vw" width="960" height="240" alt="" loading="eager" decoding="async" fetchPriority="high" />}
    <div className="business-identity">
      <span className="business-logo-frame">
        {business.logo ? <img className="business-logo" src={business.logo} alt="" width="40" height="45" decoding="async" /> : <BagIcon className="business-logo" />}
      </span>
      <div className="business-copy">
        <h1>{business.name}</h1>
        <p><PinIcon />{business.location}</p>
      </div>
    </div>
  </header>
}
