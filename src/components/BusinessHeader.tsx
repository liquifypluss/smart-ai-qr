import type { BusinessConfig } from '../config/business'
import { BagIcon, PinIcon } from './Icons'

export function BusinessHeader({ business }: { business: BusinessConfig }) {
  return <header className="business-header">
    <svg className="header-wave" viewBox="0 0 440 100" preserveAspectRatio="none" aria-hidden="true"><path fill="#eaf2ff" d="M0 44c70-5 73 63 140 50S296 34 355 56s63 17 85-6v50H0Z"/><path fill="#f5f9ff" d="M0 85c65-22 102 16 177 4S322 20 440 78v22H0Z"/></svg>
    <div className="business-identity">
      {business.logo ? <img className="business-logo" src={business.logo} alt="" /> : <BagIcon className="business-logo" />}
      <div className="business-copy">
        <h1>{business.name}</h1>
        <p><PinIcon />{business.location}</p>
      </div>
    </div>
  </header>
}
