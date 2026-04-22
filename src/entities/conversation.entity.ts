import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { ConversationParticipant } from './conversation-participant.entity';
import { Message } from './message.entity';

@Entity('conversations')
@Index(['status', 'lastMessageAt'])
export class Conversation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** direct = general chat, enquiry = about a product/provider */
  @Column({ type: 'enum', enum: ['direct', 'enquiry'], default: 'direct' })
  type: 'direct' | 'enquiry';

  /** What this conversation is about (nullable for general chats) */
  @Column({ name: 'context_type', type: 'varchar', length: 20, nullable: true })
  contextType: 'product' | 'provider' | null;

  /** FK to the context entity (product/provider id) */
  @Column({ name: 'context_id', type: 'uuid', nullable: true })
  contextId: string | null;

  /** Snapshot of context for display (product name, provider brand, etc.) */
  @Column({ name: 'context_title', type: 'varchar', length: 200, nullable: true })
  contextTitle: string | null;

  @Column({ name: 'context_image_url', type: 'varchar', length: 500, nullable: true })
  contextImageUrl: string | null;

  @Column({ type: 'enum', enum: ['active', 'archived', 'closed'], default: 'active' })
  status: 'active' | 'archived' | 'closed';

  /** Denormalized for fast conversation-list sorting */
  @Column({ name: 'last_message_at', type: 'timestamptz', nullable: true })
  lastMessageAt: Date | null;

  /** Denormalized preview text for conversation list */
  @Column({ name: 'last_message_preview', type: 'varchar', length: 255, nullable: true })
  lastMessagePreview: string | null;

  /** ID of the user who sent the last message */
  @Column({ name: 'last_message_sender_id', type: 'uuid', nullable: true })
  lastMessageSenderId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => ConversationParticipant, (p) => p.conversation)
  participants: ConversationParticipant[];

  @OneToMany(() => Message, (m) => m.conversation)
  messages: Message[];
}
