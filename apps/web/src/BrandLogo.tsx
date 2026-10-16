import './BrandLogo.css'

type BrandLogoVariant = 'nav' | 'auth' | 'workspace' | 'wizard' | 'studio' | 'profile' | 'footer' | 'card'

export function BrandLogo({ variant = 'nav' }: { variant?: BrandLogoVariant }) {
  return <img className={`koolink-logo koolink-logo--${variant}`} src="/koolink.svg" alt="Koolink" />
}