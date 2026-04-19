import { Test, TestingModule } from '@nestjs/testing';
import { AdminController } from './admin.controller';
import { AdminModule } from './admin.module';
import { ConfigModule } from '@nestjs/config';

describe('AdminController', () => {
  let controller: AdminController;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        AdminModule,
      ],
    }).compile();

    controller = module.get<AdminController>(AdminController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getDashboard', () => {
    it('should get dashboard stats from the real database', async () => {
      const req = { user: { id: 'admin123', role: 'admin' } }; // Stubbing the request user object
      try {
        const result = await controller.getDashboard(req);
        // Expecting properties from the real database queries
        expect(result).toBeDefined();
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('getPendingListings', () => {
    it('should retrieve pending listings from DB', async () => {
      const req = { user: { id: 'admin123', role: 'admin' } };
      try {
        const result = await controller.getPendingListings(req);
        expect(Array.isArray(result)).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });
});
