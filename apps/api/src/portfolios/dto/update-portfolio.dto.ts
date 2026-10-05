import { IsArray, IsObject, IsOptional } from 'class-validator';
import { PortfolioBlock, PortfolioTheme } from '@amalink/types';

export class UpdatePortfolioDto {
  @IsOptional()
  @IsObject()
  theme?: PortfolioTheme;

  @IsOptional()
  @IsArray()
  blocks?: PortfolioBlock[];
}
