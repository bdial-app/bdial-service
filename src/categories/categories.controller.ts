import { Controller, Get, Post, Patch, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { Query } from '@nestjs/common';
import { UpdateCategoryDto } from './dto/category.dto';
import { CreateCategoryDto } from './dto/category.dto';

@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

@Get()
@ApiOperation({ summary: 'Get all categories with pagination' })
findAll(
  @Query('page') page: string,
  @Query('limit') limit: string,
) {
  return this.categoriesService.findAll(Number(page), Number(limit));
}

  @Get('top-level')
  @ApiOperation({ summary: 'Get only top-level categories' })
  findTopLevel() {
    return this.categoriesService.findTopLevel();
  }


@Post()
@ApiOperation({ summary: 'Create category' })
create(@Body() body: CreateCategoryDto) {
  return this.categoriesService.create(body);
}

@Patch(':id')
@ApiOperation({ summary: 'Update category' })
@ApiBody({ type: UpdateCategoryDto }) // ensures Swagger shows the correct fields
update(@Param('id') id: string, @Body() body: UpdateCategoryDto) {
  return this.categoriesService.update(id, body);
}

  @Get(':id')
  @ApiOperation({ summary: 'Get category by ID' })
  findOne(@Param('id') id: string) {
    return this.categoriesService.findOne(id);
  }

 
  @Get('subcategories/:parentId')
  @ApiOperation({ summary: 'Get subcategories by parentId' })
  findSubcategories(@Param('parentId') parentId: string) {
    return this.categoriesService.findSubcategories(parentId);
  }
}