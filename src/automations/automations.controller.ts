import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { Roles } from '../common/decorators/roles.decorator';
import { AUTOMATION_KEYS, type AutomationKey } from './automation-catalog';
import { AutomationsService } from './automations.service';

type AuthedRequest = { user?: { id?: string } };

export class UpdateAutomationDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  /** ₹ a month; null removes the budget. */
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsNumber()
  @Min(0)
  monthlyBudgetInr?: number | null;
}

export class TestAutomationDto {
  @IsString()
  @MaxLength(20)
  phone: string;
}

class KeyParam {
  @IsIn(AUTOMATION_KEYS)
  key: AutomationKey;
}

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin/automations')
export class AutomationsController {
  constructor(private readonly automations: AutomationsService) {}

  @Get()
  @Roles('admin')
  @ApiOperation({
    summary:
      'Automated WhatsApp messages: switches, template state, last 7 days',
  })
  list() {
    return this.automations.list();
  }

  @Get(':key/jobs')
  @Roles('admin')
  @ApiOperation({
    summary: 'Recent sends and skips (with reasons) for one automation',
  })
  jobs(@Param() p: KeyParam, @Query('limit') limit?: string) {
    return this.automations.recentJobs(p.key, Number(limit) || 50);
  }

  @Patch(':key')
  @Roles('admin')
  @ApiOperation({
    summary: 'Switch an automation on or off, or set its monthly budget',
  })
  async update(
    @Param() p: KeyParam,
    @Body() dto: UpdateAutomationDto,
    @Request() req: AuthedRequest,
  ) {
    const adminId = req.user?.id ?? null;
    if (dto.enabled !== undefined)
      await this.automations.setEnabled(p.key, dto.enabled, adminId);
    if (dto.monthlyBudgetInr !== undefined)
      await this.automations.setBudget(p.key, dto.monthlyBudgetInr, adminId);
    return { ok: true };
  }

  @Post(':key/test')
  @Roles('admin')
  @ApiOperation({
    summary: 'Send this template to a number with sample values',
  })
  test(
    @Param() p: KeyParam,
    @Body() dto: TestAutomationDto,
    @Request() req: AuthedRequest,
  ) {
    return this.automations.sendTest(p.key, dto.phone, req.user?.id ?? null);
  }
}
