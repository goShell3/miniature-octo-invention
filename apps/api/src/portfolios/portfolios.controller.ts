import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthenticatedRequest, BetterAuthGuard } from '../auth/better-auth.guard';
import { CreatePortfolioDto } from './dto/create-portfolio.dto';
import { UpdatePortfolioDto } from './dto/update-portfolio.dto';
import { PortfoliosService } from './portfolios.service';

@Controller('portfolios')
@UseGuards(BetterAuthGuard)
export class PortfoliosController {
  constructor(private readonly portfoliosService: PortfoliosService) {}

  @Get('subdomain-availability')
  checkSubdomain(@Query('name') name = '') {
    return this.portfoliosService
      .isSubdomainAvailable(name)
      .then((available) => ({ available }));
  }

  @Get('me')
  findMine(@Req() request: AuthenticatedRequest) {
    return this.portfoliosService.findMine(request.user.userId);
  }

  @Post()
  create(
    @Req() request: AuthenticatedRequest,
    @Body() input: CreatePortfolioDto,
  ) {
    return this.portfoliosService.create(request.user.userId, input);
  }

  @Post(':id/publish')
  publish(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.portfoliosService.publish(request.user.userId, id);
  }

  @Post(':id/unpublish')
  unpublish(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.portfoliosService.unpublish(request.user.userId, id);
  }

  @Get(':id')
  findOne(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.portfoliosService.findOne(request.user.userId, id);
  }

  @Patch(':id')
  update(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() input: UpdatePortfolioDto,
  ) {
    return this.portfoliosService.update(request.user.userId, id, input);
  }

  @Delete(':id')
  remove(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.portfoliosService.remove(request.user.userId, id);
  }
}
