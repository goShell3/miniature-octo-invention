import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateBrandKitDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  companyName?: string;

  @IsOptional()
  @IsString()
  companyLogoUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  brandColor?: string;

  @IsOptional()
  @IsString()
  @IsIn(['individual', 'business', 'enterprise', 'corporate'])
  customerType?: 'individual' | 'business' | 'enterprise' | 'corporate';
}
