import { Test, TestingModule } from '@nestjs/testing';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

describe('AdminController - Verification Endpoints', () => {
  let controller: AdminController;
  let service: AdminService;

  const mockAdminService = {
    getVerifications: jest.fn(),
    getVerificationById: jest.fn(),
    reviewVerification: jest.fn(),
    updateVerificationStatus: jest.fn(),
  };

  const mockAdminUser = {
    id: 'admin-uuid',
    role: 'admin',
    name: 'Admin User',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        {
          provide: AdminService,
          useValue: mockAdminService,
        },
      ],
    }).compile();

    controller = module.get<AdminController>(AdminController);
    service = module.get<AdminService>(AdminService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getVerifications', () => {
    it('should return paginated verifications', async () => {
      const page = 1;
      const rows = 10;
      const expectedResult = {
        data: [
          {
            id: 'verification-1',
            aadhaarStatus: 'pending',
            user: { id: 'user-1', name: 'User 1', mobileNumber: '1234567890' },
          },
        ],
        pagination: {
          currentPage: 1,
          pageSize: 10,
          totalCount: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };

      mockAdminService.getVerifications.mockResolvedValue(expectedResult);

      const result = await controller.getVerifications(
        { user: mockAdminUser },
        page,
        rows,
      );

      expect(result).toEqual(expectedResult);
      expect(service.getVerifications).toHaveBeenCalledWith(mockAdminUser, page, rows);
    });

    it('should use default pagination values when not provided', async () => {
      const expectedResult = {
        data: [],
        pagination: {
          currentPage: 1,
          pageSize: 10,
          totalCount: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };

      mockAdminService.getVerifications.mockResolvedValue(expectedResult);

      const result = await controller.getVerifications({ user: mockAdminUser });

      expect(result).toEqual(expectedResult);
      expect(service.getVerifications).toHaveBeenCalledWith(mockAdminUser, undefined, undefined);
    });
  });

  describe('getVerificationById', () => {
    it('should return verification by ID', async () => {
      const verificationId = 'verification-uuid';
      const expectedVerification = {
        id: verificationId,
        aadhaarStatus: 'pending',
        ijamatStatus: 'not_submitted',
        status: 'pending',
        user: {
          id: 'user-1',
          name: 'Test User',
          mobileNumber: '1234567890',
          city: 'Mumbai',
          area: 'Bandra',
        },
      };

      mockAdminService.getVerificationById.mockResolvedValue(expectedVerification);

      const result = await controller.getVerificationById(verificationId, {
        user: mockAdminUser,
      });

      expect(result).toEqual(expectedVerification);
      expect(service.getVerificationById).toHaveBeenCalledWith(mockAdminUser, verificationId);
    });

    it('should throw NotFoundException when verification does not exist', async () => {
      const verificationId = 'non-existent-verification';

      mockAdminService.getVerificationById.mockRejectedValue(
        new NotFoundException(`Verification with ID ${verificationId} not found`),
      );

      await expect(
        controller.getVerificationById(verificationId, { user: mockAdminUser }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('reviewVerification', () => {
    it('should review verification successfully', async () => {
      const verificationId = 'verification-uuid';
      const reviewData = {
        aadhaarStatus: 'approved' as const,
        ijamatStatus: 'approved',
        adminNotes: 'Documents verified successfully',
      };

      const expectedReview = {
        id: verificationId,
        aadhaarStatus: 'approved',
        ijamatStatus: 'approved',
        adminNotes: 'Documents verified successfully',
        reviewedAt: new Date(),
        reviewedBy: mockAdminUser.id,
      };

      mockAdminService.reviewVerification.mockResolvedValue(expectedReview);

      const result = await controller.reviewVerification(
        verificationId,
        { user: mockAdminUser },
        reviewData.aadhaarStatus,
        reviewData.ijamatStatus,
        reviewData.adminNotes,
      );

      expect(result).toEqual(expectedReview);
      expect(service.reviewVerification).toHaveBeenCalledWith(
        mockAdminUser,
        verificationId,
        reviewData.aadhaarStatus,
        reviewData.ijamatStatus,
        reviewData.adminNotes,
      );
    });

    it('should handle review with only aadhaarStatus', async () => {
      const verificationId = 'verification-uuid';
      const reviewData = {
        aadhaarStatus: 'rejected' as const,
        ijamatStatus: undefined,
        adminNotes: 'Invalid document',
      };

      const expectedReview = {
        id: verificationId,
        aadhaarStatus: 'rejected',
        adminNotes: 'Invalid document',
        reviewedAt: new Date(),
        reviewedBy: mockAdminUser.id,
      };

      mockAdminService.reviewVerification.mockResolvedValue(expectedReview);

      const result = await controller.reviewVerification(
        verificationId,
        { user: mockAdminUser },
        reviewData.aadhaarStatus,
        reviewData.ijamatStatus,
        reviewData.adminNotes,
      );

      expect(result).toEqual(expectedReview);
      expect(service.reviewVerification).toHaveBeenCalledWith(
        mockAdminUser,
        verificationId,
        reviewData.aadhaarStatus,
        reviewData.ijamatStatus,
        reviewData.adminNotes,
      );
    });
  });

  describe('updateVerificationStatus', () => {
    it('should update all verification status fields', async () => {
      const verificationId = 'verification-uuid';
      const updateData = {
        aadhaarStatus: 'approved' as const,
        ijamatStatus: 'approved' as const,
        status: 'approved' as const,
      };

      const expectedUpdate = {
        id: verificationId,
        aadhaarStatus: 'approved',
        ijamatStatus: 'approved',
        status: 'approved',
      };

      mockAdminService.updateVerificationStatus.mockResolvedValue(expectedUpdate);

      const result = await controller.updateVerificationStatus(
        verificationId,
        { user: mockAdminUser },
        updateData.aadhaarStatus,
        updateData.ijamatStatus,
        updateData.status,
      );

      expect(result).toEqual(expectedUpdate);
      expect(service.updateVerificationStatus).toHaveBeenCalledWith(
        mockAdminUser,
        verificationId,
        updateData.aadhaarStatus,
        updateData.ijamatStatus,
        updateData.status,
      );
    });

    it('should update only aadhaarStatus', async () => {
      const verificationId = 'verification-uuid';
      const updateData = {
        aadhaarStatus: 'rejected' as const,
        ijamatStatus: undefined,
        status: undefined,
      };

      const expectedUpdate = {
        id: verificationId,
        aadhaarStatus: 'rejected',
      };

      mockAdminService.updateVerificationStatus.mockResolvedValue(expectedUpdate);

      const result = await controller.updateVerificationStatus(
        verificationId,
        { user: mockAdminUser },
        updateData.aadhaarStatus,
        updateData.ijamatStatus,
        updateData.status,
      );

      expect(result).toEqual(expectedUpdate);
      expect(service.updateVerificationStatus).toHaveBeenCalledWith(
        mockAdminUser,
        verificationId,
        updateData.aadhaarStatus,
        updateData.ijamatStatus,
        updateData.status,
      );
    });

    it('should update only ijamatStatus', async () => {
      const verificationId = 'verification-uuid';
      const updateData = {
        aadhaarStatus: undefined,
        ijamatStatus: 'rejected' as const,
        status: undefined,
      };

      const expectedUpdate = {
        id: verificationId,
        ijamatStatus: 'rejected',
      };

      mockAdminService.updateVerificationStatus.mockResolvedValue(expectedUpdate);

      const result = await controller.updateVerificationStatus(
        verificationId,
        { user: mockAdminUser },
        updateData.aadhaarStatus,
        updateData.ijamatStatus,
        updateData.status,
      );

      expect(result).toEqual(expectedUpdate);
      expect(service.updateVerificationStatus).toHaveBeenCalledWith(
        mockAdminUser,
        verificationId,
        updateData.aadhaarStatus,
        updateData.ijamatStatus,
        updateData.status,
      );
    });

    it('should update only overall status', async () => {
      const verificationId = 'verification-uuid';
      const updateData = {
        aadhaarStatus: undefined,
        ijamatStatus: undefined,
        status: 'pending' as const,
      };

      const expectedUpdate = {
        id: verificationId,
        status: 'pending',
      };

      mockAdminService.updateVerificationStatus.mockResolvedValue(expectedUpdate);

      const result = await controller.updateVerificationStatus(
        verificationId,
        { user: mockAdminUser },
        updateData.aadhaarStatus,
        updateData.ijamatStatus,
        updateData.status,
      );

      expect(result).toEqual(expectedUpdate);
      expect(service.updateVerificationStatus).toHaveBeenCalledWith(
        mockAdminUser,
        verificationId,
        updateData.aadhaarStatus,
        updateData.ijamatStatus,
        updateData.status,
      );
    });

    it('should throw NotFoundException when verification does not exist', async () => {
      const verificationId = 'non-existent-verification';
      const updateData = {
        aadhaarStatus: 'approved' as const,
        ijamatStatus: undefined,
        status: undefined,
      };

      mockAdminService.updateVerificationStatus.mockRejectedValue(
        new NotFoundException(`Verification with ID ${verificationId} not found`),
      );

      await expect(
        controller.updateVerificationStatus(
          verificationId,
          { user: mockAdminUser },
          updateData.aadhaarStatus,
          updateData.ijamatStatus,
          updateData.status,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should handle empty update data', async () => {
      const verificationId = 'verification-uuid';
      const updateData = {
        aadhaarStatus: undefined,
        ijamatStatus: undefined,
        status: undefined,
      };

      const expectedUpdate = {
        id: verificationId,
      };

      mockAdminService.updateVerificationStatus.mockResolvedValue(expectedUpdate);

      const result = await controller.updateVerificationStatus(
        verificationId,
        { user: mockAdminUser },
        updateData.aadhaarStatus,
        updateData.ijamatStatus,
        updateData.status,
      );

      expect(result).toEqual(expectedUpdate);
      expect(service.updateVerificationStatus).toHaveBeenCalledWith(
        mockAdminUser,
        verificationId,
        updateData.aadhaarStatus,
        updateData.ijamatStatus,
        updateData.status,
      );
    });
  });
});
