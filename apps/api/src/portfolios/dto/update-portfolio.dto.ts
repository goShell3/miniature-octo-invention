import { IsArray, IsObject, IsOptional, IsString, Matches } from 'class-validator';
import { PortfolioBlock, PortfolioTheme } from '@amalink/types';

export class UpdatePortfolioDto {
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/, {
    message: 'Profile address must be 3-30 lowercase characters with hyphens allowed in the middle',
  })
  subdomain?: string;

  @IsOptional()
  @IsObject()
  theme?: PortfolioTheme;

  @IsOptional()
  @IsArray()
  blocks?: PortfolioBlock[];
}
