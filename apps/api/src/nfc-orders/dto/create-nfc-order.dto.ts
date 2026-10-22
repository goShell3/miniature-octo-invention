import {
  IsISO31661Alpha2,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { NfcCardTier } from '@amalink/types';

export class CreateNfcOrderDto {
  @IsUUID()
  portfolioId!: string;

  @IsIn(['individual', 'business', 'enterprise', 'corporate'])
  tier!: NfcCardTier;

  @IsInt()
  @Min(1)
  @Max(10000)
  quantity!: number;

  @IsString()
  @MaxLength(100)
  name!: string;

  @IsString()
  @MaxLength(32)
  phone!: string;

  @IsString()
  @MaxLength(150)
  addressLine1!: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  addressLine2?: string;

  @IsString()
  @MaxLength(100)
  city!: string;

  @IsString()
  @MaxLength(100)
  region!: string;

  @IsOptional()
  @IsString()
  @MaxLength(24)
  postalCode?: string;

  @IsISO31661Alpha2()
  countryCode!: string;
}
