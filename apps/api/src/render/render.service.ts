import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PortfolioBlock, SocialLink } from '@amalink/types';
import { Repository } from 'typeorm';
import { PortfolioEntity } from '../database/entities/portfolio.entity';

function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return entities[character];
  });
}

function safeWebUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    return url.protocol === 'https:' || url.protocol === 'http:'
      ? url.toString()
      : null;
  } catch {
    if (/^[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/.test(trimmed)) {
      return `https://${trimmed}`;
    }
    return null;
  }
}

function safeMediaUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  return /^\/media\/assets\/[0-9a-f-]{36}$/i.test(value) ? value : null;
}

function normalizeSocialUrl(platform: string, rawInput: string): string {
  const trimmed = rawInput.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  const handle = trimmed.replace(/^@/, '');
  switch (platform.toLowerCase()) {
    case 'instagram':
      return `https://instagram.com/${handle}`;
    case 'linkedin':
      return handle.startsWith('in/')
        ? `https://linkedin.com/${handle}`
        : `https://linkedin.com/in/${handle}`;
    case 'telegram':
      return `https://t.me/${handle}`;
    case 'whatsapp': {
      const cleanNum = trimmed.replace(/[^0-9]/g, '');
      return `https://wa.me/${cleanNum}`;
    }
    case 'twitter':
    case 'x':
      return `https://x.com/${handle}`;
    case 'tiktok':
      return `https://tiktok.com/@${handle}`;
    case 'youtube':
      return handle.startsWith('@')
        ? `https://youtube.com/${handle}`
        : `https://youtube.com/@${handle}`;
    case 'github':
      return `https://github.com/${handle}`;
    default:
      return `https://${trimmed}`;
  }
}

function getPlatformDisplayName(platform: string): string {
  switch (platform.toLowerCase()) {
    case 'instagram':
      return 'Instagram';
    case 'linkedin':
      return 'LinkedIn';
    case 'telegram':
      return 'Telegram';
    case 'whatsapp':
      return 'WhatsApp';
    case 'twitter':
    case 'x':
      return 'X (Twitter)';
    case 'tiktok':
      return 'TikTok';
    case 'youtube':
      return 'YouTube';
    case 'github':
      return 'GitHub';
    case 'website':
      return 'Website';
    case 'phone':
      return 'Phone';
    case 'email':
      return 'Email';
    default:
      return platform.charAt(0).toUpperCase() + platform.slice(1);
  }
}

function getSocialIconSvg(platform: string): string {
  switch (platform.toLowerCase()) {
    case 'instagram':
      return `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>`;
    case 'linkedin':
      return `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>`;
    case 'telegram':
      return `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.828.942z"/></svg>`;
    case 'whatsapp':
      return `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>`;
    case 'twitter':
    case 'x':
      return `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`;
    case 'tiktok':
      return `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>`;
    case 'youtube':
      return `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>`;
    case 'github':
      return `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>`;
    case 'website':
    default:
      return `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`;
  }
}

function escapeVcard(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '');
}

@Injectable()
export class RenderService {
  constructor(
    @InjectRepository(PortfolioEntity)
    private readonly portfoliosRepository: Repository<PortfolioEntity>,
  ) {}

  private async getPortfolio(subdomain: string, allowDraft = false) {
    const query = this.portfoliosRepository
      .createQueryBuilder('portfolio')
      .leftJoinAndSelect('portfolio.contentVersions', 'content')
      .where('portfolio.subdomain = :subdomain', {
        subdomain: subdomain.toLowerCase(),
      });

    const portfolio = await query.getOne();
    if (!portfolio) {
      throw new NotFoundException('Portfolio not found');
    }

    if (!allowDraft && portfolio.status === 'unpublished') {
      throw new NotFoundException('Portfolio is currently unpublished');
    }

    const versions = [...(portfolio.contentVersions ?? [])].sort(
      (a, b) => b.version - a.version,
    );

    const content = allowDraft
      ? versions[0]
      : versions.find((v) => v.isPublished) ?? versions[0];

    if (!content) {
      throw new NotFoundException('Portfolio content not found');
    }
    return { portfolio, content };
  }

