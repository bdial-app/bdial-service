import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  Request,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';
import { Repository } from 'typeorm';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Provider } from '../entities';
import { SlugsService } from './slugs.service';

class SetSlugDto {
  @IsString()
  @MaxLength(80)
  slug: string;
}

type AuthedRequest = { user: { id: string } };

/**
 * The website's readable addresses: /business/<slug> and
 * /business/<slug>/<product slug>. The website asks here which listing an
 * address means, then loads it by id as the app does.
 */
@ApiTags('Slugs')
@Controller('slugs')
export class SlugsController {
  constructor(
    private readonly slugs: SlugsService,
    @InjectRepository(Provider)
    private readonly providers: Repository<Provider>,
  ) {}

  @Public()
  @Get('business/:slug')
  @ApiOperation({
    summary:
      'The business at /business/<slug> (an id or an old slug also works)',
  })
  business(@Param('slug') slug: string) {
    return this.slugs.resolveBusiness(slug);
  }

  @Public()
  @Get('business/:slug/:productSlug')
  @ApiOperation({
    summary: 'The product or service at /business/<slug>/<product slug>',
  })
  product(
    @Param('slug') slug: string,
    @Param('productSlug') productSlug: string,
  ) {
    return this.slugs.resolveProduct(slug, productSlug);
  }

  @Public()
  @Get('sitemap')
  @ApiOperation({
    summary: 'Every public business and item address, for the sitemap',
  })
  sitemap() {
    return this.slugs.sitemap();
  }

  private async myProviderId(userId: string) {
    const provider = await this.providers.findOne({
      where: { userId },
      select: { id: true },
    });
    if (!provider) throw new NotFoundException('You have no business listing');
    return provider.id;
  }

  @ApiBearerAuth()
  @Get('mine/check')
  @ApiOperation({
    summary: "Whether the signed-in owner's business could use this link",
  })
  async checkMine(@Request() req: AuthedRequest, @Query('slug') slug: string) {
    return this.slugs.check(slug ?? '', await this.myProviderId(req.user.id));
  }

  @ApiBearerAuth()
  @Patch('mine')
  @ApiOperation({
    summary:
      "Change the signed-in owner's business link; the old link keeps working",
  })
  async setMine(@Request() req: AuthedRequest, @Body() body: SetSlugDto) {
    return this.slugs.setBusinessSlug(
      await this.myProviderId(req.user.id),
      body.slug,
    );
  }
}

@ApiTags('Admin - Slugs')
@ApiBearerAuth()
@Roles('admin')
@Controller('admin/slugs')
export class SlugsAdminController {
  constructor(private readonly slugs: SlugsService) {}

  /** Anyone in the admin app may see a business's link; changing it takes an admin. */
  @Roles('associate')
  @Get('business/:providerId')
  @ApiOperation({
    summary: "A business's link, whether it's public, and its previous links",
  })
  info(@Param('providerId', ParseUUIDPipe) providerId: string) {
    return this.slugs.linkInfo(providerId);
  }

  @Get('business/:providerId/check')
  @ApiOperation({ summary: 'Whether a business could use this link' })
  check(
    @Param('providerId', ParseUUIDPipe) providerId: string,
    @Query('slug') slug: string,
  ) {
    return this.slugs.check(slug ?? '', providerId);
  }

  @Patch('business/:providerId')
  @ApiOperation({
    summary: "Change a business's link; the old link keeps working",
  })
  set(
    @Param('providerId', ParseUUIDPipe) providerId: string,
    @Body() body: SetSlugDto,
    @Request() req: AuthedRequest,
  ) {
    return this.slugs.setBusinessSlug(providerId, body.slug, req.user.id);
  }
}
