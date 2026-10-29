export type PortfolioStatus = 'draft' | 'published' | 'unpublished';

export type PaymentMethod = 'telebirr' | 'cbe';
export type PaymentStatus = 'unpaid' | 'verifying' | 'paid' | 'failed';

export const MANUAL_PAYMENT_ACCOUNTS = {
  accountHolder: 'Robba Bayisa',
  telebirr: {
    name: 'Robba Bayisa',
    phone: '+251978447307',
    displayPhone: '0978 447 307',
    rawPhone: '0978447307',
    label: 'Telebirr SuperApp / Mobile Transfer',
  },
  cbe: {
    bankName: 'Commercial Bank of Ethiopia (CBE / ንግድ ባንክ)',
    accountHolder: 'Robba Bayisa',
    accountNumber: '1000300153608',
    label: 'Commercial Bank of Ethiopia (ንግድ ባንክ)',
  },
} as const;

export interface VerifyPaymentInput {
  reference?: string;
  chekiUrl?: string;
  method?: PaymentMethod;
  verificationType?: 'url' | 'screenshot';
  screenshotUrl?: string;
  notes?: string;
}

export interface NfcOrderSummary {
  id: string;
  status: 'pending' | 'printing' | 'shipped' | 'delivered';
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod | null;
  paymentReference?: string | null;
  chekiUrl?: string | null;
  paymentVerifiedAt?: string | null;
  paymentVerificationData?: Record<string, any> | null;
  tier: NfcCardTier;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  currency: string;
  shortUrl: string;
  createdAt: string | Date;
  shippingAddress?: {
    name: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    region: string;
    postalCode?: string;
    countryCode: string;
  };
}

export const NFC_CARD_TIER_PRICES_ETB = {
  individual: 2999,
  business: 2799,
  enterprise: 2499,
  corporate: 1999,
} as const;

export type NfcCardTier = keyof typeof NFC_CARD_TIER_PRICES_ETB;

export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  role?: 'admin' | 'user';
  customerType?: NfcCardTier;
  companyName?: string | null;
  companyLogoUrl?: string | null;
  brandColor?: string | null;
  phoneNumber?: string;
  tinNumber?: string;
  teamSize?: string;
}

export interface CompanyBrandKit {
  companyName: string;
  companyLogoUrl?: string | null;
  brandColor?: string | null;
  customerType?: NfcCardTier;
}

export interface AdminOrderSummary extends NfcOrderSummary {
  owner: {
    id: string;
    email: string;
    name: string;
    companyName?: string | null;
    companyLogoUrl?: string | null;
    brandColor?: string | null;
    phoneNumber?: string | null;
    tinNumber?: string | null;
    customerType?: NfcCardTier;
  };
  portfolio: {
    id: string;
    subdomain: string;
    status: string;
  };
  paymentVerificationData?: Record<string, any> | null;
  tapsCount?: number;
}

export interface AdminQueueStats {
  totalOrders: number;
  printingCount: number;
  pendingCount: number;
  shippedCount: number;
  deliveredCount: number;
  totalRevenueETB: number;
  totalCards: number;
  unpaidCount: number;
}

export interface UpdateOrderStatusInput {
  status?: 'pending' | 'printing' | 'shipped' | 'delivered';
  paymentStatus?: PaymentStatus;
  adminNote?: string;
}

export interface NfcTierMetadata {
  id: NfcCardTier;
  name: string;
  label: string;
  min: number;
  max: number | null;
  profileLimit: number | null;
  priceETB: number;
  rangeLabel: string;
  description: string;
  paymentPreference: 'telebirr_instant' | 'cbe_corporate';
}

export const TIER_PROFILE_LIMITS: Record<NfcCardTier, number | null> = {
  individual: 1,
  business: 19,
  enterprise: 49,
  corporate: null,
};

