import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Request,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { AcceptLegalDto } from './dto/legal.dto';
import { LegalService } from './legal.service';

type AuthedRequest = {
  user: { id: string };
  ip?: string;
  headers: Record<string, string | string[] | undefined>;
};

const firstHeader = (v: string | string[] | undefined) =>
  Array.isArray(v) ? v[0] : v;

/** Terms, privacy policy and the other legal documents, and accepting them. */
@ApiTags('Legal')
@Controller('legal')
export class LegalController {
  constructor(private readonly legal: LegalService) {}

  @Public()
  @Get('documents')
  @ApiOperation({ summary: 'Every legal document, current version (no text)' })
  list() {
    return this.legal.publicList();
  }

  @Public()
  @Get('documents/:slug')
  @ApiOperation({ summary: "A legal document's current text" })
  get(@Param('slug') slug: string) {
    return this.legal.publicGet(slug);
  }

  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({ summary: 'Documents I still need to accept' })
  me(@Request() req: AuthedRequest) {
    return this.legal.myStatus(req.user.id);
  }

  @ApiBearerAuth()
  @Post('me/accept')
  @HttpCode(200)
  @ApiOperation({
    summary: 'I agree to these documents, at the versions shown to me',
  })
  accept(@Request() req: AuthedRequest, @Body() dto: AcceptLegalDto) {
    const forwarded = firstHeader(req.headers['x-forwarded-for'])
      ?.split(',')[0]
      ?.trim();
    return this.legal.accept(req.user.id, dto.documents, {
      method: dto.method,
      platform: dto.platform ?? null,
      ip: forwarded || req.ip || null,
      userAgent: firstHeader(req.headers['user-agent']) ?? null,
    });
  }
}
