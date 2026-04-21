import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { SavedItemsService } from './saved-items.service';
import { ToggleSavedItemDto } from './dto/toggle-saved-item.dto';

@ApiTags('Saved Items')
@Controller('saved-items')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
export class SavedItemsController {
  constructor(private readonly service: SavedItemsService) {}

  @Post('toggle')
  @ApiOperation({ summary: 'Toggle save/unsave a provider or product' })
  @ApiResponse({ status: 200, description: 'Returns { saved: boolean }' })
  toggle(@Request() req, @Body() dto: ToggleSavedItemDto) {
    return this.service.toggle(req.user.id, dto.itemId, dto.itemType);
  }

  @Get()
  @ApiOperation({ summary: 'Get all saved items for the logged-in user' })
  @ApiResponse({ status: 200, description: 'List of saved items with details' })
  findAll(@Request() req) {
    return this.service.findByUser(req.user.id);
  }

  @Get('ids')
  @ApiOperation({ summary: 'Get saved item IDs for quick lookup' })
  @ApiResponse({ status: 200, description: 'List of saved item IDs' })
  getIds(
    @Request() req,
    @Query('itemType') itemType?: 'provider' | 'product',
  ) {
    return this.service.getSavedIds(req.user.id, itemType);
  }

  @Get('check/:itemId/:itemType')
  @ApiOperation({ summary: 'Check if a specific item is saved' })
  @ApiResponse({ status: 200, description: 'Returns { saved: boolean }' })
  check(
    @Request() req,
    @Param('itemId') itemId: string,
    @Param('itemType') itemType: 'provider' | 'product',
  ) {
    return this.service.isSaved(req.user.id, itemId, itemType);
  }
}
