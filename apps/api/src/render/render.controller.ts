import { Controller, Get, Header, Param } from '@nestjs/common';
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
    "default-src 'none'; img-src https:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  )
  render(@Param('subdomain') subdomain: string): Promise<string> {
    return this.renderService.renderPublishedPortfolio(subdomain);
  }
}
