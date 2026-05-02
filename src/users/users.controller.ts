import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  UseGuards,
  Request,
  Param,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from './users.service';
import { CategoryPersonalizationService } from './category-personalization.service';
import { UpdateUserDto, UserListQueryDto } from './dto/user.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { AllowPaused } from '../common/decorators/allow-paused.decorator';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly categoryPersonalizationService: CategoryPersonalizationService,
  ) { }

  @Post()
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, description: 'User created' })
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  //pagination for getting list of users
  @Get()
  @ApiOperation({ summary: 'List all users with pagination' })
  list(@Query() query: UserListQueryDto) {
    return this.usersService.list(query);
  }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get my profile' })
  getMe(@Request() req) {
    return req.user;
  }

  @Patch('me')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Update my profile' })
  updateMe(@Request() req, @Body() dto: UpdateUserDto) {
    return this.usersService.updateProfile(req.user.id, dto);
  }

  @Delete('me')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Delete (archive) my account' })
  @ApiResponse({ status: 200, description: 'Account archived' })
  deleteMe(@Request() req) {
    return this.usersService.deleteAccount(req.user.id);
  }

  @Patch('me/pause')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Pause my account' })
  @ApiResponse({ status: 200, description: 'Account paused' })
  pauseMe(@Request() req) {
    return this.usersService.pauseAccount(req.user.id);
  }

  @Patch('me/resume')
  @ApiBearerAuth()
  @AllowPaused()
  @ApiOperation({ summary: 'Resume my paused account' })
  @ApiResponse({ status: 200, description: 'Account resumed' })
  resumeMe(@Request() req) {
    return this.usersService.resumeAccount(req.user.id);
  }

  @Get('me/data-export')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Export all my data' })
  @ApiResponse({ status: 200, description: 'User data export' })
  exportMyData(@Request() req) {
    return this.usersService.exportMyData(req.user.id);
  }

  // ─── Category Personalization Endpoints ────────────────────────────

  @Get('me/category-weights')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get personalized category weights (smart defaults + behavioral)' })
  @ApiResponse({ status: 200, description: 'Sorted category weights' })
  getCategoryWeights(@Request() req) {
    return this.categoryPersonalizationService.getCategoryWeights(req.user.id);
  }

  @Get('me/recommended-categories')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get top recommended categories for this user' })
  @ApiResponse({ status: 200, description: 'Top category recommendations' })
  getRecommendedCategories(@Request() req, @Query('limit') limit?: string) {
    return this.categoryPersonalizationService.getPersonalizedCategories(
      req.user.id,
      limit ? parseInt(limit, 10) : 10,
    );
  }

  @Patch('me/category-preferences')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Set explicit category preferences (optional manual override)' })
  @ApiResponse({ status: 200, description: 'Preferences updated' })
  async setCategoryPreferences(@Request() req, @Body() body: { categoryIds: string[] }) {
    await this.categoryPersonalizationService.setPreferredCategories(req.user.id, body.categoryIds || []);
    return { message: 'Category preferences updated' };
  }

  @Post('me/category-interaction')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Record a category interaction (for implicit learning)' })
  @ApiResponse({ status: 201, description: 'Interaction recorded' })
  async recordCategoryInteraction(
    @Request() req,
    @Body() body: { categoryId: string; type: 'search' | 'view' | 'bookmark' | 'inquiry' | 'contact' },
  ) {
    await this.categoryPersonalizationService.recordInteraction(req.user.id, body.categoryId, body.type);
    return { message: 'Interaction recorded' };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user details by ID' })
  getById(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user by ID' })
  updateById(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.updateById(id, dto);
  }
}
