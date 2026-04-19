import { Controller, Get, Post, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { SavedLocationsService } from './saved-locations.service';
import { CreateSavedLocationDto } from './dto/create-saved-location.dto';

@ApiTags('Saved Locations')
@Controller('saved-locations')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
export class SavedLocationsController {
  constructor(private readonly service: SavedLocationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all saved locations for the logged-in user (Flow 3-a)' })
  @ApiResponse({ status: 200, description: 'List of saved locations' })
  findAll(@Request() req) {
    return this.service.findByUser(req.user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Save a new location for the logged-in user' })
  @ApiResponse({ status: 201, description: 'Location saved' })
  create(@Request() req, @Body() dto: CreateSavedLocationDto) {
    return this.service.create(req.user.id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a saved location' })
  @ApiResponse({ status: 200, description: 'Location deleted' })
  remove(@Request() req, @Param('id') id: string) {
    return this.service.remove(req.user.id, id);
  }

  @Delete()
  @ApiOperation({ summary: 'Delete all saved locations (Clear All)' })
  @ApiResponse({ status: 200, description: 'All locations deleted' })
  removeAll(@Request() req) {
    return this.service.removeAll(req.user.id);
  }
}
