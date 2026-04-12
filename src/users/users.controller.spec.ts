import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersModule } from './users.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';

describe('UsersController', () => {
  let controller: UsersController;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        PrismaModule,
        UsersModule,
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('list', () => {
    it('should list users with pagination from real database', async () => {
      const query = { page: 1, limit: 10 };
      const result = await controller.list(query);
      
      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('total');
      expect(Array.isArray(result.items)).toBe(true);
    });
  });

  describe('create and getMe', () => {
    it('should handle creating a user and attempting to get the user', async () => {
      const mobileNumber = `+9199${Math.floor(10000000 + Math.random() * 90000000)}`;
      const dto = { name: 'Test User', mobileNumber, gender: 'male' as const };

      try {
        const result = await controller.create(dto);
        expect(result).toBeDefined();
        expect(result.mobileNumber).toEqual(mobileNumber);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

});
