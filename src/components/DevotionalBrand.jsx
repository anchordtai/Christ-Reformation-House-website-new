import { DEVOTIONAL_BRAND as brand } from '../utils/devotional-brand.mjs'
export default function DevotionalBrand({ variant='reading' }) {
  const page = variant === 'page'
  return <div className={`dev-brand dev-brand--${page?'page':'reading'}`}>
    <img className="dev-brand-art" src={brand.image} alt="An open Bible illuminated by warm golden light beneath an emerald sky" width="1536" height="512" loading={page?'eager':'lazy'}/>
    <div className="dev-brand-shade" aria-hidden="true"/>
    <div className="dev-brand-copy"><p className="dev-brand-publisher"><img src="/assets/img/crhlogo.jpg" alt="" width="34" height="34"/>{brand.publisher}</p><p className="dev-brand-label">A DAILY DEVOTIONAL</p>{page?<h1 className="dev-brand-title">{brand.title}</h1>:<p className="dev-brand-title"><strong>{brand.title}</strong></p>}<p className="dev-brand-tagline">{brand.tagline}</p></div>
  </div>
}
