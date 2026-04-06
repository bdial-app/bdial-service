import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';

import { CategoriesService } from './categories.service';
import { UpdateCategoryDto, CreateCategoryDto } from './dto/category.dto';
import { PaginationDto } from './dto/pagination.dto';

@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  
  @Post()
  @ApiOperation({ summary: 'Create a new category' })
  @ApiResponse({ status: 201, description: 'Category created successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 409, description: 'Category with slug already exists' })
  create(@Body() body: CreateCategoryDto) {
    return this.categoriesService.create(body);
  }


  @Get()
  @ApiOperation({ summary: 'Get all categories with pagination' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiResponse({ status: 200, description: 'Categories retrieved successfully' })
  findAll(@Query() paginationDto: PaginationDto) {
    return this.categoriesService.findAll(paginationDto);
  }

  
  @Get('top-level')
  @ApiOperation({ summary: 'Get only top-level categories' })
  @ApiResponse({ status: 200, description: 'Top-level categories retrieved successfully' })
  findTopLevel() {
    return this.categoriesService.findTopLevel();
  }

  
  @Get(':parentId/subcategories')
  @ApiOperation({ summary: 'Get sub-categories by parent ID with pagination' })
  @ApiResponse({ status: 200, description: 'Sub-categories retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Parent category not found' })
  @ApiParam({ name: 'parentId', description: 'Parent category ID' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
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
  @ApiResponse({ status: 409, description: 'Category with slug already exists' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiBody({ type: UpdateCategoryDto })
  update(@Param('id') id: string, @Body() body: UpdateCategoryDto) {
    if (!id || id === 'undefined' || id === 'null') {
      throw new BadRequestException('Valid category ID is required');
    }

    return this.categoriesService.update(id, body);
  }
}