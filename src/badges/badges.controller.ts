import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Request,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { Repository } from 'typeorm';
import { Roles } from '../common/decorators/roles.decorator';
import { Provider } from '../entities';
import { CURATED_BADGE_KEYS } from './badge-catalog';
import { BadgesService } from './badges.service';

class AwardBadgeDto {
  @IsUUID()
  providerId: string;

  @IsIn(CURATED_BADGE_KEYS)
  type: string;

  @IsString()
  @MaxLength(300)
  reason: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string | null;
}

type AuthedRequest = { user: { id: string } };

/** A business owner's own badges, and what's left to earn the others. */
@ApiTags('Badges')
@ApiBearerAuth()
@Controller('badges')
export class BadgesController {
  constructor(
    private readonly badges: BadgesService,
    @InjectRepository(Provider)
    private readonly providers: Repository<Provider>,
  ) {}

  @Get('mine')
  @ApiOperation({
    summary: "The signed-in owner's badges, with progress towards the rest",
  })
  async mine(@Request() req: AuthedRequest) {
    const provider = await this.providers.findOne({
      where: { userId: req.user.id },
      select: { id: true },
    });
    if (!provider) throw new NotFoundException('You have no business listing');
    return this.badges.progressFor(provider.id);
  }
}

@ApiTags('Admin - Badges')
@ApiBearerAuth()
@Roles('admin')
@Controller('admin/badges')
export class BadgesAdminController {
  constructor(private readonly badges: BadgesService) {}

  @Roles('associate')
  @Get('overview')
  @ApiOperation({
    summary: 'Every badge with its rule, holders, and the last recalculation',
  })
  overview() {
    return this.badges.overview();
  }

  @Roles('associate')
  @Get()
  @ApiOperation({ summary: 'Who holds badges (or held them: status=removed)' })
  list(
    @Query('type') type?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.badges.list({
      type,
      search,
      status,
      page: Number(page),
      limit: Number(limit),
    });
  }

  @Roles('associate')
  @Get('business/:providerId')
  @ApiOperation({ summary: "One business's badges, progress and history" })
  forBusiness(@Param('providerId', ParseUUIDPipe) providerId: string) {
    return this.badges.forBusiness(providerId);
  }

  @Post()
  @ApiOperation({
    summary: 'Give a curated badge (Tijarah Pick) to a business, with a reason',
  })
  award(@Request() req: AuthedRequest, @Body() body: AwardBadgeDto) {
    return this.badges.award(req.user.id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Take back a curated badge' })
  revoke(
    @Request() req: AuthedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.badges.revoke(req.user.id, id);
  }

  @Post('recalculate')
  @ApiOperation({
    summary: 'Recalculate the automatic badges now (also runs nightly)',
  })
  recalculate() {
    return this.badges.recalculate();
  }
}
