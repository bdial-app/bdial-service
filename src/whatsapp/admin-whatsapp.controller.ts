import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';
import { Roles } from '../common/decorators/roles.decorator';
import { WhatsAppSettingsService } from './whatsapp-settings.service';
import { WhatsAppOverviewService } from './whatsapp-overview.service';
import { WhatsAppTemplateService } from './whatsapp-template.service';
import { WhatsAppAudienceService } from './whatsapp-audience.service';
import { WhatsAppCampaignService } from './whatsapp-campaign.service';
import { WhatsAppInboxService } from './whatsapp-inbox.service';
import { toE164 } from './whatsapp-phone.util';
import type { AdminRequest } from './whatsapp.types';
import { SettingsTestSendDto, UpdateSettingsDto } from './dto/settings.dto';
import {
  TemplateListQueryDto,
  TemplatePreviewDto,
  UpsertTemplateDto,
} from './dto/template.dto';
import {
  AudiencePreviewDto,
  ContactsQueryDto,
  PatchContactDto,
  UpsertSegmentDto,
} from './dto/audience.dto';
import {
  CampaignListQueryDto,
  CampaignMessagesQueryDto,
  CampaignTestSendDto,
  CreateCampaignDto,
  SendCampaignDto,
  UpdateCampaignDto,
} from './dto/campaign.dto';
import {
  ConversationsQueryDto,
  DirectSendDto,
  ThreadQueryDto,
} from './dto/inbox.dto';

@ApiTags('Admin WhatsApp')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Roles('associate') // Base: read access; every mutation below is @Roles('admin')
@Controller('admin/whatsapp')
export class AdminWhatsAppController {
  constructor(
    private readonly settings: WhatsAppSettingsService,
    private readonly overview: WhatsAppOverviewService,
    private readonly templates: WhatsAppTemplateService,
    private readonly audience: WhatsAppAudienceService,
    private readonly campaigns: WhatsAppCampaignService,
    private readonly inbox: WhatsAppInboxService,
  ) {}

  // ── Settings ─────────────────────────────────────────────────────────────

  @Get('settings')
  @ApiOperation({ summary: 'WhatsApp settings, phone health and env status' })
  getSettings() {
    return this.settings.get();
  }

  @Roles('admin')
  @Put('settings')
  @ApiOperation({
    summary: 'Update caps, throttle, send window, keywords, rates',
  })
  updateSettings(@Body() dto: UpdateSettingsDto) {
    return this.settings.update(dto);
  }

  @Roles('admin')
  @Post('settings/refresh')
  @ApiOperation({ summary: 'Re-fetch phone number metadata from Meta' })
  refreshSettings() {
    return this.settings.refreshPhoneMeta();
  }

  @Roles('admin')
  @Post('settings/test-send')
  @ApiOperation({ summary: 'Send a test message (defaults to hello_world)' })
  async settingsTestSend(@Body() dto: SettingsTestSendDto) {
    const phone = toE164(dto.phone);
    if (!phone) throw new BadRequestException('phone is not a valid number');
    const contact = await this.inbox.ensureContact(phone);
    const input = dto.text
      ? { text: dto.text }
      : dto.templateId
        ? { templateId: dto.templateId }
        : { template: await this.inbox.helloWorldTemplate() };
    const m = await this.inbox.sendDirect(contact, input, null);
    return { waMessageId: m.waMessageId, messageId: m.id };
  }

  // ── Overview ─────────────────────────────────────────────────────────────

  @Get('overview')
  @ApiOperation({
    summary: 'KPIs, daily series, attention items, recent campaigns',
  })
  @ApiQuery({ name: 'days', required: false })
  getOverview(@Query('days') days?: string) {
    const n = days ? parseInt(days, 10) : 30;
    return this.overview.overview(Number.isFinite(n) && n > 0 ? n : 30);
  }

  // ── Templates ────────────────────────────────────────────────────────────

  @Get('templates')
  @ApiOperation({ summary: 'List templates (local mirror of Meta)' })
  listTemplates(@Query() query: TemplateListQueryDto) {
    return this.templates.list(query);
  }

  @Roles('admin')
  @Post('templates/sync')
  @ApiOperation({ summary: 'Pull templates from Meta and upsert locally' })
  syncTemplates() {
    return this.templates.sync();
  }

