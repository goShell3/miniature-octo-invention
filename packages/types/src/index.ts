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
  };
}

export interface AboutBlock {
  type: 'about';
  data: {
    body: string;
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

export interface ContactBlock {
  type: 'contact';
  data: {
    email?: string;
    socials?: Array<{
      platform: string;
      url: string;
    }>;
  };
}

export type PortfolioBlock = HeroBlock | AboutBlock | ProjectBlock | ContactBlock;

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