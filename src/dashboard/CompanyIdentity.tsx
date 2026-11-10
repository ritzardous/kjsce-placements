import { useState } from 'react';
import brands from '../data/company-logos.json';

// Explicit aliases only: do not guess a parent brand for an unrelated company.
type Brand = { file: string; background?: string };
const logos = new Map<string, Brand>(brands.flatMap(brand => brand.aliases.map(alias => [alias, brand] as const)));
const normalize = (key: string) => key.replaceAll('_', '-');

export function CompanyLogo({ companyKey, name, size = 'regular' }: { companyKey: string; name: string; size?: 'regular' | 'small' | 'large' }) {
  const brand = logos.get(normalize(companyKey));
  const source = brand?.file;
  const [failedSource, setFailedSource] = useState<string>();
  const initials = name.replace(/[^\p{L}\p{N}\s]/gu, ' ').trim().split(/\s+/).slice(0, 2).map(word => word[0]).join('').toUpperCase();
  const showImage = source && failedSource !== source;
  return <span className={`company-logo company-logo--${size}`} style={showImage && brand?.background ? { background: brand.background } : undefined} aria-hidden="true">
    {showImage
      ? <img src={source} alt="" width="32" height="32" loading={size === 'large' ? 'eager' : 'lazy'} decoding="async" onError={() => setFailedSource(source)} />
      : <span className="company-logo-initials">{initials || '?'}</span>}
  </span>;
}

export function CompanyIdentity({ companyKey, name, size = 'regular' }: { companyKey: string; name: string; size?: 'regular' | 'small' }) {
  return <span className="company-identity"><CompanyLogo companyKey={companyKey} name={name} size={size} /><span className="company-identity-name">{name}</span></span>;
}
