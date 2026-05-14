import { Injectable, Logger } from '@nestjs/common';
import { StorageService } from '../storage/storage.service';

interface WebsiteMeta {
  logoUrl: string | null;
  title: string | null;
}

@Injectable()
export class WebsiteMetaService {
  private readonly logger = new Logger(WebsiteMetaService.name);

  constructor(private readonly storageService: StorageService) {}

  /**
   * Fetch website metadata (logo + title) from a domain.
   * Returns nulls on any failure — this is best-effort, non-blocking.
   */
  async fetchWebsiteMeta(domain: string): Promise<WebsiteMeta> {
    const normalizedUrl = this.normalizeDomain(domain);
    if (!normalizedUrl) {
      return { logoUrl: null, title: null };
    }

    // SSRF protection: block private/reserved IPs
    if (await this.isBlockedHost(normalizedUrl)) {
      this.logger.warn(`Blocked SSRF attempt for domain: ${domain}`);
      return { logoUrl: null, title: null };
    }

    try {
      const html = await this.fetchHtml(normalizedUrl);
      if (!html) return { logoUrl: null, title: null };

      const title = this.extractTitle(html);
      const logoSrc = this.extractLogoUrl(html, normalizedUrl);

      let logoUrl: string | null = null;
      if (logoSrc) {
        logoUrl = await this.downloadAndStoreLogo(logoSrc, domain);
      }

      return { logoUrl, title };
    } catch (err) {
      this.logger.warn(`Failed to fetch website meta for ${domain}: ${err.message}`);
      return { logoUrl: null, title: null };
    }
  }

  private normalizeDomain(input: string): string | null {
    let domain = input.trim().toLowerCase();

    // Remove protocol if present
    domain = domain.replace(/^https?:\/\//, '');
    // Remove trailing slash and path
    domain = domain.split('/')[0];
    // Remove port
    domain = domain.split(':')[0];

    // Basic domain validation
    if (!domain || domain.length < 3 || !domain.includes('.')) {
      return null;
    }

    // Block IP addresses directly
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(domain)) {
      return null;
    }

    return `https://${domain}`;
  }

  private async isBlockedHost(url: string): Promise<boolean> {
    try {
      const { hostname } = new URL(url);

      // Block common private/reserved hostnames
      const blockedPatterns = [
        'localhost',
        '127.0.0.1',
        '0.0.0.0',
        '::1',
        'metadata.google.internal',
        '169.254.169.254', // AWS/GCP metadata
      ];

      if (blockedPatterns.includes(hostname)) return true;

      // Resolve DNS and check if IP is private
      const dns = await import('dns');
      const { promisify } = await import('util');
      const resolve4 = promisify(dns.resolve4);

      try {
        const addresses = await resolve4(hostname);
        for (const ip of addresses) {
          if (this.isPrivateIp(ip)) return true;
        }
      } catch {
        // DNS resolution failed - allow the request to fail naturally later
        return false;
      }

      return false;
    } catch {
      return true;
    }
  }

  private isPrivateIp(ip: string): boolean {
    const parts = ip.split('.').map(Number);
    if (parts.length !== 4) return true;

    // 10.0.0.0/8
    if (parts[0] === 10) return true;
    // 172.16.0.0/12
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    // 192.168.0.0/16
    if (parts[0] === 192 && parts[1] === 168) return true;
    // 127.0.0.0/8
    if (parts[0] === 127) return true;
    // 169.254.0.0/16 (link-local)
    if (parts[0] === 169 && parts[1] === 254) return true;
    // 0.0.0.0/8
    if (parts[0] === 0) return true;

    return false;
  }

  private async fetchHtml(url: string): Promise<string | null> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'TijarahConnect/1.0 (Website Meta Fetcher)',
          'Accept': 'text/html',
        },
        redirect: 'follow',
      });

      clearTimeout(timeout);

      if (!response.ok) return null;

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/html')) return null;

      // Limit response size to 512KB to prevent memory abuse
      const text = await response.text();
      return text.slice(0, 512 * 1024);
    } catch {
      return null;
    }
  }

  private extractTitle(html: string): string | null {
    const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (match?.[1]) {
      return match[1].trim().slice(0, 200);
    }

    // Fallback to og:title
    const ogMatch = html.match(/<meta\s+(?:property|name)=["']og:title["']\s+content=["']([^"']+)["']/i);
    return ogMatch?.[1]?.trim().slice(0, 200) || null;
  }

  private extractLogoUrl(html: string, baseUrl: string): string | null {
    // Priority order: og:image → apple-touch-icon → large favicon → shortcut icon
    const patterns: { regex: RegExp; priority: number }[] = [
      { regex: /<meta\s+(?:property|name)=["']og:image["']\s+content=["']([^"']+)["']/i, priority: 1 },
      { regex: /<meta\s+content=["']([^"']+)["']\s+(?:property|name)=["']og:image["']/i, priority: 1 },
      { regex: /<link[^>]+rel=["']apple-touch-icon["'][^>]+href=["']([^"']+)["']/i, priority: 2 },
      { regex: /<link[^>]+href=["']([^"']+)["'][^>]+rel=["']apple-touch-icon["']/i, priority: 2 },
      { regex: /<link[^>]+rel=["']icon["'][^>]+href=["']([^"']+)["']/i, priority: 3 },
      { regex: /<link[^>]+href=["']([^"']+)["'][^>]+rel=["']icon["']/i, priority: 3 },
      { regex: /<link[^>]+rel=["']shortcut icon["'][^>]+href=["']([^"']+)["']/i, priority: 4 },
    ];

    for (const { regex } of patterns) {
      const match = html.match(regex);
      if (match?.[1]) {
        return this.resolveUrl(match[1], baseUrl);
      }
    }

    // Final fallback: /favicon.ico
    return `${baseUrl}/favicon.ico`;
  }

  private resolveUrl(src: string, baseUrl: string): string {
    if (src.startsWith('http://') || src.startsWith('https://')) {
      return src;
    }
    if (src.startsWith('//')) {
      return `https:${src}`;
    }
    if (src.startsWith('/')) {
      return `${baseUrl}${src}`;
    }
    return `${baseUrl}/${src}`;
  }

  private async downloadAndStoreLogo(logoSrc: string, domain: string): Promise<string | null> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(logoSrc, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'TijarahConnect/1.0 (Website Meta Fetcher)',
        },
        redirect: 'follow',
      });

      clearTimeout(timeout);

      if (!response.ok) return null;

      const contentType = response.headers.get('content-type') || '';
      // Only allow image content types
      if (!contentType.startsWith('image/')) return null;

      const buffer = Buffer.from(await response.arrayBuffer());

      // Limit to 2MB
      if (buffer.length > 2 * 1024 * 1024) return null;

      // Determine extension from content type
      const extMap: Record<string, string> = {
        'image/png': 'png',
        'image/jpeg': 'jpg',
        'image/jpg': 'jpg',
        'image/gif': 'gif',
        'image/webp': 'webp',
        'image/svg+xml': 'svg',
        'image/x-icon': 'ico',
        'image/vnd.microsoft.icon': 'ico',
      };
      const ext = extMap[contentType] || 'png';

      // Create a pseudo Multer file for StorageService
      const file = {
        originalname: `logo-${domain.replace(/[^a-z0-9]/g, '-')}.${ext}`,
        buffer,
        mimetype: contentType,
      } as Express.Multer.File;

      const { url } = await this.storageService.upload('website-logos', file);
      return url;
    } catch (err) {
      this.logger.warn(`Failed to download logo from ${logoSrc}: ${err.message}`);
      return null;
    }
  }
}
