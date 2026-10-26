import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaymentMethod } from '@amalink/types';

export class VerifyPaymentDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reference?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  chekiUrl?: string;

  @IsOptional()
  @IsIn(['telebirr', 'cbe'])
  method?: PaymentMethod;

  @IsOptional()
  @IsIn(['url', 'screenshot'])
  verificationType?: 'url' | 'screenshot';

  @IsOptional()
  @IsString()
  screenshotUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
