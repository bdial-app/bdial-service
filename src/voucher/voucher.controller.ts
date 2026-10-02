import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Request,
  ParseUUIDPipe,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { VoucherService } from './voucher.service';
import { CreateVoucherDto, UpdateVoucherDto } from './dto/voucher.dto';
import { AdminVoucherListQueryDto } from './dto/admin-voucher-list.dto';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Admin — Vouchers')
@Controller('admin/vouchers')
@ApiBearerAuth()
@Roles('associate') // Base: read access for any admin role
export class VoucherController {
  constructor(private readonly voucherService: VoucherService) {}

  @Roles('admin')
  @Post()
  @ApiOperation({ summary: 'Create a voucher' })
  create(@Request() req, @Body() dto: CreateVoucherDto) {
    return this.voucherService.create(dto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'List all vouchers' })
  findAll(@Query() query: AdminVoucherListQueryDto) {
    return this.voucherService.findAll(query);
  }

  // Declared before :id so "filter-options" is not read as an id.
  @Get('filter-options')
  @ApiOperation({
    summary: 'Creator list and quick-segment counts for the voucher list',
  })
  getFilterOptions() {
    return this.voucherService.getFilterOptions();
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get voucher statistics' })
  getStats() {
    return this.voucherService.getStats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get voucher by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.voucherService.findOne(id);
  }

  @Roles('admin')
  @Patch(':id')
  @ApiOperation({ summary: 'Update a voucher' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVoucherDto,
  ) {
    return this.voucherService.update(id, dto);
  }

  @Get(':id/redemptions')
  @ApiOperation({ summary: 'Get redemption history for a voucher' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  getRedemptions(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.voucherService.getRedemptions(id, page, limit);
  }
}
