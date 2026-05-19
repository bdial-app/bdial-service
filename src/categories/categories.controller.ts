import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  BadRequestException,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiConsumes,
} from '@nestjs/swagger';

import { CategoriesService } from './categories.service';
import { UpdateCategoryDto, CreateCategoryDto } from './dto/category.dto';
import { PaginationDto } from './dto/pagination.dto';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Categories')
@Controller('categories')
@Public()
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new category' })
  @ApiResponse({ status: 201, description: 'Category created successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({
    status: 409,
    description: 'Category with slug already exists',
  })
  create(@Body() body: CreateCategoryDto) {
    return this.categoriesService.create(body);
  }

  @Get()
  @ApiOperation({ summary: 'Get all categories with pagination' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiResponse({
    status: 200,
    description: 'Categories retrieved successfully',
  })
  findAll(@Query() paginationDto: PaginationDto) {
    return this.categoriesService.findAll(paginationDto);
  }

  @Get('top-level')
  @ApiOperation({ summary: 'Get only top-level categories' })
  @ApiResponse({
    status: 200,
    description: 'Top-level categories retrieved successfully',
  })
  findTopLevel() {
    return this.categoriesService.findTopLevel();
  }

  @Get('tree')
  @ApiOperation({ summary: 'Get full category tree (all active categories with children nested)' })
  @ApiResponse({
    status: 200,
    description: 'Full category tree retrieved successfully',
  })
  findTree() {
    return this.categoriesService.findTree();
  }

  @Post('suggest')
  @ApiOperation({ summary: 'Suggest categories based on business title and description' })
  @ApiResponse({ status: 200, description: 'Suggested categories returned' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Business name / brand name' },
        description: { type: 'string', description: 'Business description' },
      },
    },
  })
  suggestCategories(@Body() body: { title?: string; description?: string }) {
    const text = [body.title, body.description].filter(Boolean).join(' ');
    if (!text.trim()) return [];
    return this.categoriesService.suggestByText(text.trim());
  }

  @Get('search')
  @ApiOperation({ summary: 'Search categories across all levels by text' })
  @ApiQuery({ name: 'q', required: true, description: 'Search query' })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiResponse({ status: 200, description: 'Matching categories returned' })
  searchCategories(@Query('q') q: string, @Query('limit') limit?: number) {
    if (!q || !q.trim()) return [];
    return this.categoriesService.searchAllCategories(q.trim(), Math.min(Number(limit) || 10, 20));
  }

  @Get(':parentId/sub-categories')
  @ApiOperation({ summary: 'Get sub-categories by parent ID with provider counts' })
  @ApiResponse({
    status: 200,
    description: 'Sub-categories retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Parent category not found' })
  @ApiParam({ name: 'parentId', description: 'Parent category ID' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 50 })
  findSubCategories(
    @Param('parentId') parentId: string,
    @Query() paginationDto: PaginationDto,
  ) {
    if (!parentId || parentId === 'undefined' || parentId === 'null') {
      throw new BadRequestException('Valid parent category ID is required');
    }

    return this.categoriesService.findSubCategories(parentId, paginationDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get category by ID' })
  @ApiResponse({ status: 200, description: 'Category retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  findOne(@Param('id') id: string) {
    if (!id || id === 'undefined' || id === 'null') {
      throw new BadRequestException('Valid category ID is required');
    }

    return this.categoriesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a category' })
  @ApiResponse({ status: 200, description: 'Category updated successfully' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  @ApiResponse({
    status: 409,
    description: 'Category with slug already exists',
  })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiBody({ type: UpdateCategoryDto })
  update(@Param('id') id: string, @Body() body: UpdateCategoryDto) {
    if (!id || id === 'undefined' || id === 'null') {
      throw new BadRequestException('Valid category ID is required');
    }

    return this.categoriesService.update(id, body);
  }

  @Post(':id/icon')
  @UseInterceptors(FileInterceptor('icon'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload or update category icon (PNG or SVG)' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiResponse({
    status: 200,
    description: 'Icon uploaded successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid file or file type' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        icon: {
          type: 'string',
          format: 'binary',
          description: 'PNG or SVG image file (max 5MB)',
        },
      },
    },
  })
  uploadIcon(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!id || id === 'undefined' || id === 'null') {
      throw new BadRequestException('Valid category ID is required');
    }

    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    return this.categoriesService.uploadIcon(id, file);
  }

  @Delete(':id/icon')
  @ApiOperation({ summary: 'Delete category icon' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiResponse({ status: 200, description: 'Icon deleted successfully' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  deleteIcon(@Param('id') id: string) {
    if (!id || id === 'undefined' || id === 'null') {
      throw new BadRequestException('Valid category ID is required');
    }

    return this.categoriesService.deleteIcon(id);
  }

  @Post(':id/image')
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload or update category image (PNG only)' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiResponse({ status: 200, description: 'Image uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file or file type' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        image: {
          type: 'string',
          format: 'binary',
          description: 'PNG image file (max 10MB)',
        },
      },
    },
  })
  uploadImage(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!id || id === 'undefined' || id === 'null') {
      throw new BadRequestException('Valid category ID is required');
    }
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    return this.categoriesService.uploadImage(id, file);
  }

  @Delete(':id/image')
  @ApiOperation({ summary: 'Delete category image' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiResponse({ status: 200, description: 'Image deleted successfully' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  deleteImage(@Param('id') id: string) {
    if (!id || id === 'undefined' || id === 'null') {
      throw new BadRequestException('Valid category ID is required');
    }

    return this.categoriesService.deleteImage(id);
  }
}