export const NFC_CARD_TIER_META: Record<NfcCardTier, NfcTierMetadata> = {
  individual: {
    id: 'individual',
    name: 'Individual',
    label: 'Individual (1–4 cards)',
    min: 1,
    max: 4,
    profileLimit: 1,
    priceETB: 2999,
    rangeLabel: '1–4 cards',
    description: 'Minimum 1, maximum 4 cards.',
    paymentPreference: 'telebirr_instant',
  },
  business: {
    id: 'business',
    name: 'S&M Business',
    label: 'S&M Business (5–19 cards)',
    min: 5,
    max: 19,
    profileLimit: 19,
    priceETB: 2799,
    rangeLabel: '5–19 cards',
    description: 'Minimum 5, maximum 19 cards.',
    paymentPreference: 'telebirr_instant',
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    label: 'Enterprise (20–49 cards)',
    min: 20,
    max: 49,
    profileLimit: 49,
    priceETB: 2499,
    rangeLabel: '20–49 cards',
    description: 'Minimum 20, maximum 49 cards.',
    paymentPreference: 'cbe_corporate',
  },
  corporate: {
    id: 'corporate',
    name: 'Corporate',
    label: 'Corporate (50+ cards)',
    min: 50,
    max: null,
    profileLimit: null,
    priceETB: 1999,
    rangeLabel: '50+ cards',
    description: 'Minimum 50 cards, with no maximum.',
    paymentPreference: 'cbe_corporate',
  },
};

export function getTierFromQuantity(quantity: number): NfcCardTier {
  const q = Math.max(1, Math.floor(quantity || 1));
  if (q >= 50) return 'corporate';
  if (q >= 20) return 'enterprise';
  if (q >= 5) return 'business';
  return 'individual';
}

export function calculateTierPrice(quantity: number): {
  tier: NfcCardTier;
  unitPrice: number;
  quantity: number;
  totalAmount: number;
  meta: NfcTierMetadata;
} {
  const q = Math.max(1, Math.floor(quantity || 1));
  const tier = getTierFromQuantity(q);
  const meta = NFC_CARD_TIER_META[tier];
  const unitPrice = meta.priceETB;
  return {
    tier,
    unitPrice,
    quantity: q,
    totalAmount: unitPrice * q,
    meta,
  };
}

export interface PortfolioTheme {
  id: string;
  accentColor: `#${string}`;
  backgroundColor?: `#${string}`;
  textColor?: `#${string}`;
  fontFamily?: string;
}

export interface HeroBlock {
  type: 'hero';
  data: {
    name: string;
    tagline: string;
    avatarUrl?: string;
    headerImageUrl?: string;
    company?: string;
    companyLogoUrl?: string;
    location?: string;
    phone?: string;
    email?: string;
    badge?: string;
  };
}

export interface AboutBlock {
  type: 'about';
  data: {
    body: string;
    title?: string;
  };
}

export interface ProjectBlock {
  type: 'projects';
  data: {
    items: Array<{
      title: string;
      description?: string;
      imageUrl?: string;
      link?: string;
    }>;
  };
}

export type SocialPlatform =
  | 'instagram'
  | 'linkedin'
  | 'telegram'
  | 'whatsapp'
  | 'twitter'
  | 'x'
  | 'tiktok'
  | 'youtube'
  | 'github'
  | 'website'
  | 'phone'
  | 'email'
  | 'other';

export interface SocialLink {
  platform: SocialPlatform | string;
  url: string;
  label?: string;
  handle?: string;
}

export interface ContactBlock {
  type: 'contact';
  data: {
    email?: string;
    phone?: string;
    whatsapp?: string;
    telegram?: string;
    location?: string;
    website?: string;
    socials?: SocialLink[];
  };
}

export interface LinksBlock {
  type: 'links';
  data: {
    title?: string;
    items: Array<{
      title: string;
      url: string;
      platform?: SocialPlatform | string;
      subtitle?: string;
    }>;
  };
}

export type PortfolioBlock =
  | HeroBlock
  | AboutBlock
  | ProjectBlock
  | ContactBlock
  | LinksBlock;

export interface PortfolioDocument {
  portfolioId: string;
  theme: PortfolioTheme;
  blocks: PortfolioBlock[];
}

export interface PortfolioSummary {
  id: string;
  subdomain: string;
  status: PortfolioStatus;
  isCompanyMaster?: boolean;
  updatedAt: string;
}

export interface PortfolioModel {
  id: string;
  subdomain: string;
  status: PortfolioStatus;
  isCompanyMaster?: boolean;
  customDomain?: string | null;
  theme: PortfolioTheme;
  createdAt: string;
  updatedAt: string;
  content: { version: number; blocks: PortfolioBlock[] } | null;
}
