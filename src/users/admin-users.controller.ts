import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';
import { UserPaginationDto } from './dto/user-pagination.dto';

@ApiTags('Users')
@Controller('users')
export class AdminUsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new user (Public)' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 409, description: 'Mobile number already exists' })
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get(':userId')
  @ApiOperation({ summary: 'Get user details by ID (Public)' })
  @ApiResponse({ status: 200, description: 'User details retrieved successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  getUserDetails(@Param('userId') userId: string) {
    if (!userId || userId === 'undefined' || userId === 'null') {
      throw new BadRequestException('Valid user ID is required');
    }
    return this.usersService.getUserDetails(userId);
  }

  @Patch(':userId')
  @ApiOperation({ summary: 'Update user by ID (Public)' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 409, description: 'Mobile number already exists' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  updateUser(
    @Param('userId') userId: string,
    @Body() updateUserDto: AdminUpdateUserDto,
  ) {
    if (!userId || userId === 'undefined' || userId === 'null') {
      throw new BadRequestException('Valid user ID is required');
    }
    return this.usersService.updateUser(userId, updateUserDto);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get users list with pagination and filters (Admin only)' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'role', required: false, enum: ['customer', 'admin'] })
  @ApiQuery({ name: 'status', required: false, enum: ['active', 'suspended', 'deleted'] })
  @ApiQuery({ name: 'search', required: false, type: String })
  getUsersList(@Query() paginationDto: UserPaginationDto) {
    return this.usersService.getUsersList(paginationDto);
  }
}
