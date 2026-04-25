import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BugReport } from './bug-report.entity';
import { CreateBugReportDto } from './dto/create-bug-report.dto';
import { ContentSanitizerService } from '../common/content-sanitizer';
import { BadRequestException } from '@nestjs/common';

@Injectable()
export class BugReportsService {
  constructor(
    @InjectRepository(BugReport) private bugReportRepo: Repository<BugReport>,
    private readonly contentSanitizer: ContentSanitizerService,
  ) {}

  async create(userId: string | null, dto: CreateBugReportDto) {
    const { clean, flaggedWords } = this.contentSanitizer.check(dto.description);
    if (!clean) {
      throw new BadRequestException(
        `Your bug report contains inappropriate language. Please revise and try again.`,
      );
    }

    const report = this.bugReportRepo.create({
      reporterId: userId ?? null,
      category: dto.category,
      description: dto.description,
      stepsToReproduce: dto.stepsToReproduce ?? null,
      deviceInfo: dto.deviceInfo ?? null,
      status: 'open',
    });

    await this.bugReportRepo.save(report);
    return { success: true, id: report.id };
  }
}
