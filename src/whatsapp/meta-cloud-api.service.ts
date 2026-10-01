import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  WHATSAPP_DEFAULT_API_VERSION,
  WHATSAPP_NOT_CONFIGURED_MESSAGE,
} from './whatsapp.constants';

/** Error object Meta returns: { error: { message, type, code, error_subcode, fbtrace_id, error_data } } */
export class WhatsAppApiError extends Error {
  constructor(
    public readonly code: number | null,
    message: string,
    public readonly httpStatus: number,
    public readonly subcode: number | null = null,
    public readonly fbtraceId: string | null = null,
    public readonly details: string | null = null,
  ) {
    super(message);
    this.name = 'WhatsAppApiError';
  }
}

export interface MetaSendResult {
  messageId: string;
  waId?: string;
}

export interface MetaTemplate {
  id: string;
  name: string;
  language: string;
  category: string;
  status: string;
  components: unknown[];
  quality_score?: { score?: string } | null;
  rejected_reason?: string | null;
}

export interface MetaPhoneMeta {
  display_phone_number?: string;
  verified_name?: string;
  quality_rating?: string;
  messaging_limit_tier?: string;
  name_status?: string;
  code_verification_status?: string;
}

interface MetaErrorBody {
  error?: {
    message?: string;
    code?: number;
    error_subcode?: number;
    fbtrace_id?: string;
    error_data?: { details?: string };
  };
}

/**
 * Thin HTTP client for Meta's WhatsApp Cloud API (direct, no BSP).
 * Credentials come from env only; when missing, isConfigured() is false and
 * every call throws 503 so the module still loads.
 */
@Injectable()
export class MetaCloudApiService {
  private readonly logger = new Logger(MetaCloudApiService.name);
  private readonly token: string;
  private readonly phoneId: string;
  private readonly wabaId: string;
  readonly apiVersion: string;
  private readonly appSecretValue: string;
  private readonly verifyTokenValue: string;

  constructor(private readonly config: ConfigService) {
    this.token = (config.get<string>('WHATSAPP_ACCESS_TOKEN') ?? '').trim();
    this.phoneId = (
      config.get<string>('WHATSAPP_PHONE_NUMBER_ID') ?? ''
    ).trim();
    this.wabaId = (
      config.get<string>('WHATSAPP_BUSINESS_ACCOUNT_ID') ?? ''
    ).trim();
    this.appSecretValue = (
      config.get<string>('WHATSAPP_APP_SECRET') ?? ''
    ).trim();
    this.verifyTokenValue = (
      config.get<string>('WHATSAPP_VERIFY_TOKEN') ?? ''
    ).trim();
    this.apiVersion =
      (config.get<string>('WHATSAPP_API_VERSION') ?? '').trim() ||
      WHATSAPP_DEFAULT_API_VERSION;
  }

  isConfigured(): boolean {
    return Boolean(this.token && this.phoneId && this.wabaId);
  }

