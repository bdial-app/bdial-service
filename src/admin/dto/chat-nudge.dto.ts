import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export const CHAT_NUDGE_CHANNELS = ['push', 'whatsapp'] as const;
export type ChatNudgeChannel = (typeof CHAT_NUDGE_CHANNELS)[number];

export class SendChatNudgeDto {
  @ApiProperty({ enum: CHAT_NUDGE_CHANNELS })
  @IsIn(CHAT_NUDGE_CHANNELS)
  channel: ChatNudgeChannel;
}