  async getPortfolioData(subdomain: string, allowDraft = false) {
    const { portfolio, content } = await this.getPortfolio(subdomain, allowDraft);
    return {
      id: portfolio.id,
      subdomain: portfolio.subdomain,
      status: portfolio.status,
      theme: portfolio.theme,
      blocks: content.blocks as PortfolioBlock[],
      updatedAt: portfolio.updatedAt,
    };
  }

  async generateVcard(subdomain: string, allowDraft = false): Promise<string> {
    const { portfolio, content } = await this.getPortfolio(subdomain, allowDraft);
    const blocks = (content.blocks ?? []) as PortfolioBlock[];

    const hero = blocks.find((b) => b.type === 'hero');
    const about = blocks.find((b) => b.type === 'about');
    const contact = blocks.find((b) => b.type === 'contact');

    const heroData = (hero?.type === 'hero' ? hero.data : {}) as Record<string, string>;
    const aboutData = (about?.type === 'about' ? about.data : {}) as { body?: string };
    const contactData = (contact?.type === 'contact' ? contact.data : {}) as {
      email?: string;
      phone?: string;
      whatsapp?: string;
      telegram?: string;
      website?: string;
      socials?: SocialLink[];
    };

    const fullName = heroData.name?.trim() || portfolio.subdomain;
    const parts = fullName.split(' ');
    const firstName = parts[0] || '';
    const lastName = parts.slice(1).join(' ') || '';

    const tagline = heroData.tagline?.trim() || '';
    const company = heroData.company?.trim() || '';
    const phone = (contactData.phone || heroData.phone || '').trim();
    const email = (contactData.email || heroData.email || '').trim();
    const website = (contactData.website || '').trim();

    const rootDomain = process.env.VITE_ROOT_DOMAIN || 'sewnet.et';
    const profileUrl = website || `https://${subdomain}.${rootDomain}`;

    const lines: string[] = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `N:${escapeVcard(lastName)};${escapeVcard(firstName)};;;`,
      `FN:${escapeVcard(fullName)}`,
    ];

    if (company) lines.push(`ORG:${escapeVcard(company)}`);
    if (tagline) lines.push(`TITLE:${escapeVcard(tagline)}`);
    if (phone) lines.push(`TEL;TYPE=CELL,VOICE,PREF:${escapeVcard(phone)}`);
    if (email) lines.push(`EMAIL;TYPE=INTERNET,PREF:${escapeVcard(email)}`);
    if (profileUrl) lines.push(`URL:${escapeVcard(profileUrl)}`);

    if (aboutData?.body?.trim()) {
      lines.push(`NOTE:${escapeVcard(aboutData.body.trim())}`);
    } else {
      lines.push(`NOTE:Connected via Koolink NFC Smart Card (${subdomain}.${rootDomain})`);
    }

    if (Array.isArray(contactData.socials)) {
      for (const soc of contactData.socials) {
        if (soc.url) {
          lines.push(`X-SOCIALPROFILE;type=${escapeVcard(soc.platform)}:${escapeVcard(soc.url)}`);
        }
      }
    }

    lines.push('END:VCARD');

