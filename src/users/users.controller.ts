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
import { CreateUserDto, UpdateUserDto, UserListQueryDto } from './dto/user.dto';
import { AllowPaused } from '../common/decorators/allow-paused.decorator';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

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
