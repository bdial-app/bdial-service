import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthModule } from './auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigModule } from '@nestjs/config';

describe('AuthController', () => {
  let controller: AuthController;
  let prisma: PrismaService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        PrismaModule,
        AuthModule,
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    // Optionally clean up test DB here if needed
    // await prisma.user.deleteMany({});
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('sendOtp', () => {
    it('should send an OTP to a regular mobile number', async () => {
      const dto = { mobileNumber: '+911234567890' };
      const result = await controller.sendOtp(dto);

      expect(result).toHaveProperty('message', 'OTP sent successfully');
    });
  });

  describe('sendAdminOtp', () => {
    it('should fail if the user does not exist or is not an admin', async () => {
      const dto = { mobileNumber: '+910000000000' };

      // Ensure the user doesn't exist
      await prisma.user.deleteMany({ where: { mobileNumber: dto.mobileNumber } });

      await expect(controller.sendAdminOtp(dto)).rejects.toThrow('this user is not admin');
    });

    const adminNumbers = ['+911234567890', '+911234567891'];

    for (const mobileNumber of adminNumbers) {
      it(`should successfully send an OTP to the admin if admin exists: ${mobileNumber}`, async () => {
        const dto = { mobileNumber };

        // Upsert an admin user into the database
        const adminUser = await prisma.user.upsert({
          where: { mobileNumber: dto.mobileNumber },
          update: { role: 'admin' },
          create: {
            mobileNumber: dto.mobileNumber,
            name: `Test Admin ${mobileNumber}`,
            role: 'admin',
            gender: 'other',
          },
        });

        const result = await controller.sendAdminOtp(dto);
        expect(result).toHaveProperty('message', 'OTP sent successfully');

        // Verify the user was created in the DB indeed
        const dbUser = await prisma.user.findUnique({ where: { id: adminUser.id } });
        expect(dbUser?.role).toEqual('admin');
      });
    }
  });

  describe('verifyOtp and Real DB User Creation', () => {
    it('should create a user in the database upon successful OTP verification', async () => {
      const mobileNumber = '+919876543210';

      // Setup predictable OTP
      jest.spyOn(Math, 'random').mockReturnValue(0.12345); // generates OTP: 111110
      const expectedOtp = Math.floor(100000 + 0.12345 * 900000).toString(); // 211110

      // Step 1: Send OTP
      await controller.sendOtp({ mobileNumber });

      const verifyResult = await controller.verifyOtp({ mobileNumber, otp: expectedOtp });

      // Verify token is received
      expect(verifyResult).toHaveProperty('accessToken');
      expect(verifyResult.user).toBeDefined();

      const dbUser = await prisma.user.findUnique({
        where: { mobileNumber },
      });

      expect(dbUser).toBeDefined();
      expect(dbUser?.mobileNumber).toEqual(mobileNumber);

      jest.restoreAllMocks();
    });
  });
});
