import { Controller, Get, Header, Param, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { RenderService } from './render.service';

@Controller('sites')
export class RenderController {
  constructor(private readonly renderService: RenderService) {}

  @Get(':subdomain')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @Header('X-Content-Type-Options', 'nosniff')
  @Header('Referrer-Policy', 'strict-origin-when-cross-origin')
  @Header(
    'Content-Security-Policy',
    "default-src 'none'; img-src https: http: data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  )
  render(
    @Param('subdomain') subdomain: string,
    @Query('preview') preview?: string,
  ): Promise<string> {
    const isPreview = preview === 'true' || preview === '1';
    return this.renderService.renderPublishedPortfolio(subdomain, isPreview);
  }

  @Get(':subdomain/data')
  getData(
    @Param('subdomain') subdomain: string,
    @Query('preview') preview?: string,
  ) {
    const isPreview = preview === 'true' || preview === '1';
    return this.renderService.getPortfolioData(subdomain, isPreview);
  }

  @Get(':subdomain/vcard')
  @Header('Content-Type', 'text/vcard; charset=utf-8')
  @Header('Cache-Control', 'no-cache, no-store')
  async vcard(
    @Param('subdomain') subdomain: string,
    @Query('preview') preview: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ): Promise<string> {
    const isPreview = preview === 'true' || preview === '1';
    const vcard = await this.renderService.generateVcard(subdomain, isPreview);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(subdomain)}-contact.vcf"`,
    );
    return vcard;
  }
}
