import { Test, TestingModule } from '@nestjs/testing';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { PaginationDto } from './dto/pagination.dto';
import { BadRequestException } from '@nestjs/common';

describe('CategoriesController', () => {
  let controller: CategoriesController;
  let service: CategoriesService;

  const mockCategoriesService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    findSubCategories: jest.fn(),
    findTopLevel: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoriesController],
      providers: [
        {
          provide: CategoriesService,
          useValue: mockCategoriesService,
        },
      ],
    }).compile();

    controller = module.get<CategoriesController>(CategoriesController);
    service = module.get<CategoriesService>(CategoriesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a category', async () => {
      const createCategoryDto: CreateCategoryDto = {
        name: 'Electronics',
        slug: 'electronics',
        description: 'Electronic devices',
      };

      const expectedCategory = {
        id: 'uuid-1',
        ...createCategoryDto,
        isActive: true,
        displayOrder: 0,
        createdAt: new Date(),
      };

      mockCategoriesService.create.mockResolvedValue(expectedCategory);

      const result = await controller.create(createCategoryDto);

      expect(result).toEqual(expectedCategory);
      expect(service.create).toHaveBeenCalledWith(createCategoryDto);
    });
  });

  describe('findAll', () => {
    it('should return paginated categories', async () => {
      const paginationDto: PaginationDto = { page: 1, limit: 10 };
      const expectedResult = {
        data: [
          { id: '1', name: 'Category 1', isActive: true },
          { id: '2', name: 'Category 2', isActive: true },
        ],
        meta: {
          total: 2,
          page: 1,
          limit: 10,
          totalPages: 1,
        },
      };

      mockCategoriesService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.findAll(paginationDto);

      expect(result).toEqual(expectedResult);
      expect(service.findAll).toHaveBeenCalledWith(paginationDto);
    });

    it('should use default pagination values when not provided', async () => {
      const paginationDto = {};
      const expectedResult = {
        data: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
      };

      mockCategoriesService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.findAll(paginationDto);

      expect(result).toEqual(expectedResult);
      expect(service.findAll).toHaveBeenCalledWith(paginationDto);
    });
  });

  describe('findOne', () => {
    it('should return a category by ID', async () => {
      const categoryId = 'uuid-1';
      const expectedCategory = {
        id: categoryId,
        name: 'Electronics',
        slug: 'electronics',
        isActive: true,
      };

      mockCategoriesService.findOne.mockResolvedValue(expectedCategory);

      const result = await controller.findOne(categoryId);

      expect(result).toEqual(expectedCategory);
      expect(service.findOne).toHaveBeenCalledWith(categoryId);
    });

    it('should throw BadRequestException for invalid ID', async () => {
      const invalidIds = ['', 'undefined', 'null'];

      for (const invalidId of invalidIds) {
        await expect(controller.findOne(invalidId)).rejects.toThrow(
          BadRequestException,
        );
      }
      
      // Test that valid IDs don't throw
      const validId = 'valid-uuid';
      mockCategoriesService.findOne.mockResolvedValue({ id: validId, name: 'Test' });
      
      await expect(controller.findOne(validId)).resolves.toBeDefined();
      expect(mockCategoriesService.findOne).toHaveBeenCalledWith(validId);
    });
  });

  describe('update', () => {
    it('should update a category', async () => {
      const categoryId = 'uuid-1';
      const updateCategoryDto: UpdateCategoryDto = {
        name: 'Updated Electronics',
      };

      const expectedCategory = {
        id: categoryId,
        name: 'Updated Electronics',
        slug: 'electronics',
        isActive: true,
      };

      mockCategoriesService.update.mockResolvedValue(expectedCategory);

      const result = await controller.update(categoryId, updateCategoryDto);

      expect(result).toEqual(expectedCategory);
      expect(service.update).toHaveBeenCalledWith(categoryId, updateCategoryDto);
    });

    it('should throw BadRequestException for invalid ID', async () => {
      const invalidIds = ['', 'undefined', 'null'];
      const updateCategoryDto: UpdateCategoryDto = { name: 'Updated' };

      for (const invalidId of invalidIds) {
        await expect(controller.update(invalidId, updateCategoryDto)).rejects.toThrow(
          BadRequestException,
        );
      }
      
      // Test that valid IDs don't throw
      const validId = 'valid-uuid';
      mockCategoriesService.update.mockResolvedValue({ id: validId, name: 'Updated' });
      
      await expect(controller.update(validId, updateCategoryDto)).resolves.toBeDefined();
      expect(mockCategoriesService.update).toHaveBeenCalledWith(validId, updateCategoryDto);
    });
  });

  describe('findSubCategories', () => {
    it('should return sub-categories by parent ID', async () => {
      const parentId = 'parent-uuid';
      const paginationDto: PaginationDto = { page: 1, limit: 5 };
      const expectedResult = {
        data: [
          { id: '1', name: 'Sub 1', parentId },
          { id: '2', name: 'Sub 2', parentId },
        ],
        meta: {
          total: 2,
          page: 1,
          limit: 5,
          totalPages: 1,
        },
        parent: { id: parentId, name: 'Parent' },
      };

      mockCategoriesService.findSubCategories.mockResolvedValue(expectedResult);

      const result = await controller.findSubCategories(parentId, paginationDto);

      expect(result).toEqual(expectedResult);
      expect(service.findSubCategories).toHaveBeenCalledWith(parentId, paginationDto);
    });

    it('should throw BadRequestException for invalid parent ID', async () => {
      const invalidIds = ['', 'undefined', 'null'];
      const paginationDto: PaginationDto = { page: 1, limit: 10 };

      for (const invalidId of invalidIds) {
        await expect(
          controller.findSubCategories(invalidId, paginationDto),
        ).rejects.toThrow(BadRequestException);
      }
      
      // Test that valid IDs don't throw
      const validId = 'valid-uuid';
      mockCategoriesService.findSubCategories.mockResolvedValue({
        data: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
        parent: { id: validId, name: 'Parent' }
      });
      
      await expect(controller.findSubCategories(validId, paginationDto)).resolves.toBeDefined();
      expect(mockCategoriesService.findSubCategories).toHaveBeenCalledWith(validId, paginationDto);
    });
  });

  describe('findTopLevel', () => {
    it('should return top-level categories', async () => {
      const expectedCategories = [
        { id: '1', name: 'Category 1', parentId: null },
        { id: '2', name: 'Category 2', parentId: null },
      ];

      mockCategoriesService.findTopLevel.mockResolvedValue(expectedCategories);

      const result = await controller.findTopLevel();

      expect(result).toEqual(expectedCategories);
      expect(service.findTopLevel).toHaveBeenCalled();
    });
  });
});
