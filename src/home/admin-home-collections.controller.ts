import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ROLE_HIERARCHY } from '../common/enums/admin-role.enum';
import { HomeCollectionsService } from './home-collections.service';
import {
  CreateHomeCollectionDto,
  ReorderHomeCollectionsDto,
  UpdateHomeCollectionDto,
} from './dto/home-collection.dto';

type AuthedRequest = { user?: { role?: string } };

function assertAdmin(req: AuthedRequest) {
  const role = req.user?.role ?? '';
  if ((ROLE_HIERARCHY[role] ?? 0) < ROLE_HIERARCHY['admin']) {
    throw new ForbiddenException('Admin access required');
  }
}

/** Admin: the home-screen "needs" (collections). */
@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('admin/home-collections')
export class AdminHomeCollectionsController {
  constructor(private readonly collections: HomeCollectionsService) {}

  @Get()
  @ApiOperation({ summary: 'All home collections, with item counts' })
  list(@Request() req: AuthedRequest) {
    assertAdmin(req);
    return this.collections.adminList();
  }

  @Post()
  @ApiOperation({ summary: 'Create a home collection' })
  create(@Request() req: AuthedRequest, @Body() dto: CreateHomeCollectionDto) {
    assertAdmin(req);
    return this.collections.create(dto);
  }

  // Before ':id', which would otherwise take "reorder" as an id.
  @Patch('reorder')
  @ApiOperation({ summary: 'Set the order (top first)' })
  reorder(
    @Request() req: AuthedRequest,
    @Body() dto: ReorderHomeCollectionsDto,
  ) {
    assertAdmin(req);
    return this.collections.reorder(dto.ids);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a home collection' })
  update(
    @Request() req: AuthedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateHomeCollectionDto,
  ) {
    assertAdmin(req);
    return this.collections.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a home collection' })
  remove(
    @Request() req: AuthedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    assertAdmin(req);
    return this.collections.remove(id);
  }
}
