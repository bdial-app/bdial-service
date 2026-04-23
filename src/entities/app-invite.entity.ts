import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('app_invites')
@Index(['inviterId', 'createdAt'])
export class AppInvite {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'inviter_id', type: 'uuid' })
  inviterId: string;

  @Column({ name: 'invite_method', type: 'varchar', length: 50 })
  inviteMethod: string; // 'whatsapp' | 'sms' | 'copy_link' | 'native_share'

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
