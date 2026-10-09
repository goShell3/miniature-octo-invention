export type PortfolioStatus = 'draft' | 'published' | 'unpublished';

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
    company?: string;
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
  updatedAt: string;
}