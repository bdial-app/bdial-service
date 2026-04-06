import { validate } from 'class-validator';
import { PaginationDto } from './pagination.dto';

describe('PaginationDto', () => {
  it('should validate with valid pagination data', async () => {
    const dto = new PaginationDto();
    dto.page = 1;
    dto.limit = 10;

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should use default values when not provided', async () => {
    const dto = new PaginationDto();

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
    expect(dto.page).toBe(1);
    expect(dto.limit).toBe(10);
  });

  it('should fail validation with page less than 1', async () => {
    const dto = new PaginationDto();
    dto.page = 0;

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('page');
  });

  it('should fail validation with negative page', async () => {
    const dto = new PaginationDto();
    dto.page = -1;

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('page');
  });

  it('should fail validation with limit less than 1', async () => {
    const dto = new PaginationDto();
    dto.limit = 0;

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('limit');
  });

  it('should fail validation with negative limit', async () => {
    const dto = new PaginationDto();
    dto.limit = -1;

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('limit');
  });

  it('should fail validation with limit greater than 100', async () => {
    const dto = new PaginationDto();
    dto.limit = 101;

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('limit');
  });

  it('should validate with maximum allowed limit', async () => {
    const dto = new PaginationDto();
    dto.page = 5;
    dto.limit = 100;

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should validate with high page number', async () => {
    const dto = new PaginationDto();
    dto.page = 1000;
    dto.limit = 20;

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });
});
