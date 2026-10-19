import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateUploadUrlDto {
  @IsUUID()
  portfolioId!: string;

  @IsString()
  @IsIn([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/avif',
    'application/pdf',
  ])
  contentType!: string;

  @IsOptional()
  @IsString()
  @IsIn(['portfolio', 'header'])
  imageType?: 'portfolio' | 'header';
}