  assertConfigured(): void {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException(WHATSAPP_NOT_CONFIGURED_MESSAGE);
    }
  }

  get phoneNumberId(): string {
    return this.phoneId;
  }

  get appSecret(): string {
    return this.appSecretValue;
  }

  get verifyToken(): string {
    return this.verifyTokenValue;
  }

  get hasAppSecret(): boolean {
    return this.appSecretValue.length > 0;
  }

  get hasVerifyToken(): boolean {
    return this.verifyTokenValue.length > 0;
  }

  /** Which env vars are present (for the settings credentials card). */
  envStatus(): {
    accessToken: boolean;
    phoneNumberId: boolean;
    businessAccountId: boolean;
    appSecret: boolean;
    verifyToken: boolean;
  } {
    return {
      accessToken: Boolean(this.token),
      phoneNumberId: Boolean(this.phoneId),
      businessAccountId: Boolean(this.wabaId),
      appSecret: this.hasAppSecret,
      verifyToken: this.hasVerifyToken,
    };
  }

  // ── Messages ─────────────────────────────────────────────────────────────

  buildTemplatePayload(
    toDigits: string,
    name: string,
    language: string,
    components: unknown[],
  ): Record<string, unknown> {
    const template: Record<string, unknown> = {
      name,
      language: { code: language },
    };
    if (components.length) template.components = components;
    return {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: toDigits,
      type: 'template',
      template,
    };
  }

  buildTextPayload(toDigits: string, body: string): Record<string, unknown> {
    return {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: toDigits,
      type: 'text',
      text: { body, preview_url: true },
    };
  }

  sendTemplate(
    toDigits: string,
    name: string,
    language: string,
    components: unknown[],
  ): Promise<MetaSendResult> {
    return this.sendPayload(
      this.buildTemplatePayload(toDigits, name, language, components),
    );
  }

  sendText(toDigits: string, body: string): Promise<MetaSendResult> {
    return this.sendPayload(this.buildTextPayload(toDigits, body));
  }

  /** POST an already-built request body (what the worker stores in `payload`). */
  async sendPayload(payload: Record<string, unknown>): Promise<MetaSendResult> {
    this.assertConfigured();
    const res = await this.request<{
      messages?: Array<{ id: string }>;
      contacts?: Array<{ wa_id?: string }>;
    }>('POST', `/${this.phoneId}/messages`, payload);
    const messageId = res.messages?.[0]?.id;
    if (!messageId) {
      throw new WhatsAppApiError(null, 'Meta did not return a message id', 502);
    }
    return { messageId, waId: res.contacts?.[0]?.wa_id };
  }

  async markRead(waMessageId: string): Promise<void> {
    this.assertConfigured();
    await this.request('POST', `/${this.phoneId}/messages`, {
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: waMessageId,
    });
  }

  // ── Templates ────────────────────────────────────────────────────────────

  async listTemplates(): Promise<MetaTemplate[]> {
    this.assertConfigured();
    const out: MetaTemplate[] = [];
    let path: string | null =
      `/${this.wabaId}/message_templates?fields=name,language,category,status,components,id,quality_score,rejected_reason&limit=200`;
    let guard = 0;
    while (path && guard++ < 25) {
      const page: {
        data?: MetaTemplate[];
        paging?: { next?: string; cursors?: { after?: string } };
      } = await this.request('GET', path);
      out.push(...(page.data ?? []));
      const after = page.paging?.cursors?.after;
      path =
        page.paging?.next && after
          ? `/${this.wabaId}/message_templates?fields=name,language,category,status,components,id,quality_score,rejected_reason&limit=200&after=${encodeURIComponent(after)}`
          : null;
    }
    return out;
  }

  async createTemplate(
    body: Record<string, unknown>,
  ): Promise<{ id: string; status: string; category?: string }> {
    this.assertConfigured();
    return this.request('POST', `/${this.wabaId}/message_templates`, body);
  }

  async deleteTemplate(
    name: string,
    metaTemplateId?: string | null,
  ): Promise<void> {
    this.assertConfigured();
    const qs = new URLSearchParams({ name });
    if (metaTemplateId) qs.set('hsm_id', metaTemplateId);
    await this.request(
      'DELETE',
      `/${this.wabaId}/message_templates?${qs.toString()}`,
    );
  }

  // ── Phone ────────────────────────────────────────────────────────────────

  async getPhoneMeta(): Promise<MetaPhoneMeta> {
    this.assertConfigured();
    return this.request<MetaPhoneMeta>(
      'GET',
      `/${this.phoneId}?fields=display_phone_number,verified_name,quality_rating,messaging_limit_tier,name_status,code_verification_status`,
    );
  }

  // ── HTTP ─────────────────────────────────────────────────────────────────

  private async request<T = Record<string, unknown>>(
    method: 'GET' | 'POST' | 'DELETE',
    path: string,
    body?: Record<string, unknown>,
  ): Promise<T> {
    const url = `https://graph.facebook.com/${this.apiVersion}${path}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20_000);
    let res: Response;
    try {
      res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'network error';
      throw new WhatsAppApiError(null, `Meta request failed: ${msg}`, 503);
    } finally {
      clearTimeout(timer);
    }

    const text = await res.text();
    let json: unknown = null;
    if (text) {
      try {
        json = JSON.parse(text);
      } catch {
        json = null;
      }
    }

    if (!res.ok) {
      const errBody = (json ?? {}) as MetaErrorBody;
      const e = errBody.error ?? {};
      const message =
        e.error_data?.details || e.message || `Meta HTTP ${res.status}`;
      this.logger.warn(
        `Meta ${method} ${path.split('?')[0]} → ${res.status} code=${e.code ?? '-'} ${message}`,
      );
      throw new WhatsAppApiError(
        e.code ?? null,
        message,
        res.status,
        e.error_subcode ?? null,
        e.fbtrace_id ?? null,
        e.error_data?.details ?? null,
      );
    }
    return (json ?? {}) as T;
  }
}
