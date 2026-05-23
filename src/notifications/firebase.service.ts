import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

export interface PushPayload {
  title: string;
  body: string;
  imageUrl?: string;
  data?: Record<string, string>;
}

export interface SendResult {
  successCount: number;
  failureCount: number;
  staleTokens: string[];
}

@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseService.name);
  private isInitialized = false;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const projectId = this.config.get<string>('FIREBASE_PROJECT_ID');
    const clientEmail = this.config.get<string>('FIREBASE_CLIENT_EMAIL');
    const privateKey = this.config.get<string>('FIREBASE_PRIVATE_KEY');

    if (!projectId || !clientEmail || !privateKey) {
      this.logger.warn(
        'Firebase credentials not configured — push notifications disabled. ' +
        'Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY env vars.',
      );
      return;
    }

    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          // Private key comes as escaped newlines from env vars
          privateKey: privateKey.replace(/\\n/g, '\n'),
        }),
      });
      this.isInitialized = true;
      this.logger.log('Firebase Admin SDK initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Firebase Admin SDK', error);
    }
  }

  /**
   * Send a push notification to a single device token.
   */
  async sendToDevice(token: string, payload: PushPayload): Promise<SendResult> {
    if (!this.isInitialized) {
      this.logger.warn('Firebase not initialized — skipping push');
      return { successCount: 0, failureCount: 1, staleTokens: [] };
    }

    const message: admin.messaging.Message = {
      token,
      data: {
        title: payload.title,
        body: payload.body,
        ...(payload.imageUrl && { imageUrl: payload.imageUrl }),
        ...(payload.data || {}),
      },
      // Also include notification field for system tray display when app is in background
      notification: {
        title: payload.title,
        body: payload.body,
        ...(payload.imageUrl && { imageUrl: payload.imageUrl }),
      },
      // Android-specific: high priority ensures delivery even in Doze mode
      android: {
        priority: 'high',
        notification: {
          channelId: 'default',
          sound: 'default',
          defaultVibrateTimings: true,
          defaultSound: true,
          ...(payload.imageUrl && { imageUrl: payload.imageUrl }),
        },
      },
      // iOS/APNs-specific: ensures immediate delivery and badge/sound
      apns: {
        payload: {
          aps: {
            alert: {
              title: payload.title,
              body: payload.body,
            },
            sound: 'default',
            badge: 1,
            'content-available': 1,
            'mutable-content': 1,
          },
        },
        headers: {
          'apns-priority': '10',
          'apns-push-type': 'alert',
        },
      },
      webpush: {
        fcmOptions: {
          link: payload.data?.route || '/',
        },
      },
    };

    try {
      await admin.messaging().send(message);
      return { successCount: 1, failureCount: 0, staleTokens: [] };
    } catch (error: any) {
      const staleTokens = this.isStaleTokenError(error) ? [token] : [];
      this.logger.warn(`Failed to send to device: ${error.code || error.message}`);
      return { successCount: 0, failureCount: 1, staleTokens };
    }
  }

  /**
   * Send a push notification to multiple device tokens (up to 500 per call).
   */
  async sendToDevices(tokens: string[], payload: PushPayload): Promise<SendResult> {
    if (!this.isInitialized) {
      this.logger.warn('Firebase not initialized — skipping push');
      return { successCount: 0, failureCount: tokens.length, staleTokens: [] };
    }

    if (tokens.length === 0) {
      return { successCount: 0, failureCount: 0, staleTokens: [] };
    }

    const message: admin.messaging.MulticastMessage = {
      tokens,
      data: {
        title: payload.title,
        body: payload.body,
        ...(payload.imageUrl && { imageUrl: payload.imageUrl }),
        ...(payload.data || {}),
      },
      notification: {
        title: payload.title,
        body: payload.body,
        ...(payload.imageUrl && { imageUrl: payload.imageUrl }),
      },
      // Android-specific: high priority ensures delivery even in Doze mode
      android: {
        priority: 'high',
        notification: {
          channelId: 'default',
          sound: 'default',
          defaultVibrateTimings: true,
          defaultSound: true,
          ...(payload.imageUrl && { imageUrl: payload.imageUrl }),
        },
      },
      // iOS/APNs-specific: ensures immediate delivery and badge/sound
      apns: {
        payload: {
          aps: {
            alert: {
              title: payload.title,
              body: payload.body,
            },
            sound: 'default',
            badge: 1,
            'content-available': 1,
            'mutable-content': 1,
          },
        },
        headers: {
          'apns-priority': '10',
          'apns-push-type': 'alert',
        },
      },
      webpush: {
        fcmOptions: {
          link: payload.data?.route || '/',
        },
      },
    };

    try {
      const response = await admin.messaging().sendEachForMulticast(message);
      const staleTokens: string[] = [];

      response.responses.forEach((resp, idx) => {
        if (resp.error && this.isStaleTokenError(resp.error)) {
          staleTokens.push(tokens[idx]);
        }
      });

      return {
        successCount: response.successCount,
        failureCount: response.failureCount,
        staleTokens,
      };
    } catch (error: any) {
      this.logger.error(`Multicast send failed: ${error.message}`);
      return { successCount: 0, failureCount: tokens.length, staleTokens: [] };
    }
  }

  /**
   * Check if an FCM error indicates the token is no longer valid.
   */
  private isStaleTokenError(error: any): boolean {
    const staleCodes = [
      'messaging/registration-token-not-registered',
      'messaging/invalid-registration-token',
      'messaging/mismatched-credential',
    ];
    return staleCodes.includes(error?.code);
  }
}
