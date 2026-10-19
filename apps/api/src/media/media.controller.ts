import { Body, Controller, Get, Param, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { pipeline } from 'node:stream/promises';
import { AuthenticatedRequest, BetterAuthGuard } from '../auth/better-auth.guard';
import { CreateUploadUrlDto } from './dto/create-upload-url.dto';
import { MediaService } from './media.service';

@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload-url')
  @UseGuards(BetterAuthGuard)
  createUploadUrl(
    @Req() request: AuthenticatedRequest,
    @Body() input: CreateUploadUrlDto,
  ) {
    return this.mediaService.createUploadUrl(
      request.user.userId,
      input.portfolioId,
      input.contentType,
      input.imageType,
    );
  }

  @Get('assets/:assetId')
  async getImage(@Param('assetId') assetId: string, @Res() response: Response) {
    const image = await this.mediaService.getPublicImage(assetId);
    response.setHeader('Content-Type', image.contentType);
    response.setHeader('Content-Disposition', 'inline');
    response.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    await pipeline(image.body, response);
  }
}
