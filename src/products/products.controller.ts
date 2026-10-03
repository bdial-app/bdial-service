import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  Request,
  ParseUUIDPipe,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiOperation,
  ApiTags,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ProductsService } from './products.service';
import { CatalogService } from './catalog.service';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import { CatalogBrowseDto, CatalogShelvesDto, SimilarProductsDto } from './dto/catalog.dto';
import { Public } from '../common/decorators/public.decorator';
import { memoryStorage } from 'multer';

/** Lets guests through; signed-in callers get `req.user` for personalisation. */
class OptionalJwtGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any) {
    return user || null;
  }
}

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly catalogService: CatalogService,
  ) {}

  // Catalog routes are declared before `:id` so they never reach the UUID pipe.

  @Get('catalog/shelves')
  @Public()
  @UseGuards(OptionalJwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Storefront for products or services: category chips and curated shelves' })
  getCatalogShelves(@Query() dto: CatalogShelvesDto, @Request() req) {
    return this.catalogService.getShelves(dto, req.user?.id ?? null);
  }

  @Get('catalog/browse')
  @Public()
  @ApiOperation({ summary: 'Paginated product or service grid with sort and filters' })
  browseCatalog(@Query() dto: CatalogBrowseDto) {
    return this.catalogService.browse(dto);
  }

  @Get(':id/similar')
  @Public()
  @ApiOperation({ summary: 'Similar items of the same type from other businesses' })
  getSimilar(@Param('id', ParseUUIDPipe) id: string, @Query() dto: SimilarProductsDto) {
    return this.catalogService.getSimilar(id, dto);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get product detail' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.findOne(id);
  }

  @Post('upload-image')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Upload a product image (max 10 MB, auto-compressed to WebP)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  uploadImage(
    @Request() req,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10 MB — we compress server-side
          new FileTypeValidator({ fileType: /^image\/(jpeg|jpg|png|webp)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.productsService.uploadImage(req.user.id, file);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Create a product for a listing' })
  create(@Request() req, @Body() dto: CreateProductDto) {
    return this.productsService.create(req.user.id, dto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Update a product' })
  update(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.update(req.user.id, id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Delete a product' })
  remove(@Request() req, @Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.remove(req.user.id, id);
  }
}