    return lines.join('\r\n');
  }

  async renderPublishedPortfolio(subdomain: string, isPreview = false): Promise<string> {
    const { portfolio, content } = await this.getPortfolio(subdomain, isPreview);
    const blocks = (content.blocks ?? []) as PortfolioBlock[];

    const hero = blocks.find((b) => b.type === 'hero');
    const about = blocks.find((b) => b.type === 'about');
    const projects = blocks.find((b) => b.type === 'projects');
    const contact = blocks.find((b) => b.type === 'contact');
    const linksBlock = blocks.find((b) => b.type === 'links');

    const heroData = (hero?.type === 'hero' ? hero.data : {}) as {
      name?: string;
      tagline?: string;
      avatarUrl?: string;
      headerImageUrl?: string;
      company?: string;
      location?: string;
      phone?: string;
      email?: string;
      badge?: string;
    };

    const contactData = (contact?.type === 'contact' ? contact.data : {}) as {
      email?: string;
      phone?: string;
      whatsapp?: string;
      telegram?: string;
      website?: string;
      socials?: SocialLink[];
    };

    const name = heroData.name?.trim() || portfolio.subdomain;
    const tagline = heroData.tagline?.trim() || '';
    const company = heroData.company?.trim() || '';
    const location = heroData.location?.trim() || '';
    const avatarUrl = safeMediaUrl(heroData.avatarUrl) ?? safeWebUrl(heroData.avatarUrl);
    const headerImageUrl = safeMediaUrl(heroData.headerImageUrl) ?? safeWebUrl(heroData.headerImageUrl);
    const headerImageStyle = headerImageUrl
      ? ` style="background-image: linear-gradient(rgba(255,255,255,.78), rgba(250,248,245,.9)), url('${escapeHtml(headerImageUrl)}'); background-position: center; background-size: cover;"`
      : '';

    const phone = (contactData.phone || heroData.phone || '').trim();
    const email = (contactData.email || heroData.email || '').trim();
    const whatsapp = (contactData.whatsapp || (phone ? phone.replace(/[^0-9]/g, '') : '')).trim();
    const telegram = (contactData.telegram || '').trim().replace(/^@/, '');

    const themeColor = /^#[0-9a-fA-F]{6}$/.test(portfolio.theme?.accentColor ?? '')
      ? portfolio.theme!.accentColor
      : '#ff3535';

    const title = name || portfolio.subdomain;
    const description = tagline || `${title}'s Digital Identity Card`;

    // Gather all socials
    const allSocials: Array<{ platform: string; url: string; label: string; handle: string }> = [];

    if (Array.isArray(contactData.socials)) {
      for (const soc of contactData.socials) {
        if (soc.url || soc.handle) {
          const targetUrl = normalizeSocialUrl(soc.platform, soc.url || soc.handle || '');
          if (targetUrl) {
            allSocials.push({
              platform: soc.platform,
              url: targetUrl,
              label: soc.label || getPlatformDisplayName(soc.platform),
              handle: soc.handle || soc.url || '',
            });
          }
        }
      }
    }

    // Include custom links if present
    if (linksBlock?.type === 'links' && Array.isArray(linksBlock.data?.items)) {
      for (const item of linksBlock.data.items) {
        if (item.url) {
          allSocials.push({
            platform: item.platform || 'website',
            url: safeWebUrl(item.url) || item.url,
            label: item.title,
            handle: item.subtitle || item.url,
          });
        }
      }
    }

    // Avatar HTML: use image or monogram
    const initials = name
      .split(' ')
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'S';

    const avatarHtml = avatarUrl
      ? `<img class="profile-avatar" src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(name)}" />`
      : `<div class="profile-monogram">${escapeHtml(initials)}</div>`;

    // Quick Action circle buttons
    const quickActions: string[] = [];
    if (phone) {
      quickActions.push(`
        <a href="tel:${escapeHtml(phone)}" class="quick-btn" title="Call">
          <span class="quick-btn-icon">${getSocialIconSvg('phone')}</span>
          <span class="quick-btn-label">Call</span>
        </a>
      `);
    }
    if (email) {
      quickActions.push(`
        <a href="mailto:${escapeHtml(email)}" class="quick-btn" title="Email">
          <span class="quick-btn-icon">${getSocialIconSvg('email')}</span>
          <span class="quick-btn-label">Email</span>
        </a>
      `);
    }
    if (whatsapp) {
      const waUrl = whatsapp.startsWith('http') ? whatsapp : `https://wa.me/${whatsapp.replace(/[^0-9]/g, '')}`;
      quickActions.push(`
        <a href="${escapeHtml(waUrl)}" target="_blank" rel="noopener noreferrer" class="quick-btn" title="WhatsApp">
          <span class="quick-btn-icon">${getSocialIconSvg('whatsapp')}</span>
          <span class="quick-btn-label">WhatsApp</span>
        </a>
      `);
    }
    if (telegram) {
      const tgUrl = telegram.startsWith('http') ? telegram : `https://t.me/${telegram}`;
      quickActions.push(`
        <a href="${escapeHtml(tgUrl)}" target="_blank" rel="noopener noreferrer" class="quick-btn" title="Telegram">
          <span class="quick-btn-icon">${getSocialIconSvg('telegram')}</span>
          <span class="quick-btn-label">Telegram</span>
        </a>
      `);
    }

    // Social Links Cards
    const socialCardsHtml = allSocials.length > 0
      ? `
      <section class="section-container">
        <h2 class="section-heading">Connect &amp; Socials</h2>
        <div class="social-links-grid">
          ${allSocials.map((soc) => `
            <a href="${escapeHtml(soc.url)}" target="_blank" rel="noopener noreferrer" class="social-card" data-platform="${escapeHtml(soc.platform.toLowerCase())}">
              <div class="social-card-left">
                <span class="social-icon-box">${getSocialIconSvg(soc.platform)}</span>
                <div class="social-text-wrap">
                  <strong class="social-title">${escapeHtml(soc.label)}</strong>
                  <span class="social-handle">${escapeHtml(soc.handle)}</span>
                </div>
              </div>
              <span class="social-arrow" aria-hidden="true">↗</span>
            </a>
          `).join('')}
        </div>
      </section>
      `
      : '';

    // About Section
    const aboutHtml = about?.type === 'about' && about.data?.body
      ? `
      <section class="section-container">
        <h2 class="section-heading">${escapeHtml(about.data.title || 'About')}</h2>
        <div class="content-card">
          <p class="about-body">${escapeHtml(about.data.body)}</p>
        </div>
      </section>
      `
      : '';

    // Projects Section
    const projectsData = projects?.type === 'projects' && Array.isArray(projects.data?.items)
      ? projects.data.items.filter((p) => p && (p.title || p.description))
      : [];

    const projectsHtml = projectsData.length > 0
      ? `
      <section class="section-container">
        <h2 class="section-heading">Featured Work</h2>
        <div class="projects-stack">
          ${projectsData.map((p, idx) => {
            const pLink = safeWebUrl(p.link);
            const linkTag = pLink
              ? `<a href="${escapeHtml(pLink)}" target="_blank" rel="noopener noreferrer" class="project-card-link">View Project ↗</a>`
              : '';
            const pImg = safeMediaUrl(p.imageUrl) ?? safeWebUrl(p.imageUrl);
            const imgTag = pImg
              ? `<div class="project-card-img-wrap"><img src="${escapeHtml(pImg)}" alt="${escapeHtml(p.title)}" class="project-card-img" /></div>`
              : '';
            return `
              <div class="project-card">
                ${imgTag}
                <div class="project-card-content">
                  <span class="project-num">${String(idx + 1).padStart(2, '0')}</span>
                  <div class="project-info">
                    <h3 class="project-title">${escapeHtml(p.title)}</h3>
                    ${p.description ? `<p class="project-desc">${escapeHtml(p.description)}</p>` : ''}
                    ${linkTag}
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </section>
      `
      : '';

    // Direct Exchange Contact Card
    const connectCard = (phone || email)
      ? `
      <section class="section-container">
        <div class="exchange-card">
          <div class="exchange-text">
            <h3>Stay in touch</h3>
            <p>Tap below to exchange your contact information or schedule a follow-up.</p>
          </div>
          <div class="exchange-actions">
            ${email ? `<a href="mailto:${escapeHtml(email)}?subject=Connecting%20via%20Koolink%20Card" class="btn-exchange">Send Email</a>` : ''}
            ${phone ? `<a href="tel:${escapeHtml(phone)}" class="btn-exchange secondary">Call Directly</a>` : ''}
          </div>
        </div>
      </section>
      `
      : '';

    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="theme-color" content="${themeColor}">
  <meta name="description" content="${escapeHtml(description)}">
  <meta property="og:type" content="profile">
  <meta property="og:title" content="${escapeHtml(name)} | Koolink Digital Identity">
  <meta property="og:description" content="${escapeHtml(description)}">
  ${avatarUrl ? `<meta property="og:image" content="${escapeHtml(avatarUrl)}">` : ''}
  <title>${escapeHtml(title)} | Koolink Digital Identity</title>
  <style>
    :root {
      --theme-color: ${themeColor};
      --theme-hover: #e52e2e;
      --theme-subtle: #fff0f0;
      --bg: #faf7f2;
      --surface: #ffffff;
      --ink: #191513;
      --muted: #7a7269;
      --line: #e6e0d6;
      --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      --font-serif: Georgia, "Times New Roman", serif;
    }

    * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
    body {
      margin: 0;
      padding: 0;
      background: var(--bg);
      color: var(--ink);
      font-family: var(--font-sans);
      line-height: 1.5;
      display: flex;
      justify-content: center;
      min-height: 100vh;
    }

    .nfc-page-shell {
      width: 100%;
      max-width: 480px;
      min-height: 100vh;
      background: var(--surface);
      display: flex;
      flex-direction: column;
      box-shadow: 0 10px 40px rgba(25, 21, 19, 0.08);
      position: relative;
    }

    /* Top NFC Badge */
    .nfc-banner {
      background: linear-gradient(135deg, #191513 0%, #2a2420 100%);
      color: #fff;
      padding: 14px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 2px solid var(--theme-color);
    }

    .nfc-status-pill {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 1.4px;
      color: var(--theme-color);
      text-transform: uppercase;
    }

    .nfc-pulse-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--theme-color);
      box-shadow: 0 0 0 0 rgba(255, 53, 53, 0.7);
      animation: pulse 1.8s infinite;
    }

    @keyframes pulse {
      0% { box-shadow: 0 0 0 0 rgba(255, 53, 53, 0.7); }
      70% { box-shadow: 0 0 0 8px rgba(255, 53, 53, 0); }
      100% { box-shadow: 0 0 0 0 rgba(255, 53, 53, 0); }
    }

    .nfc-koolink-tag {
      font-size: 11px;
      font-weight: 700;
      color: rgba(255, 255, 255, 0.8);
      display: flex;
      align-items: center;
      gap: 5px;
    }

    .nfc-koolink-badge {
      background: var(--theme-color);
      color: #fff;
      width: 18px;
      height: 18px;
      border-radius: 4px;
      display: grid;
      place-items: center;
      font-size: 11px;
      font-weight: 800;
    }

    /* Hero Profile Section */
    .profile-hero {
      padding: 36px 24px 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      background: linear-gradient(180deg, #fff 0%, #faf8f5 100%);
      border-bottom: 1px solid var(--line);
    }

    .avatar-wrapper {
      position: relative;
      margin-bottom: 16px;
    }

    .profile-avatar {
      width: 104px;
      height: 104px;
      border-radius: 50%;
      object-fit: cover;
      display: block;
      border: 3.5px solid var(--theme-color);
      box-shadow: 0 8px 24px rgba(224, 107, 36, 0.25);
    }

    .profile-monogram {
      width: 104px;
      height: 104px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--theme-color) 0%, #c45412 100%);
      color: #ffffff;
      display: grid;
      place-items: center;
      font-size: 38px;
      font-weight: 800;
      box-shadow: 0 8px 24px rgba(224, 107, 36, 0.25);
      border: 3.5px solid #ffffff;
    }

    .verified-badge {
      position: absolute;
      bottom: 2px;
      right: 2px;
      width: 26px;
      height: 26px;
      border-radius: 50%;
      background: var(--theme-color);
      color: #ffffff;
      display: grid;
      place-items: center;
      font-size: 13px;
      font-weight: 900;
      border: 2px solid #ffffff;
      box-shadow: 0 2px 6px rgba(0,0,0,0.15);
    }

    .profile-name {
      font-size: 26px;
      font-weight: 800;
      letter-spacing: -0.5px;
      margin: 0 0 6px;
      color: var(--ink);
    }

    .profile-tagline {
      font-size: 14px;
      font-weight: 500;
      color: var(--muted);
      margin: 0 0 12px;
      max-width: 380px;
      line-height: 1.4;
    }

    .profile-meta-tags {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin-bottom: 22px;
    }

    .meta-tag {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 12px;
      font-weight: 600;
      color: var(--ink);
      background: #f1ede6;
      padding: 4px 11px;
      border-radius: 20px;
    }

    /* Primary Action: Add to Contacts Button */
    .vcard-cta-wrap {
      width: 100%;
      margin-bottom: 20px;
    }

    .btn-save-contact {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      width: 100%;
      height: 52px;
      background: var(--theme-color);
      color: #ffffff;
      border-radius: 8px;
      font-size: 15px;
      font-weight: 800;
      letter-spacing: 0.3px;
      text-decoration: none;
      box-shadow: 0 6px 20px rgba(224, 107, 36, 0.35);
      transition: transform 0.15s, background 0.15s, box-shadow 0.15s;
    }

    .btn-save-contact:hover {
      background: var(--theme-hover);
      transform: translateY(-1px);
      box-shadow: 0 8px 25px rgba(224, 107, 36, 0.45);
    }

    .btn-save-contact svg {
      width: 20px;
      height: 20px;
    }

    /* Quick Actions Row */
    .quick-actions-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      width: 100%;
    }

    .quick-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      text-decoration: none;
      color: var(--ink);
      transition: transform 0.15s;
    }

    .quick-btn:hover {
      transform: translateY(-2px);
    }

    .quick-btn-icon {
      width: 46px;
      height: 46px;
      border-radius: 50%;
      background: #f2ece4;
      display: grid;
      place-items: center;
      color: var(--theme-color);
      transition: background 0.15s, color 0.15s;
    }

    .quick-btn:hover .quick-btn-icon {
      background: var(--theme-color);
      color: #ffffff;
    }

    .quick-btn-label {
      font-size: 11px;
      font-weight: 700;
      color: var(--muted);
    }

    /* Content Sections */
    .section-container {
      padding: 24px 20px;
      border-bottom: 1px solid var(--line);
    }

    .section-heading {
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 1.6px;
      text-transform: uppercase;
      color: var(--theme-color);
      margin: 0 0 16px;
    }

    /* Social Links Grid */
    .social-links-grid {
      display: flex;
      flex-direction: column;
      gap: 11px;
    }

    .social-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #faf8f5;
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 14px 16px;
      text-decoration: none;
      color: var(--ink);
      transition: background 0.15s, border-color 0.15s, transform 0.15s;
    }

    .social-card:hover {
      background: #ffffff;
      border-color: var(--theme-color);
      transform: translateY(-1px);
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.05);
    }

    .social-card-left {
      display: flex;
      align-items: center;
      gap: 14px;
      min-width: 0;
    }

    .social-icon-box {
      width: 38px;
      height: 38px;
      border-radius: 8px;
      background: #ffffff;
      border: 1px solid var(--line);
      display: grid;
      place-items: center;
      color: var(--ink);
      flex-shrink: 0;
      transition: background 0.15s, color 0.15s;
    }

    .social-card[data-platform="instagram"] .social-icon-box {
      color: #E1306C;
    }
    .social-card[data-platform="linkedin"] .social-icon-box {
      color: #0A66C2;
    }
    .social-card[data-platform="telegram"] .social-icon-box {
      color: #229ED9;
    }
    .social-card[data-platform="whatsapp"] .social-icon-box {
      color: #25D366;
    }
    .social-card[data-platform="youtube"] .social-icon-box {
      color: #FF0000;
    }

    .social-text-wrap {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .social-title {
      font-size: 14px;
      font-weight: 700;
      color: var(--ink);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .social-handle {
      font-size: 12px;
      color: var(--muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .social-arrow {
      font-size: 16px;
      font-weight: 700;
      color: var(--muted);
      transition: transform 0.15s, color 0.15s;
    }

    .social-card:hover .social-arrow {
      transform: translate(2px, -2px);
      color: var(--theme-color);
    }

    /* About Card */
    .content-card {
      background: #faf8f5;
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 18px 20px;
    }

    .about-body {
      font-size: 14px;
      line-height: 1.6;
      color: #362d27;
      margin: 0;
      white-space: pre-line;
    }

    /* Projects Stack */
    .projects-stack {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .project-card {
      display: flex;
      flex-direction: column;
      background: #faf8f5;
      border: 1px solid var(--line);
      border-radius: 12px;
      overflow: hidden;
    }

    .project-card-img-wrap {
      width: 100%;
      height: 160px;
      overflow: hidden;
      background: #ede8e3;
    }

    .project-card-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .project-card-content {
      display: flex;
      align-items: flex-start;
      gap: 14px;
      padding: 16px;
    }

    .project-num {
      font-size: 12px;
      font-weight: 800;
      color: var(--theme-color);
      padding-top: 2px;
    }

    .project-info {
      flex: 1;
      min-width: 0;
    }

    .project-title {
      font-size: 15px;
      font-weight: 700;
      margin: 0 0 6px;
      color: var(--ink);
    }

    .project-desc {
      font-size: 13px;
      color: var(--muted);
      line-height: 1.5;
      margin: 0 0 10px;
    }

    .project-card-link {
      display: inline-flex;
      font-size: 12px;
      font-weight: 700;
      color: var(--theme-color);
      text-decoration: none;
    }

    .project-card-link:hover {
      text-decoration: underline;
    }

    /* Exchange Card */
    .exchange-card {
      background: #f7f2ea;
      border: 1px dashed var(--theme-color);
      border-radius: 8px;
      padding: 20px;
      text-align: center;
    }

    .exchange-text h3 {
      font-size: 16px;
      font-weight: 800;
      margin: 0 0 6px;
      color: var(--ink);
    }

    .exchange-text p {
      font-size: 12px;
      color: var(--muted);
      margin: 0 0 16px;
    }

    .exchange-actions {
      display: flex;
      gap: 10px;
      justify-content: center;
    }

    .btn-exchange {
      padding: 10px 18px;
      border-radius: 6px;
      background: var(--theme-color);
      color: #fff;
      font-size: 12px;
      font-weight: 700;
      text-decoration: none;
    }

    .btn-exchange.secondary {
      background: #fff;
      color: var(--ink);
      border: 1px solid var(--line);
    }

    /* Footer */
    .nfc-footer {
      padding: 30px 20px 40px;
      text-align: center;
      background: #faf8f5;
      margin-top: auto;
    }

    .nfc-footer-brand {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      text-decoration: none;
      color: var(--ink);
      font-size: 13px;
      font-weight: 800;
      margin-bottom: 8px;
    }

    .footer-note {
      font-size: 11px;
      color: var(--muted);
      margin: 0 0 12px;
    }

    .btn-get-card {
      display: inline-flex;
      font-size: 11px;
      font-weight: 700;
      color: var(--theme-color);
      text-decoration: none;
    }

    .btn-get-card:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <main class="nfc-page-shell">
    <!-- Top NFC Status Banner -->
    <header class="nfc-banner"${portfolio.status !== 'published' ? ' style="background: linear-gradient(135deg, #2b1f13 0%, #191513 100%);"' : ''}>
      <div class="nfc-status-pill"${portfolio.status !== 'published' ? ' style="color: #f48935;"' : ''}>
        <span class="nfc-pulse-dot"${portfolio.status !== 'published' ? ' style="background: #f48935; box-shadow: none;"' : ''}></span>
        <span>${portfolio.status === 'published' ? `LIVE ON SUBDOMAIN · ${escapeHtml(subdomain)}.localhost:5173` : `DRAFT PREVIEW · ${escapeHtml(subdomain)}.localhost:5173`}</span>
      </div>
      <div class="nfc-koolink-tag">
        <span class="nfc-koolink-badge">K</span>
        <span>Koolink</span>
      </div>
    </header>

    <!-- Profile Hero -->
    <section class="profile-hero"${headerImageStyle}>
      <div class="avatar-wrapper">
        ${avatarHtml}
        <span class="verified-badge" title="Koolink Verified Identity">✓</span>
      </div>

      <h1 class="profile-name">${escapeHtml(name)}</h1>
      ${tagline ? `<p class="profile-tagline">${escapeHtml(tagline)}</p>` : ''}

      ${(company || location) ? `
        <div class="profile-meta-tags">
          ${company ? `<span class="meta-tag">🏢 ${escapeHtml(company)}</span>` : ''}
          ${location ? `<span class="meta-tag">📍 ${escapeHtml(location)}</span>` : ''}
        </div>
      ` : ''}

      <!-- Primary Action: Save to Contacts (.vcf) -->
      <div class="vcard-cta-wrap">
        <a href="/sites/${escapeHtml(subdomain)}/vcard" class="btn-save-contact" download="${escapeHtml(subdomain)}-contact.vcf">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="8.5" cy="7" r="4"/>
            <line x1="20" y1="8" x2="20" y2="14"/>
            <line x1="23" y1="11" x2="17" y2="11"/>
          </svg>
          <span>Save to Contacts (.vcf)</span>
        </a>
      </div>

      <!-- Quick Action Buttons -->
      ${quickActions.length > 0 ? `
        <div class="quick-actions-row">
          ${quickActions.join('')}
        </div>
      ` : ''}
    </section>

    <!-- Connect & Socials Section -->
    ${socialCardsHtml}

    <!-- About Section -->
    ${aboutHtml}

    <!-- Featured Projects Section -->
    ${projectsHtml}

    <!-- Exchange Contact -->
    ${connectCard}

    <!-- Footer -->
    <footer class="nfc-footer">
      <a href="/" class="nfc-footer-brand">
        <span class="nfc-koolink-badge">K</span>
        <span>Koolink</span>
      </a>
      <p class="footer-note">One identity. One tap. Every connection measured.</p>
      <a href="/" class="btn-get-card">Order your own NFC Smart Business Card →</a>
    </footer>
  </main>
</body>
</html>`;
  }
}
