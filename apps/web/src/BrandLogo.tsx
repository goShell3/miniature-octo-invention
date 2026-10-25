import './BrandLogo.css'

type BrandLogoVariant = 'nav' | 'auth' | 'workspace' | 'wizard' | 'studio' | 'profile' | 'footer' | 'card'

export function BrandLogo({ variant = 'nav' }: { variant?: BrandLogoVariant }) {
  return (
    <div className={`koolink-brand-lockup koolink-brand-lockup--${variant}`}>
      <img
        className={`koolink-logo koolink-logo-desktop koolink-logo--${variant}`}
        src="/koolink.svg"
        alt="Koolink"
      />
      <img
        className="koolink-logo-mobile"
        src="/icon.png"
        alt="Koolink"
        onError={(e) => {
          e.currentTarget.onerror = null
          e.currentTarget.src = '/icon.svg'
        }}
      />
    </div>
  )
}
