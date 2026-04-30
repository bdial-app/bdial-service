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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { VoucherService } from './voucher.service';
import { CreateVoucherDto, UpdateVoucherDto } from './dto/voucher.dto';

@ApiTags('Admin — Vouchers')
@Controller('admin/vouchers')
@ApiBearerAuth()
export class VoucherController {
  constructor(private readonly voucherService: VoucherService) {}

  @Post()
  @ApiOperation({ summary: 'Create a voucher' })
  create(@Request() req, @Body() dto: CreateVoucherDto) {
    return this.voucherService.create(dto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'List all vouchers' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'isActive', required: false })
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('isActive') isActive?: string,
  ) {
    return this.voucherService.findAll({
      page,
      limit,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
    });
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

  @Patch(':id')
  @ApiOperation({ summary: 'Update a voucher' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateVoucherDto) {
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
