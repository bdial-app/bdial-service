import { validate } from 'class-validator';
import { CreateCategoryDto } from './create-category.dto';

describe('CreateCategoryDto', () => {
  it('should validate with valid data', async () => {
    const dto = new CreateCategoryDto();
    dto.name = 'Electronics';
    dto.slug = 'electronics';
    dto.description = 'Electronic devices and accessories';
    dto.isActive = true;
    dto.displayOrder = 1;

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail validation with missing name', async () => {
    const dto = new CreateCategoryDto();
    dto.slug = 'electronics';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('name');
  });

  it('should fail validation with missing slug', async () => {
    const dto = new CreateCategoryDto();
    dto.name = 'Electronics';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('slug');
  });

  it('should fail validation with name too long', async () => {
    const dto = new CreateCategoryDto();
    dto.name = 'a'.repeat(101); // 101 characters, max is 100
    dto.slug = 'electronics';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('name');
  });

  it('should fail validation with slug too long', async () => {
    const dto = new CreateCategoryDto();
    dto.name = 'Electronics';
    dto.slug = 'a'.repeat(101); // 101 characters, max is 100

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('slug');
  });

  it('should fail validation with invalid display order (negative)', async () => {
    const dto = new CreateCategoryDto();
    dto.name = 'Electronics';
    dto.slug = 'electronics';
    dto.displayOrder = -1;

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('displayOrder');
  });

  it('should pass validation with optional fields omitted', async () => {
    const dto = new CreateCategoryDto();
    dto.name = 'Electronics';
    dto.slug = 'electronics';

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should pass validation with valid parent ID', async () => {
    const dto = new CreateCategoryDto();
    dto.name = 'Sub-category';
    dto.slug = 'sub-category';
    dto.parentId = '550e8400-e29b-41d4-a716-446655440000';

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail validation with invalid parent ID format', async () => {
    const dto = new CreateCategoryDto();
    dto.name = 'Sub-category';
    dto.slug = 'sub-category';
    dto.parentId = 'invalid-uuid';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('parentId');
  });
});