  @Roles('admin')
  @Post('templates/seed')
  @ApiOperation({ summary: 'Insert starter templates as drafts' })
  seedTemplates(@Request() req: AdminRequest) {
    return this.templates.seed(req.user?.id ?? null);
  }

  @Post('templates/preview')
  @ApiOperation({ summary: 'Render a template with sample variables' })
  previewTemplate(@Body() dto: TemplatePreviewDto) {
    return this.templates.preview(dto);
  }

  @Roles('admin')
  @Post('templates')
  @ApiOperation({ summary: 'Create a template (optionally submit to Meta)' })
  createTemplate(@Request() req: AdminRequest, @Body() dto: UpsertTemplateDto) {
    return this.templates.create(dto, req.user?.id ?? null);
  }

  @Get('templates/:id')
  @ApiParam({ name: 'id' })
  getTemplate(@Param('id', ParseUUIDPipe) id: string) {
    return this.templates.get(id);
  }

  @Roles('admin')
  @Put('templates/:id')
  @ApiOperation({ summary: 'Edit a draft/rejected template' })
  updateTemplate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpsertTemplateDto,
  ) {
    return this.templates.update(id, dto);
  }

  @Roles('admin')
  @Post('templates/:id/submit')
  @ApiOperation({ summary: 'Submit a draft to Meta for review' })
  submitTemplate(@Param('id', ParseUUIDPipe) id: string) {
    return this.templates.submit(id);
  }

  @Roles('admin')
  @Delete('templates/:id')
  @ApiOperation({ summary: 'Delete at Meta (if present) and locally' })
  deleteTemplate(@Param('id', ParseUUIDPipe) id: string) {
    return this.templates.remove(id);
  }

  // ── Audience ─────────────────────────────────────────────────────────────

  @Post('audience/preview')
  @ApiOperation({
    summary: 'Count, skip breakdown, cost and sample for filters',
  })
  previewAudience(@Body() dto: AudiencePreviewDto) {
    return this.audience.preview(
      dto.filters,
      dto.templateCategory ?? 'marketing',
    );
  }

  @Get('audience/options')
  @ApiOperation({
    summary: 'Distinct cities and active categories for filters',
  })
  audienceOptions() {
    return this.audience.options();
  }

  @Get('audience/contacts')
  @ApiOperation({ summary: 'Paginated contacts' })
  listContacts(@Query() query: ContactsQueryDto) {
    return this.audience.listContacts(query);
  }

  @Roles('admin')
  @Patch('audience/contacts/:id')
  @ApiOperation({ summary: 'Edit consent, tags, notes' })
  patchContact(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PatchContactDto,
  ) {
    return this.audience.patchContact(id, dto);
  }

  @Get('audience/segments')
  listSegments() {
    return this.audience.listSegments();
  }

  @Roles('admin')
  @Post('audience/segments')
  createSegment(@Request() req: AdminRequest, @Body() dto: UpsertSegmentDto) {
    return this.audience.createSegment(dto, req.user?.id ?? null);
  }

  @Roles('admin')
  @Put('audience/segments/:id')
  updateSegment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpsertSegmentDto,
  ) {
    return this.audience.updateSegment(id, dto);
  }

  @Roles('admin')
  @Delete('audience/segments/:id')
  deleteSegment(@Param('id', ParseUUIDPipe) id: string) {
    return this.audience.deleteSegment(id);
  }

  // ── Campaigns ────────────────────────────────────────────────────────────

  @Get('campaigns')
  @ApiOperation({ summary: 'Paginated campaign summaries' })
  listCampaigns(@Query() query: CampaignListQueryDto) {
    return this.campaigns.list(query);
  }

  @Roles('admin')
  @Post('campaigns')
  @ApiOperation({ summary: 'Create a draft campaign' })
  createCampaign(@Request() req: AdminRequest, @Body() dto: CreateCampaignDto) {
    return this.campaigns.create(dto, req.user?.id ?? null);
  }

  @Get('campaigns/:id')
  getCampaign(@Param('id', ParseUUIDPipe) id: string) {
    return this.campaigns.get(id);
  }

  @Roles('admin')
  @Put('campaigns/:id')
  @ApiOperation({
    summary: 'Edit a draft campaign (accepts the full create payload)',
  })
  updateCampaign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCampaignDto,
  ) {
    return this.campaigns.update(id, dto);
  }

  @Roles('admin')
  @Post('campaigns/:id/send')
  @ApiOperation({
    summary: 'Resolve audience, queue messages, start or schedule',
  })
  sendCampaign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SendCampaignDto,
  ) {
    return this.campaigns.send(id, dto);
  }

  @Roles('admin')
  @Post('campaigns/:id/pause')
  pauseCampaign(@Param('id', ParseUUIDPipe) id: string) {
    return this.campaigns.pause(id);
  }

  @Roles('admin')
  @Post('campaigns/:id/resume')
  resumeCampaign(@Param('id', ParseUUIDPipe) id: string) {
    return this.campaigns.resume(id);
  }

  @Roles('admin')
  @Post('campaigns/:id/cancel')
  cancelCampaign(@Param('id', ParseUUIDPipe) id: string) {
    return this.campaigns.cancel(id);
  }

  @Roles('admin')
  @Post('campaigns/:id/retry-failed')
  retryFailed(@Param('id', ParseUUIDPipe) id: string) {
    return this.campaigns.retryFailed(id);
  }

  @Roles('admin')
  @Post('campaigns/:id/test-send')
  @ApiOperation({ summary: "Send this campaign's message to one number" })
  async campaignTestSend(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CampaignTestSendDto,
  ) {
    const res = await this.campaigns.testSend(id, dto.phone);
    return { waMessageId: res.waMessageId, messageId: res.messageId };
  }

  @Roles('admin')
  @Post('campaigns/:id/duplicate')
  duplicateCampaign(
    @Request() req: AdminRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.campaigns.duplicate(id, req.user?.id ?? null);
  }

  @Roles('admin')
  @Delete('campaigns/:id')
  deleteCampaign(@Param('id', ParseUUIDPipe) id: string) {
    return this.campaigns.remove(id);
  }

  @Get('campaigns/:id/messages')
  @ApiOperation({ summary: 'Paginated recipient rows' })
  campaignMessages(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: CampaignMessagesQueryDto,
  ) {
    return this.campaigns.messages(id, query);
  }

  @Get('campaigns/:id/export')
  @ApiOperation({ summary: 'CSV of recipient rows' })
  async exportCampaign(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const { filename, csv } = await this.campaigns.exportCsv(id);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(csv);
  }

  // ── Inbox ────────────────────────────────────────────────────────────────

  @Get('inbox/conversations')
  listConversations(@Query() query: ConversationsQueryDto) {
    return this.inbox.listConversations(query);
  }

  @Get('inbox/unread-count')
  unreadCount() {
    return this.inbox.unreadCount();
  }

  @Get('inbox/conversations/:contactId/messages')
  thread(
    @Param('contactId', ParseUUIDPipe) contactId: string,
    @Query() query: ThreadQueryDto,
  ) {
    return this.inbox.thread(contactId, query);
  }

  @Roles('admin')
  @Post('inbox/conversations/:contactId/reply')
  @ApiOperation({ summary: 'Reply with text (inside window) or a template' })
  reply(
    @Param('contactId', ParseUUIDPipe) contactId: string,
    @Body() dto: DirectSendDto,
  ) {
    return this.inbox.reply(contactId, dto);
  }

  @Roles('admin')
  @Post('inbox/conversations/:contactId/read')
  markRead(@Param('contactId', ParseUUIDPipe) contactId: string) {
    return this.inbox.markRead(contactId);
  }

  // ── Provider page hook ───────────────────────────────────────────────────

  @Get('providers/:providerId')
  @ApiOperation({ summary: 'WhatsApp state for one provider' })
  providerPanel(@Param('providerId', ParseUUIDPipe) providerId: string) {
    return this.inbox.providerPanel(providerId);
  }

  @Roles('admin')
  @Post('providers/:providerId/send')
  @ApiOperation({ summary: 'Send a template or text to a provider' })
  providerSend(
    @Param('providerId', ParseUUIDPipe) providerId: string,
    @Body() dto: DirectSendDto,
  ) {
    return this.inbox.sendToProvider(providerId, dto);
  }
}
