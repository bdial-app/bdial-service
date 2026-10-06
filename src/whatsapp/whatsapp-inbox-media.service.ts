import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WhatsAppMessage } from '../entities/whatsapp-message.entity';
import { StorageService } from '../storage/storage.service';
import { MetaCloudApiService } from './meta-cloud-api.service';
import { inboundMedia } from './whatsapp.mappers';

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'video/mp4': 'mp4',
  'video/3gpp': '3gp',
  'audio/ogg': 'ogg',
  'audio/mpeg': 'mp3',
  'audio/mp4': 'm4a',
  'audio/aac': 'aac',
  'audio/amr': 'amr',
  'application/pdf': 'pdf',
};

/**
 * Photos, videos, voice notes and documents customers send us. Meta keeps them
 * only for a while, so each is copied into our storage as it arrives (or on
 * first view, for older messages) and served to signed-in admins from there.
 */
@Injectable()
export class WhatsAppInboxMediaService {
  private readonly logger = new Logger(WhatsAppInboxMediaService.name);
  private readonly inFlight = new Map<string, Promise<void>>();

  constructor(
    @InjectRepository(WhatsAppMessage)
    private readonly messageRepo: Repository<WhatsAppMessage>,
    private readonly meta: MetaCloudApiService,
    private readonly storage: StorageService,
  ) {}

  /** Copy a just-received message's media now, while Meta still has it. */
  persistInBackground(messageId: string): void {
    this.persist(messageId).catch((err) =>
      this.logger.warn(
        `Could not store media for ${messageId}: ${err instanceof Error ? err.message : String(err)}`,
      ),
    );
  }

  /** The media bytes for the admin inbox, fetching from Meta the first time. */
  async read(messageId: string): Promise<{
    data: Buffer;
    mimeType: string;
    fileName: string;
  }> {
    await this.persist(messageId);
    const m = await this.messageRepo.findOneBy({ id: messageId });
    const media = m && inboundMedia(m.kind, m.payload);
    if (!m?.mediaStorageKey || !media) throw new NotFoundException();
    const mimeType =
      m.mediaMime ?? media.mimeType ?? 'application/octet-stream';
    return {
      data: await this.storage.get(m.mediaStorageKey),
      mimeType,
      fileName: media.fileName ?? `whatsapp-${media.type}.${extFor(mimeType)}`,
    };
  }

  private persist(messageId: string): Promise<void> {
    // One copy per message even if the webhook and an admin ask at once.
    const running = this.inFlight.get(messageId);
    if (running) return running;
    const job = this.copy(messageId).finally(() =>
      this.inFlight.delete(messageId),
    );
    this.inFlight.set(messageId, job);
    return job;
  }

  private async copy(messageId: string): Promise<void> {
    const m = await this.messageRepo.findOneBy({ id: messageId });
    if (!m) throw new NotFoundException('Message not found');
    if (m.mediaStorageKey) return;
    const media = inboundMedia(m.kind, m.payload);
    if (!media?.mediaId)
      throw new NotFoundException('No media on this message');

    const { data, mimeType } = await this.meta.downloadMedia(media.mediaId);
    const key = await this.storage.putPrivate(
      'whatsapp-media',
      data,
      mimeType,
      extFor(mimeType),
    );
    await this.messageRepo.update(
      { id: m.id },
      { mediaStorageKey: key, mediaMime: mimeType, mediaSize: data.length },
    );
  }
}

function extFor(mimeType: string): string {
  const base = mimeType.split(';')[0].trim().toLowerCase();
  return (
    EXT_BY_MIME[base] ?? base.split('/')[1]?.replace(/[^a-z0-9]/g, '') ?? 'bin'
  );
}
