import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Conversation } from './conversation.entity';
import { User } from './user.entity';

@Entity('messages')
@Index(['conversationId', 'createdAt'])
@Index(['senderId'])
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'conversation_id', type: 'uuid' })
  conversationId: string;

  @Column({ name: 'sender_id', type: 'uuid', nullable: true })
  senderId: string | null;

  /** Nullable for image-only or system messages */
  @Column({ type: 'text', nullable: true })
  content: string | null;

  @Column({
    name: 'message_type',
    type: 'enum',
    enum: ['text', 'image', 'enquiry', 'system', 'quote_request'],
    default: 'text',
  })
  messageType: 'text' | 'image' | 'enquiry' | 'system' | 'quote_request';

  /**
   * Flexible metadata for rich messages:
   * - image: { url, storageKey, thumbnailUrl, width, height }
   * - enquiry: { productId, productName, productImage, productPrice, currency }
   * - quote_request: { description, budget, deadline }
   * - system: { action: 'conversation_created' | 'conversation_closed' }
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @Column({
    type: 'enum',
    enum: ['sent', 'delivered', 'read'],
    default: 'sent',
  })
  status: 'sent' | 'delivered' | 'read';

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;

  @ManyToOne(() => Conversation, (c) => c.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversation_id' })
  conversation: Conversation;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'sender_id' })
  sender: User | null;
}
