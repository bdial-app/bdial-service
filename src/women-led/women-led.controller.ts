import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Request,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import {
  Equals,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import { Roles } from '../common/decorators/roles.decorator';
import { UPLOAD_LIMITS } from '../common/image-processor';
import type { WomenLedRole } from '../entities/women-led-request.entity';
import { WOMEN_LED_ROLES, WomenLedService } from './women-led.service';

type AuthedRequest = { user: { id: string; name?: string | null } };

export class RequestWomenLedDto {
  @ApiProperty({ example: 'Fatema Burhani' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  womanName: string;

  @ApiProperty({ enum: WOMEN_LED_ROLES })
  @IsIn(WOMEN_LED_ROLES)
  role: WomenLedRole;

  @ApiProperty({ description: 'The owner confirms the details are true' })
  @IsBoolean()
  @Equals(true)
  confirm: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @ApiPropertyOptional({ description: 'From POST /women-led/mine/proof' })
  @IsOptional()
  @IsString()
  @Matches(/^women-led\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.[a-z]{3,4}$/)
  evidenceKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(150)
  evidenceName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  evidenceType?: string;
}

export class TurnOffWomenLedDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class WomenLedListQueryDto {
  @ApiPropertyOptional({ enum: ['pending', 'approved', 'not_approved', 'all'] })
  @IsOptional()
  @IsIn(['pending', 'approved', 'not_approved', 'all'])
  tab?: 'pending' | 'approved' | 'not_approved' | 'all';

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}

export class WomenLedNoteDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class WomenLedReasonDto {
  @ApiProperty({ example: 'The name on the ID does not match.' })
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  reason: string;
}

export class GrantWomenLedDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  womanName?: string;

  @ApiPropertyOptional({ enum: WOMEN_LED_ROLES })
  @IsOptional()
  @IsIn(WOMEN_LED_ROLES)
  role?: WomenLedRole;

  @ApiPropertyOptional({ example: 'Met her at the shop on 24 Oct' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

/** The owner's Women-Led card in the business dashboard. */
@ApiTags('Women-Led')
@ApiBearerAuth()
@Controller('women-led')
export class WomenLedController {
  constructor(private readonly womenLed: WomenLedService) {}

  @Get('mine')
  @ApiOperation({ summary: "My business's Women-Led state and what it gives" })
  mine(@Request() req: AuthedRequest) {
    return this.womenLed.mine(req.user.id);
  }

  @Post('mine/proof')
  @ApiOperation({ summary: 'Optional proof (photo or PDF), stored privately' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: UPLOAD_LIMITS,
    }),
  )
  proof(
    @Request() req: AuthedRequest,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.womenLed.uploadEvidence(req.user.id, file);
  }

  @Post('mine/request')
  @ApiOperation({ summary: 'Ask for the Women-Led badge' })
  request(@Request() req: AuthedRequest, @Body() dto: RequestWomenLedDto) {
    return this.womenLed.request(req.user.id, dto);
  }

  @Post('mine/withdraw')
  @ApiOperation({ summary: 'Withdraw a request that is waiting' })
  withdraw(@Request() req: AuthedRequest) {
    return this.womenLed.withdraw(req.user.id);
  }

  @Post('mine/turn-off')
  @ApiOperation({ summary: 'Turn Women-Led off (asking again is reviewed)' })
  turnOff(@Request() req: AuthedRequest, @Body() dto: TurnOffWomenLedDto) {
    return this.womenLed.turnOff(req.user.id, dto.note);
  }
}

/** The team's review queue. Moderators review; admins revoke and grant. */
@ApiTags('Admin · Women-Led')
@ApiBearerAuth()
@Controller('admin/women-led')
export class AdminWomenLedController {
  constructor(private readonly womenLed: WomenLedService) {}

  @Get('requests')
  @Roles('moderator')
  @ApiOperation({ summary: 'Requests by tab, one row per business' })
  list(@Query() q: WomenLedListQueryDto) {
    return this.womenLed.list({ tab: q.tab ?? 'pending', ...q });
  }

  @Get('requests/:id')
  @Roles('moderator')
  detail(@Param('id', ParseUUIDPipe) id: string) {
    return this.womenLed.detail(id);
  }

  @Get('requests/:id/proof')
  @Roles('moderator')
  @ApiOperation({ summary: 'The proof file (private)' })
  async proof(@Param('id', ParseUUIDPipe) id: string, @Res() res: Response) {
    const f = await this.womenLed.evidence(id);
    res.setHeader('Content-Type', f.type);
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${f.name.replace(/[^\w.\- ]/g, '_')}"`,
    );
    res.send(f.data);
  }

  @Patch('requests/:id/approve')
  @Roles('moderator')
  approve(
    @Request() req: AuthedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: WomenLedNoteDto,
  ) {
    return this.womenLed.approve(req.user, id, dto.note);
  }

  @Patch('requests/:id/reject')
  @Roles('moderator')
  reject(
    @Request() req: AuthedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: WomenLedReasonDto,
  ) {
    return this.womenLed.reject(req.user, id, dto.reason);
  }

  @Get('business/:providerId')
  @Roles('associate')
  forProvider(@Param('providerId', ParseUUIDPipe) providerId: string) {
    return this.womenLed.forProvider(providerId);
  }

  @Post('business/:providerId/revoke')
  @Roles('admin')
  @ApiOperation({ summary: 'Remove an approved badge, with a reason' })
  revoke(
    @Request() req: AuthedRequest,
    @Param('providerId', ParseUUIDPipe) providerId: string,
    @Body() dto: WomenLedReasonDto,
  ) {
    return this.womenLed.revoke(req.user, providerId, dto.reason);
  }

  @Post('business/:providerId/grant')
  @Roles('admin')
  @ApiOperation({ summary: 'Mark women-led as verified by the team' })
  grant(
    @Request() req: AuthedRequest,
    @Param('providerId', ParseUUIDPipe) providerId: string,
    @Body() dto: GrantWomenLedDto,
  ) {
    return this.womenLed.grant(req.user, providerId, dto);
  }
}
