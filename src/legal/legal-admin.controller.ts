import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Request,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { LegalDraftDto, PublishLegalDto } from './dto/legal.dto';
import { LegalService } from './legal.service';

type AuthedRequest = { user: { id: string } };

/**
 * Editing legal documents is for super admins only: what is published here
 * is what every user agrees to.
 */
@ApiTags('Admin - Legal')
@ApiBearerAuth()
@Roles('super_admin')
@Controller('admin/legal')
export class LegalAdminController {
  constructor(private readonly legal: LegalService) {}

  @Get()
  @ApiOperation({ summary: 'All legal documents with their current version' })
  list() {
    return this.legal.adminList();
  }

  /** Any admin can see whether someone accepted the terms. */
  @Roles('moderator')
  @Get('users/:userId')
  @ApiOperation({ summary: "A user's legal acceptances" })
  user(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.legal.userAcceptances(userId);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'A document with its draft and every version' })
  get(@Param('slug') slug: string) {
    return this.legal.adminGet(slug);
  }

  @Put(':slug/draft')
  @ApiOperation({ summary: 'Save unpublished edits' })
  saveDraft(
    @Request() req: AuthedRequest,
    @Param('slug') slug: string,
    @Body() dto: LegalDraftDto,
  ) {
    return this.legal.saveDraft(slug, req.user.id, dto);
  }

  @Delete(':slug/draft')
  @ApiOperation({ summary: 'Throw away unpublished edits' })
  discardDraft(@Param('slug') slug: string) {
    return this.legal.discardDraft(slug);
  }

  @Post(':slug/publish')
  @ApiOperation({ summary: 'Publish as the next version' })
  publish(
    @Request() req: AuthedRequest,
    @Param('slug') slug: string,
    @Body() dto: PublishLegalDto,
  ) {
    return this.legal.publish(slug, req.user.id, dto);
  }
}
