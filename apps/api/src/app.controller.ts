import { Controller, Get, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHealth(@Query() query: Record<string, string>, @Res() res: Response) {
    if (query && (query.error || query.code || query.state)) {
      const frontendUrl = (process.env.FRONTEND_URL ?? 'https://www.koo-link.com').replace(/\/+$/, '');
      const redirectUrl = new URL(frontendUrl);
      for (const [key, val] of Object.entries(query)) {
        if (val) redirectUrl.searchParams.set(key, val);
      }
      return res.redirect(redirectUrl.toString());
    }
    return res.json(this.appService.getHealth());
  }

  @Get('health')
  health() {
    return this.appService.getHealth();
  }

  @Get('favicon.ico')
  favicon(@Res() res: Response) {
    return res.status(204).end();
  }
}
