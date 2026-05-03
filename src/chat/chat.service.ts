import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, In, ILike } from 'typeorm';
import {
  Conversation,
  ConversationParticipant,
  Message,
  User,
  Provider,
  Product,
} from '../entities';
import { SupabaseRealtimeService } from '../supabase/supabase-realtime.service';
import { StorageService } from '../storage/storage.service';
import { NotificationDispatchService } from '../notifications/notification-dispatch.service';
import { ContentSanitizerService } from '../common/content-sanitizer';
import { compressImage } from '../common/image-processor';
import {
  CreateConversationDto,
  GetConversationsQueryDto,
  SendMessageDto,
  GetMessagesQueryDto,
} from './dto/chat.dto';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @InjectRepository(Conversation)
    private conversationRepo: Repository<Conversation>,
    @InjectRepository(ConversationParticipant)
    private participantRepo: Repository<ConversationParticipant>,
    @InjectRepository(Message)
    private messageRepo: Repository<Message>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(Provider)
    private providerRepo: Repository<Provider>,
    @InjectRepository(Product)
    private productRepo: Repository<Product>,
    private realtime: SupabaseRealtimeService,
    private storage: StorageService,
    private notificationDispatch: NotificationDispatchService,
    private contentSanitizer: ContentSanitizerService,
  ) {}

  // ─────────────────────────────────────────────
  // CONVERSATIONS
  // ─────────────────────────────────────────────

  /**
   * Create or return existing conversation.
   * WhatsApp-style: one conversation per customer↔provider pair per context.
   */
  async createConversation(userId: string, dto: CreateConversationDto) {
    // 1. Validate provider exists and get their user ID
    const provider = await this.providerRepo.findOne({
      where: { id: dto.providerId },
      relations: ['user'],
    });
    if (!provider) throw new NotFoundException('Provider not found');

    // Prevent self-chat
    if (provider.userId === userId) {
      throw new BadRequestException('Cannot start a conversation with yourself');
    }

    // 2. Check for existing active conversation with same context
    const existing = await this.findExistingConversation(
      userId,
      provider.userId,
      dto.contextType || null,
      dto.contextId || null,
    );

    if (existing) {
      // Re-activate conversation if archived
      if (existing.status === 'archived') {
        existing.status = 'active';
        await this.conversationRepo.save(existing);
      }

      // Always re-activate participant rows (they may have been deactivated via "delete chat")
      await this.participantRepo.update(
        { conversationId: existing.id },
        { isActive: true },
      );

      // Send initial message if provided
      if (dto.initialMessage) {
        await this.sendMessage(userId, existing.id, {
          content: dto.initialMessage,
          messageType: dto.initialMessageMetadata ? 'enquiry' : 'text',
          metadata: dto.initialMessageMetadata,
        });
      }

      return this.getConversationDetail(userId, existing.id);
    }

    // 3. Build context snapshot for display
    let contextTitle: string | null = null;
    let contextImageUrl: string | null = null;
    const conversationType = dto.contextType ? 'enquiry' : 'direct';

    if (dto.contextType === 'product' && dto.contextId) {
      const product = await this.productRepo.findOne({
        where: { id: dto.contextId },
      });
      if (product) {
        contextTitle = product.name;
        contextImageUrl = product.photoUrl;
      }
    } else if (dto.contextType === 'provider') {
      contextTitle = provider.brandName;
      contextImageUrl = provider.profilePhotoUrl;
    }

    // 4. Create conversation
    const conversation = this.conversationRepo.create({
      type: conversationType,
      contextType: dto.contextType || null,
      contextId: dto.contextId || null,
      contextTitle,
      contextImageUrl,
      status: 'active',
    });
    await this.conversationRepo.save(conversation);

    // 5. Create participants
    const customerParticipant = this.participantRepo.create({
      conversationId: conversation.id,
      userId,
      role: 'customer',
    });
    const providerParticipant = this.participantRepo.create({
      conversationId: conversation.id,
      userId: provider.userId,
      role: 'provider',
    });
    await this.participantRepo.save([customerParticipant, providerParticipant]);

    // 6. Send initial message if provided
    if (dto.initialMessage) {
      await this.sendMessage(userId, conversation.id, {
        content: dto.initialMessage,
        messageType: dto.initialMessageMetadata ? 'enquiry' : 'text',
        metadata: dto.initialMessageMetadata,
      });
    }

    return this.getConversationDetail(userId, conversation.id);
  }

  /**
   * Get paginated conversation list for a user — sorted by lastMessageAt desc.
   * Includes other participant's info, unread count, last message preview.
   */
  async getConversations(userId: string, query: GetConversationsQueryDto) {
    const { page = 1, limit = 20, filter = 'all', search, role } = query;
    const skip = (page - 1) * limit;

    // Build query — get conversation IDs where user is an active participant
    const qb = this.participantRepo
      .createQueryBuilder('cp')
      .innerJoinAndSelect('cp.conversation', 'c')
      .where('cp.userId = :userId', { userId })
      .andWhere('cp.isActive = true')
      .andWhere('c.status = :status', { status: 'active' });

    // Filter by participant role (customer sees customer chats, provider sees provider chats)
    if (role) {
      qb.andWhere('cp.role = :role', { role });
    }

    if (filter === 'unread') {
      qb.andWhere('cp.unreadCount > 0');
    } else if (filter === 'enquiries') {
      qb.andWhere("c.type = 'enquiry'");
    }

    qb.orderBy('c.lastMessageAt', 'DESC', 'NULLS LAST')
      .skip(skip)
      .take(limit);

    const [myParticipants, total] = await qb.getManyAndCount();

    if (myParticipants.length === 0) {
      return { conversations: [], total, page, limit };
    }

    const conversationIds = myParticipants.map((p) => p.conversationId);

    // Get the other participant for each conversation (with user info)
    const otherParticipants = await this.participantRepo.find({
      where: {
        conversationId: In(conversationIds),
      },
      relations: ['user'],
    });

    // Get provider info for provider participants
    const providerUserIds = otherParticipants
      .filter((p) => p.role === 'provider')
      .map((p) => p.userId);

    const providers =
      providerUserIds.length > 0
        ? await this.providerRepo.find({ where: { userId: In(providerUserIds) } })
        : [];

    const providerByUserId = new Map(providers.map((p) => [p.userId, p]));

    // Fetch actual status of the last message in each conversation
    // (for accurate tick display — sent/delivered/read)
    const lastMessageStatusMap = new Map<string, string>();
    if (conversationIds.length > 0) {
      const lastMsgs = await this.messageRepo
        .createQueryBuilder('m')
        .select(['m.conversationId', 'm.status'])
        .where('m.conversationId IN (:...ids)', { ids: conversationIds })
        .andWhere('m.deletedAt IS NULL')
        .orderBy('m.conversationId')
        .addOrderBy('m.createdAt', 'DESC')
        .getMany();

      // Keep only the first (most recent) per conversation
      for (const m of lastMsgs) {
        if (!lastMessageStatusMap.has(m.conversationId)) {
          lastMessageStatusMap.set(m.conversationId, m.status);
        }
      }
    }

    // Build response
    const conversations = myParticipants.map((myP) => {
      const conv = myP.conversation;
      const otherP = otherParticipants.find(
        (op) => op.conversationId === conv.id && op.userId !== userId,
      );
      const otherUser = otherP?.user;
      const otherProvider = otherP ? providerByUserId.get(otherP.userId) : null;

      // Display name: provider brand name if provider, else user name
      const displayName =
        otherP?.role === 'provider' && otherProvider
          ? otherProvider.brandName
          : otherUser?.name || 'Unknown';

      const avatarUrl =
        otherP?.role === 'provider' && otherProvider
          ? otherProvider.profilePhotoUrl
          : null;

      // Determine last message status:
      // If I sent the last message, show the actual message status (sent/delivered/read)
      // If someone else sent it, it's irrelevant for tick display
      const iSentLast = conv.lastMessageSenderId === userId;

      return {
        id: conv.id,
        type: conv.type,
        contextType: conv.contextType,
        contextId: conv.contextId,
        contextTitle: conv.contextTitle,
        contextImageUrl: conv.contextImageUrl,
        lastMessageAt: conv.lastMessageAt,
        lastMessagePreview: conv.lastMessagePreview,
        lastMessageSenderId: conv.lastMessageSenderId,
        lastMessageStatus: iSentLast ? (lastMessageStatusMap.get(conv.id) || 'sent') : null,
        unreadCount: myP.unreadCount,
        createdAt: conv.createdAt,
        otherParticipant: {
          userId: otherUser?.id || null,
          name: displayName,
          avatarUrl,
          role: otherP?.role || null,
          providerId: otherProvider?.id || null,
        },
      };
    });

    // Apply search filter on display name (post-query — fine for reasonable page sizes)
    const filtered = search
      ? conversations.filter((c) =>
          c.otherParticipant.name.toLowerCase().includes(search.toLowerCase()),
        )
      : conversations;

    return { conversations: filtered, total, page, limit };
  }

  /** Single conversation detail with both participants */
  async getConversationDetail(userId: string, conversationId: string) {
    await this.assertParticipant(userId, conversationId);

    const conversation = await this.conversationRepo.findOne({
      where: { id: conversationId },
      relations: ['participants', 'participants.user'],
    });

    if (!conversation) throw new NotFoundException('Conversation not found');

    const myP = conversation.participants.find((p) => p.userId === userId);
    const otherP = conversation.participants.find((p) => p.userId !== userId);
    const otherUser = otherP?.user;

    // Get provider info if other is provider
    let otherProvider: Provider | null = null;
    if (otherP?.role === 'provider') {
      otherProvider = await this.providerRepo.findOne({
        where: { userId: otherP.userId },
      });
    }

    const displayName =
      otherP?.role === 'provider' && otherProvider
        ? otherProvider.brandName
        : otherUser?.name || 'Unknown';

    return {
      id: conversation.id,
      type: conversation.type,
      contextType: conversation.contextType,
      contextId: conversation.contextId,
      contextTitle: conversation.contextTitle,
      contextImageUrl: conversation.contextImageUrl,
      status: conversation.status,
      lastMessageAt: conversation.lastMessageAt,
      unreadCount: myP?.unreadCount || 0,
      createdAt: conversation.createdAt,
      otherParticipant: {
        userId: otherUser?.id || null,
        name: displayName,
        avatarUrl:
          otherP?.role === 'provider' && otherProvider
            ? otherProvider.profilePhotoUrl
            : null,
        role: otherP?.role || null,
        providerId: otherProvider?.id || null,
      },
      myRole: myP?.role || null,
    };
  }

  // ─────────────────────────────────────────────
  // MESSAGES
  // ─────────────────────────────────────────────

  /**
   * Send a message — the core operation.
   * 1. Validate participant  2. Write message  3. Update denormalized fields
   * 4. Broadcast via Supabase Realtime  5. Return message
   */
  async sendMessage(userId: string, conversationId: string, dto: SendMessageDto) {
    const participant = await this.assertParticipant(userId, conversationId);

    if (!dto.content && !dto.metadata && dto.messageType === 'text') {
      throw new BadRequestException('Message content is required for text messages');
    }

    // Content moderation: check message text for profanity
    if (dto.content) {
      const check = this.contentSanitizer.check(dto.content);
      if (check.flagged) {
        throw new BadRequestException(
          'Your message contains inappropriate language. Please revise and try again.',
        );
      }
    }

    const sender = await this.userRepo.findOneBy({ id: userId });
    if (!sender) throw new NotFoundException('Sender not found');

    // Create message
    const message = this.messageRepo.create({
      conversationId,
      senderId: userId,
      content: dto.content || null,
      messageType: dto.messageType || 'text',
      metadata: dto.metadata || null,
      status: 'sent',
    });
    await this.messageRepo.save(message);

    // Build preview
    const preview = this.buildPreview(dto);

    // Update conversation denormalized fields
    await this.conversationRepo.update(conversationId, {
      lastMessageAt: message.createdAt,
      lastMessagePreview: preview,
      lastMessageSenderId: userId,
    });

    // Increment unread for all OTHER participants
    await this.participantRepo
      .createQueryBuilder()
      .update(ConversationParticipant)
      .set({ unreadCount: () => '"unread_count" + 1' })
      .where('conversation_id = :conversationId', { conversationId })
      .andWhere('user_id != :userId', { userId })
      .execute();

    // Build broadcast payload
    const broadcastPayload = {
      id: message.id,
      conversationId,
      senderId: userId,
      senderName: sender.name,
      content: message.content,
      messageType: message.messageType,
      metadata: message.metadata,
      status: message.status,
      createdAt: message.createdAt.toISOString(),
    };

    // Broadcast message to conversation channel
    this.realtime.broadcastMessage(conversationId, broadcastPayload);

    // Broadcast conversation update to other participants' list channels
    const otherParticipants = await this.participantRepo.find({
      where: { conversationId, isActive: true },
    });

    for (const op of otherParticipants) {
      if (op.userId !== userId) {
        this.realtime.broadcastConversationUpdate(op.userId, {
          conversationId,
          lastMessagePreview: preview,
          lastMessageAt: message.createdAt.toISOString(),
          unreadCount: op.unreadCount + 1,
        });

        // Send push notification to offline/background users
        const notificationType = dto.messageType === 'enquiry' ? 'new_enquiry' : 'chat_message';
        this.notificationDispatch.sendToUser(
          op.userId,
          notificationType as any,
          sender.name,
          preview,
          { route: '/chat', params: { conversationId } },
        ).catch((err) => this.logger.warn(`Push notification failed for user ${op.userId}: ${err.message}`));
      }
    }

    return {
      id: message.id,
      conversationId,
      senderId: userId,
      senderName: sender.name,
      content: message.content,
      messageType: message.messageType,
      metadata: message.metadata,
      status: message.status,
      createdAt: message.createdAt,
      clientMessageId: dto.clientMessageId || null,
    };
  }

  /**
   * Get messages with cursor-based pagination (newest first).
   * Client passes `before` timestamp to load older messages.
   */
  async getMessages(
    userId: string,
    conversationId: string,
    query: GetMessagesQueryDto,
  ) {
    await this.assertParticipant(userId, conversationId);

    const { limit = 30, before } = query;

    const where: any = {
      conversationId,
      deletedAt: null as any,
    };

    if (before) {
      where.createdAt = LessThan(new Date(before));
    }

    const messages = await this.messageRepo.find({
      where,
      relations: ['sender'],
      order: { createdAt: 'DESC' },
      take: limit + 1, // fetch one extra to determine hasMore
    });

    const hasMore = messages.length > limit;
    if (hasMore) messages.pop();

    // Return oldest-first for display, client reverses if needed
    const result = messages.reverse().map((m) => ({
      id: m.id,
      conversationId: m.conversationId,
      senderId: m.senderId,
      senderName: m.sender?.name || 'Unknown',
      content: m.content,
      messageType: m.messageType,
      metadata: m.metadata,
      status: m.status,
      createdAt: m.createdAt,
    }));

    return {
      messages: result,
      hasMore,
      oldestTimestamp: result.length > 0 ? result[0].createdAt : null,
    };
  }

  // ─────────────────────────────────────────────
  // READ RECEIPTS — WhatsApp double-blue-tick
  // ─────────────────────────────────────────────

  /**
   * Mark conversation as read — updates unread count to 0 and
   * marks all messages from the OTHER person as 'read'.
   */
  async markAsRead(userId: string, conversationId: string, upToMessageId?: string) {
    const participant = await this.assertParticipant(userId, conversationId);

    const now = new Date();

    // Reset unread count
    participant.unreadCount = 0;
    participant.lastReadAt = now;
    await this.participantRepo.save(participant);

    // Mark all messages from OTHER users as 'read'
    const updateQb = this.messageRepo
      .createQueryBuilder()
      .update(Message)
      .set({ status: 'read' })
      .where('conversation_id = :conversationId', { conversationId })
      .andWhere('sender_id != :userId', { userId })
      .andWhere("status != 'read'");

    if (upToMessageId) {
      // Only mark messages up to a certain point
      const upToMessage = await this.messageRepo.findOneBy({ id: upToMessageId });
      if (upToMessage) {
        updateQb.andWhere('created_at <= :createdAt', {
          createdAt: upToMessage.createdAt,
        });
      }
    }

    const updateResult = await updateQb.execute();

    // Get IDs of messages that were marked read (for broadcast)
    const readMessages = await this.messageRepo.find({
      where: {
        conversationId,
        status: 'read',
      },
      select: ['id'],
      order: { createdAt: 'DESC' },
      take: 50,
    });

    // Broadcast read receipt
    this.realtime.broadcastReadReceipt(conversationId, {
      userId,
      lastReadAt: now.toISOString(),
      messageIds: readMessages.map((m) => m.id),
    });

    return { success: true, messagesRead: updateResult.affected || 0 };
  }

  // ─────────────────────────────────────────────
  // UNREAD COUNT — badge on Chats tab
  // ─────────────────────────────────────────────

  async getUnreadCount(userId: string) {
    const rows = await this.participantRepo
      .createQueryBuilder('cp')
      .select('cp.role', 'role')
      .addSelect('SUM(cp.unread_count)', 'total')
      .where('cp.user_id = :userId', { userId })
      .andWhere('cp.is_active = true')
      .groupBy('cp.role')
      .getRawMany();

    let customerUnreadCount = 0;
    let providerUnreadCount = 0;
    for (const row of rows) {
      const n = parseInt(row.total || '0', 10);
      if (row.role === 'provider') providerUnreadCount = n;
      else customerUnreadCount += n; // 'customer' or null
    }

    return {
      unreadCount: customerUnreadCount + providerUnreadCount,
      customerUnreadCount,
      providerUnreadCount,
    };
  }

  /**
   * Archive a conversation — hides it from the user's chat list.
   * The other participant can still see it.
   */
  async archiveConversation(userId: string, conversationId: string) {
    const participant = await this.assertParticipant(userId, conversationId);
    participant.isActive = false;
    participant.unreadCount = 0;
    await this.participantRepo.save(participant);
    return { success: true };
  }

  // ─────────────────────────────────────────────
  // MEDIA UPLOAD
  // ─────────────────────────────────────────────

  async uploadChatMedia(
    userId: string,
    conversationId: string,
    file: Express.Multer.File,
  ) {
    await this.assertParticipant(userId, conversationId);

    // Validate file type
    const allowedMimes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'application/pdf',
    ];
    if (!allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Unsupported file type. Allowed: JPEG, PNG, WebP, GIF, PDF',
      );
    }

    // 5MB limit
    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException('File size exceeds 5MB limit');
    }

    // Compress images before upload (skip PDFs and GIFs)
    const processedFile = file.mimetype.startsWith('image/')
      ? await compressImage(file, 'standard')
      : file;

    const { url, storageKey } = await this.storage.upload('chat-media', processedFile);

    return { url, storageKey };
  }

  // ─────────────────────────────────────────────
  // TYPING INDICATOR
  // ─────────────────────────────────────────────

  async broadcastTyping(
    userId: string,
    conversationId: string,
    isTyping: boolean,
  ) {
    await this.assertParticipant(userId, conversationId);
    const user = await this.userRepo.findOneBy({ id: userId });

    this.realtime.broadcastTyping(conversationId, {
      userId,
      userName: user?.name || 'Unknown',
      isTyping,
    });

    return { success: true };
  }

  // ─────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────

  /** Verify the user is a participant in this conversation. Throws 403 otherwise. */
  private async assertParticipant(
    userId: string,
    conversationId: string,
  ): Promise<ConversationParticipant> {
    const participant = await this.participantRepo.findOne({
      where: { conversationId, userId, isActive: true },
    });

    if (!participant) {
      throw new ForbiddenException('You are not a participant in this conversation');
    }

    return participant;
  }

  /** Find existing conversation between two users with same context */
  private async findExistingConversation(
    userId: string,
    otherUserId: string,
    contextType: string | null,
    contextId: string | null,
  ): Promise<Conversation | null> {
    // Find conversations where both users are participants
    const baseQb = this.conversationRepo
      .createQueryBuilder('c')
      .innerJoin('c.participants', 'p1', 'p1.userId = :userId', { userId })
      .innerJoin('c.participants', 'p2', 'p2.userId = :otherUserId', {
        otherUserId,
      })
      .where("c.status IN ('active', 'archived')");

    // 1. Try exact context match first
    if (contextType && contextId) {
      const exact = await baseQb
        .clone()
        .andWhere('c.contextType = :contextType', { contextType })
        .andWhere('c.contextId = :contextId', { contextId })
        .getOne();
      if (exact) return exact;
    } else {
      const nullContext = await baseQb
        .clone()
        .andWhere('c.contextType IS NULL')
        .andWhere('c.contextId IS NULL')
        .getOne();
      if (nullContext) return nullContext;
    }

    // 2. Fallback: reuse ANY existing conversation between the same two users
    //    (prevents duplicate conversations for the same customer↔provider pair)
    return baseQb.clone().orderBy('c.lastMessageAt', 'DESC', 'NULLS LAST').getOne();
  }

  /** Build a preview string for conversation list */
  private buildPreview(dto: SendMessageDto): string {
    if (dto.messageType === 'image') return '📷 Photo';
    if (dto.messageType === 'enquiry') return '📋 Enquiry';
    if (dto.messageType === 'quote_request') return '💰 Quote Request';
    return dto.content?.substring(0, 100) || '';
  }

  // ─────────────────────────────────────────────
  // PRESENCE / ONLINE STATUS
  // ─────────────────────────────────────────────

  /** Update lastSeenAt — called periodically from client heartbeat */
  async updateLastSeen(userId: string) {
    await this.userRepo.update(userId, { lastSeenAt: new Date() });
    return { success: true };
  }

  /** Get user presence info */
  async getPresence(userId: string) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: ['id', 'lastSeenAt'],
    });
    if (!user) throw new NotFoundException('User not found');

    const now = new Date();
    const lastSeen = user.lastSeenAt;
    // Consider "online" if last heartbeat within 2 minutes
    const isOnline = lastSeen
      ? now.getTime() - lastSeen.getTime() < 2 * 60 * 1000
      : false;

    return {
      userId: user.id,
      isOnline,
      lastSeenAt: lastSeen?.toISOString() || null,
    };
  }
}
