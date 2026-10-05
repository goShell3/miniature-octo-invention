import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuthenticatedRequest, BetterAuthGuard } from '../auth/better-auth.guard';
import { CreateUploadUrlDto } from './dto/create-upload-url.dto';
import { MediaService } from './media.service';

@Controller('media')
@UseGuards(BetterAuthGuard)
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload-url')
  createUploadUrl(
    @Req() request: AuthenticatedRequest,
    @Body() input: CreateUploadUrlDto,
  ) {
    return this.mediaService.createUploadUrl(
      request.user.userId,
      input.portfolioId,
      input.contentType,
    );
  }
}
