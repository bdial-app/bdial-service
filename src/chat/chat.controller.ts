import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ChatService } from './chat.service';
import {
  CreateConversationDto,
  GetConversationsQueryDto,
  SendMessageDto,
  GetMessagesQueryDto,
  MarkReadDto,
  TypingDto,
} from './dto/chat.dto';

@ApiTags('Chat')
@Controller('chat')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  // ─── Conversations ───────────────────────────

  @Post('conversations')
  @ApiOperation({ summary: 'Create or get existing conversation with a provider' })
  @ApiResponse({ status: 201, description: 'Conversation created or returned' })
  createConversation(@Request() req, @Body() dto: CreateConversationDto) {
    return this.chatService.createConversation(req.user.id, dto);
  }

  @Get('conversations')
  @ApiOperation({ summary: 'List conversations for the logged-in user' })
  @ApiResponse({ status: 200, description: 'Paginated conversation list' })
  getConversations(@Request() req, @Query() query: GetConversationsQueryDto) {
    return this.chatService.getConversations(req.user.id, query);
  }

  @Get('conversations/:id')
  @ApiOperation({ summary: 'Get a single conversation with participant details' })
  @ApiResponse({ status: 200, description: 'Conversation detail' })
  getConversation(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.chatService.getConversationDetail(req.user.id, id);
  }

  // ─── Messages ────────────────────────────────

  @Get('conversations/:id/messages')
  @ApiOperation({ summary: 'Get messages for a conversation (cursor-paginated)' })
  @ApiResponse({ status: 200, description: 'Paginated messages' })
  getMessages(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: GetMessagesQueryDto,
  ) {
    return this.chatService.getMessages(req.user.id, id, query);
  }

  @Post('conversations/:id/messages')
  @ApiOperation({ summary: 'Send a message in a conversation' })
  @ApiResponse({ status: 201, description: 'Message sent' })
  sendMessage(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.chatService.sendMessage(req.user.id, id, dto);
  }

  // ─── Read Receipts ───────────────────────────

  @Patch('conversations/:id/read')
  @ApiOperation({ summary: 'Mark conversation as read (resets unread count)' })
  @ApiResponse({ status: 200, description: 'Messages marked as read' })
  markAsRead(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MarkReadDto,
  ) {
    return this.chatService.markAsRead(req.user.id, id, dto.upToMessageId);
  }

  // ─── Unread Count ────────────────────────────

  @Get('unread-count')
  @ApiOperation({ summary: 'Get total unread message count across all conversations' })
  @ApiResponse({ status: 200, description: 'Total unread count for badge' })
  getUnreadCount(@Request() req) {
    return this.chatService.getUnreadCount(req.user.id);
  }

  // ─── Archive / Delete Chat ───────────────────

  @Patch('conversations/:id/archive')
  @ApiOperation({ summary: 'Archive a conversation (hide from chat list)' })
  @ApiResponse({ status: 200 })
  archiveConversation(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.chatService.archiveConversation(req.user.id, id);
  }

  // ─── Media Upload ────────────────────────────

  @Post('conversations/:id/media')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload an image or file to send in chat' })
  @ApiResponse({ status: 201, description: 'Upload URL returned' })
  @UseInterceptors(FileInterceptor('file'))
  uploadMedia(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.chatService.uploadChatMedia(req.user.id, id, file);
  }

  // ─── Typing Indicator ────────────────────────

  @Post('conversations/:id/typing')
  @ApiOperation({ summary: 'Broadcast typing indicator' })
  @ApiResponse({ status: 200 })
  typing(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TypingDto,
  ) {
    return this.chatService.broadcastTyping(req.user.id, id, dto.isTyping);
  }

  // ─── Presence / Online Status ────────────────

  @Post('heartbeat')
  @ApiOperation({ summary: 'Update user last-seen timestamp (call periodically)' })
  @ApiResponse({ status: 200 })
  heartbeat(@Request() req) {
    return this.chatService.updateLastSeen(req.user.id);
  }

  @Get('presence/:userId')
  @ApiOperation({ summary: 'Get online/last-seen status of a user' })
  @ApiResponse({ status: 200 })
  getPresence(
    @Request() req,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.chatService.getPresence(userId);
  }
}
