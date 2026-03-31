import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';

@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all active categories (nested)' })
  findAll() {
    return this.categoriesService.findAll();
  }

  @Get('top-level')
  @ApiOperation({ summary: 'Get only top-level categories' })
  findTopLevel() {
    return this.categoriesService.findTopLevel();
  }
}
