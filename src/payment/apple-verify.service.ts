import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readdirSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import {
  AppStoreServerAPIClient,
  Environment,
  SignedDataVerifier,
  type JWSTransactionDecodedPayload,
} from '@apple/app-store-server-library';

/**
 * Verifies Apple In-App Purchase transactions server-side.
 *
 * Flow: the app sends us a `transactionId`. We call the App Store Server API to
 * fetch the signed transaction info for that id, then cryptographically verify
 * and decode it against Apple's root certificates. This is the trustworthy
 * source of truth — we NEVER trust the productId/price the client claims; we use
 * the values Apple returns in the verified payload.
 *
 * Required env (see .env.example):
 *   APPLE_BUNDLE_ID                — app bundle identifier
 *   APPLE_ENVIRONMENT             — "Production" (default) or "Sandbox"
 *   APP_STORE_CONNECT_ISSUER_ID
 *   APP_STORE_CONNECT_KEY_ID
 *   APP_STORE_CONNECT_PRIVATE_KEY — contents of the AuthKey_XXX.p8 (\n-escaped)
 *   APPLE_APP_APPLE_ID            — (optional) numeric App Store app id; omit in Sandbox
 *
 * Required asset: Apple root CA certificates placed in src/payment/apple-certs/
 * (download the 4 .cer files from https://www.apple.com/certificateauthority/).
 */
@Injectable()
export class AppleVerifyService {
  private readonly logger = new Logger(AppleVerifyService.name);
  private apiClient: AppStoreServerAPIClient | null = null;
  private verifier: SignedDataVerifier | null = null;
  private rootCerts: Buffer[] | null = null;

  constructor(private readonly config: ConfigService) {}

  /** True when all Apple credentials are present — lets callers fail fast. */
  isConfigured(): boolean {
    return !!(
      this.config.get<string>('APP_STORE_CONNECT_PRIVATE_KEY') &&
      this.config.get<string>('APP_STORE_CONNECT_KEY_ID') &&
      this.config.get<string>('APP_STORE_CONNECT_ISSUER_ID') &&
      this.config.get<string>('APPLE_BUNDLE_ID')
    );
  }

  private getEnvironment(): Environment {
    const env = (this.config.get<string>('APPLE_ENVIRONMENT') || 'Production').toLowerCase();
    return env === 'sandbox' ? Environment.SANDBOX : Environment.PRODUCTION;
  }

  private loadRootCerts(): Buffer[] {
    if (this.rootCerts) return this.rootCerts;
    // Resolve the certs dir across build layouts (compiled __dirname is
    // dist/src/payment; assets may land in dist/src/payment or dist/payment;
    // ts-node/dev uses src/payment). Try each and use the first that has certs.
    const candidates = [
      join(__dirname, 'apple-certs'),
      join(process.cwd(), 'dist', 'src', 'payment', 'apple-certs'),
      join(process.cwd(), 'dist', 'payment', 'apple-certs'),
      join(process.cwd(), 'src', 'payment', 'apple-certs'),
    ];
    const dir = candidates.find(
      (d) =>
        existsSync(d) &&
        readdirSync(d).some((f) => /\.(cer|der|crt)$/i.test(f)),
    );
    if (!dir) {
      throw new BadRequestException(
        `Apple root certificates not found. Looked in: ${candidates.join(', ')}`,
      );
    }
    const files = readdirSync(dir).filter((f) => /\.(cer|der|crt)$/i.test(f));
    this.rootCerts = files.map((f) => readFileSync(join(dir, f)));
    return this.rootCerts;
  }

  private getApiClient(): AppStoreServerAPIClient {
    if (this.apiClient) return this.apiClient;
    const signingKey = (this.config.get<string>('APP_STORE_CONNECT_PRIVATE_KEY') || '').replace(
      /\\n/g,
      '\n',
    );
    const keyId = this.config.get<string>('APP_STORE_CONNECT_KEY_ID');
    const issuerId = this.config.get<string>('APP_STORE_CONNECT_ISSUER_ID');
    const bundleId = this.config.get<string>('APPLE_BUNDLE_ID');
    if (!signingKey || !keyId || !issuerId || !bundleId) {
      throw new BadRequestException('Apple App Store Connect credentials not configured');
    }
    this.apiClient = new AppStoreServerAPIClient(
      signingKey,
      keyId,
      issuerId,
      bundleId,
      this.getEnvironment(),
    );
    return this.apiClient;
  }

  private getVerifier(): SignedDataVerifier {
    if (this.verifier) return this.verifier;
    const bundleId = this.config.get<string>('APPLE_BUNDLE_ID');
    if (!bundleId) throw new BadRequestException('APPLE_BUNDLE_ID not configured');
    const appAppleId = this.config.get<string>('APPLE_APP_APPLE_ID');
    this.verifier = new SignedDataVerifier(
      this.loadRootCerts(),
      true, // enableOnlineChecks — revocation + expiry validation
      this.getEnvironment(),
      bundleId,
      appAppleId ? Number(appAppleId) : undefined,
    );
    return this.verifier;
  }

  /**
   * Fetch a transaction from Apple by id and return its verified, decoded payload.
   * Throws BadRequestException if the transaction can't be fetched or verified.
   */
  async verifyTransaction(transactionId: string): Promise<JWSTransactionDecodedPayload> {
    const client = this.getApiClient();
    const verifier = this.getVerifier();

    let signedTransactionInfo: string | undefined;
    try {
      const resp = await client.getTransactionInfo(transactionId);
      signedTransactionInfo = resp?.signedTransactionInfo;
    } catch (err: any) {
      this.logger.error(`App Store getTransactionInfo failed: ${err?.message || err}`);
      throw new BadRequestException('Could not verify transaction with Apple');
    }
    if (!signedTransactionInfo) {
      throw new BadRequestException('Apple returned no transaction info for this id');
    }

    try {
      const decoded = await verifier.verifyAndDecodeTransaction(signedTransactionInfo);
      return decoded;
    } catch (err: any) {
      this.logger.error(`Apple transaction verification failed: ${err?.message || err}`);
      throw new BadRequestException('Apple transaction signature verification failed');
    }
  }
}
