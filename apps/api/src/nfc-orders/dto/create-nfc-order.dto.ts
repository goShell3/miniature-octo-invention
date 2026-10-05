import {
  IsISO31661Alpha2,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateNfcOrderDto {
  @IsUUID()
  portfolioId!: string;

  @IsString()
  @MaxLength(100)
  name!: string;

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

  @IsString()
  @MaxLength(24)
  postalCode!: string;

  @IsISO31661Alpha2()
  countryCode!: string;
}
