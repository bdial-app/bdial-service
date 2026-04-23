import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppInvite } from '../entities';

@Injectable()
export class InviteService {
  constructor(
    @InjectRepository(AppInvite) private inviteRepo: Repository<AppInvite>,
  ) {}

  async trackInvite(inviterId: string, method: string) {
    const invite = this.inviteRepo.create({ inviterId, inviteMethod: method });
    return this.inviteRepo.save(invite);
  }

  async getMyInviteCount(userId: string): Promise<number> {
    return this.inviteRepo.count({ where: { inviterId: userId } });
  }
}
