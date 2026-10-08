import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PortfolioBlock } from '@amalink/types';
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
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:'
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

@Injectable()
export class RenderService {
  constructor(
    @InjectRepository(PortfolioEntity)
    private readonly portfoliosRepository: Repository<PortfolioEntity>,
  ) {}

  async renderPublishedPortfolio(subdomain: string): Promise<string> {
    const portfolio = await this.portfoliosRepository
      .createQueryBuilder('portfolio')
      .leftJoinAndSelect(
        'portfolio.contentVersions',
        'content',
        'content.isPublished = :isPublished',
        { isPublished: true },
      )
      .where('portfolio.subdomain = :subdomain', {
        subdomain: subdomain.toLowerCase(),
      })
      .andWhere('portfolio.status = :status', { status: 'published' })
      .orderBy('content.version', 'DESC')
      .getOne();

    const content = portfolio?.contentVersions?.[0];
    if (!portfolio || !content)
      throw new NotFoundException('Portfolio not found');

    const blocks = content.blocks as PortfolioBlock[];
    const hero = blocks.find((block) => block.type === 'hero');
    const name = hero?.type === 'hero' ? hero.data.name : portfolio.subdomain;
    const tagline = hero?.type === 'hero' ? hero.data.tagline : '';
    const themeColor = /^#[0-9a-fA-F]{6}$/.test(
      portfolio.theme?.accentColor ?? '',
    )
      ? portfolio.theme!.accentColor
      : '#e06b24';
    const renderedBlocks = blocks
      .map((block) => this.renderBlock(block))
      .join('\n');
    const title = name.trim() || portfolio.subdomain;
    const description = tagline.trim() || `${title}'s portfolio`;

    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="${themeColor}">
  <meta name="description" content="${escapeHtml(description)}">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <title>${escapeHtml(title)} | Portfolio</title>
  <style>
    :root{font-family:Arial,sans-serif;color:#191513;background:#faf7f2;font-synthesis:none;text-rendering:optimizeLegibility}*{box-sizing:border-box}body{margin:0}.page{max-width:920px;margin:auto;padding:28px 6vw}.top,.bottom{display:flex;justify-content:space-between;gap:20px;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#7a7269}.content{padding:12vh 0 8vh}section{padding:32px 0;border-bottom:1px solid #e6e0d6}.hero h1{font:500 clamp(48px,9vw,104px)/.95 Georgia,serif;letter-spacing:0;margin:24px 0;color:#191513}.hero h1 span{color:${themeColor};font-style:italic}.hero img{display:block;max-width:min(100%,380px);max-height:420px;object-fit:cover;margin-top:32px}.kicker,.section-label{font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:${themeColor}}.about{display:grid;grid-template-columns:140px 1fr;gap:24px}.about p{font:22px/1.45 Georgia,serif;white-space:pre-wrap;margin:0}.project{display:grid;grid-template-columns:36px 1fr 28px;gap:12px;padding:22px 0;border-bottom:1px solid #e6e0d6}.project:last-child{border:0}.project-index{color:${themeColor};font:italic 14px Georgia,serif}.project h2{font:24px Georgia,serif;margin:0 0 8px}.project p{margin:0;color:#7a7269;line-height:1.6}.project a,.contact a{color:${themeColor};text-decoration:none}.contact{display:flex;align-items:center;justify-content:space-between;gap:20px}.contact a{font:italic 24px Georgia,serif}.bottom{border-top:1px solid #e6e0d6;padding-top:20px;font-size:9px}@media(max-width:600px){.about{grid-template-columns:1fr;gap:12px}.about p{font-size:19px}.contact{align-items:flex-start;flex-direction:column}.page{padding-inline:22px}}
  </style>
</head>
<body><main class="page"><header class="top"><span>${escapeHtml(title)}</span><span>Portfolio</span></header><div class="content">${renderedBlocks}</div><footer class="bottom"><span>© ${new Date().getFullYear()} ${escapeHtml(title)}</span><span>Made with Sewnet</span></footer></main></body>
</html>`;
  }

  private renderBlock(block: PortfolioBlock): string {
    if (!block || typeof block !== 'object' || !('type' in block)) return '';
    if (block.type === 'hero') {
      const imageUrl = safeWebUrl(block.data?.avatarUrl);
      const image = imageUrl
        ? `<img src="${escapeHtml(imageUrl)}" alt="Portrait of ${escapeHtml(block.data.name)}">`
        : '';
      return `<section class="hero"><p class="kicker">Portfolio</p><h1>${escapeHtml(block.data?.name)}<br><span>${escapeHtml(block.data?.tagline)}</span></h1>${image}</section>`;
    }
    if (block.type === 'about') {
      return `<section class="about"><span class="section-label">About</span><p>${escapeHtml(block.data?.body)}</p></section>`;
    }
    if (block.type === 'projects') {
      const items = Array.isArray(block.data?.items) ? block.data.items : [];
      return `<section class="projects"><p class="section-label">Selected work</p>${items
        .map((item, index) => {
          const url = safeWebUrl(item?.link);
          const title = escapeHtml(item?.title);
          const link = url
            ? `<a href="${escapeHtml(url)}" rel="noopener noreferrer" aria-label="Open ${title}">↗</a>`
            : '';
          return `<article class="project"><span class="project-index">${String(index + 1).padStart(2, '0')}</span><div><h2>${title}</h2><p>${escapeHtml(item?.description)}</p></div>${link}</article>`;
        })
        .join('')}</section>`;
    }
    if (block.type === 'contact') {
      const email =
        typeof block.data?.email === 'string' ? block.data.email : '';
      const link = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
        ? `<a href="mailto:${escapeHtml(email)}">${escapeHtml(email)} ↗</a>`
        : '<span>Get in touch</span>';
      return `<section class="contact"><span class="section-label">Contact</span>${link}</section>`;
    }
    return '';
  }
}
