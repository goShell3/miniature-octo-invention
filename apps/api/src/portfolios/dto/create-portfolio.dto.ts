import {
  IsArray,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { PortfolioBlock, PortfolioTheme } from '@amalink/types';

export class CreatePortfolioDto {
  @IsString()
  @MaxLength(30)
  @Matches(/^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])?$/)
  subdomain!: string;

  @IsOptional()
  @IsObject()
  theme?: PortfolioTheme;

  @IsOptional()
  @IsArray()
  blocks?: PortfolioBlock[];
}
