import { Controller, Get, Header, Param, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { ShareLinksService } from './share-links.service';

/**
 * The public landing for shared links, served outside the /api prefix so the
 * URLs stay short enough to paste into a chat.
 *
 *   /b/<provider id>   a business
 *   /p/<product id>    a product or service
 *
 * On a phone with the app installed these never reach us: iOS and Android hand
 * the link to the app instead, on the strength of the two .well-known files
 * below. Everyone else gets a preview of the listing and their own store.
 */
@Public()
@Controller()
export class ShareLinksController {
  constructor(private readonly service: ShareLinksService) {}

  private origin(req: Request) {
    const host = req.get('x-forwarded-host') || req.get('host') || '';
    const proto = req.get('x-forwarded-proto') || 'https';
    return `${proto}://${host}`;
  }

  private send(res: Response, html: string, found: boolean) {
    res
      .status(found ? 200 : 404)
      .type('text/html; charset=utf-8')
      // Short, because a listing can be edited or suspended at any time.
      .set('Cache-Control', 'public, max-age=120')
      // Helmet's default policy is built for an API and forbids the inline
      // style and script this page is made of, so it is replaced with one
      // scoped to what the page actually does: show an image and leave.
      .set(
        'Content-Security-Policy',
        [
          "default-src 'none'",
          'img-src https: data:',
          "style-src 'unsafe-inline'",
          "script-src 'unsafe-inline'",
          "base-uri 'none'",
          "form-action 'none'",
          "frame-ancestors 'none'",
        ].join('; '),
      )
      .send(html);
  }

  @Get('b/:id')
  async business(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const preview = await this.service.business(id);
    if (!preview) return this.send(res, this.service.notFoundPage(), false);
    this.send(
      res,
      this.service.page(preview, `${this.origin(req)}/b/${id}`),
      true,
    );
  }

  @Get('p/:id')
  async product(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const preview = await this.service.product(id);
    if (!preview) return this.send(res, this.service.notFoundPage(), false);
    this.send(
      res,
      this.service.page(preview, `${this.origin(req)}/p/${id}`),
      true,
    );
  }

  /**
   * Apple fetches this itself, over https, with no redirects allowed. The app
   * id is the team id plus the bundle id of the shipped app.
   */
  @Get('.well-known/apple-app-site-association')
  @Header('Content-Type', 'application/json')
  @Header('Cache-Control', 'public, max-age=3600')
  appleAppSiteAssociation() {
    const appID = 'L4RFNR4BM8.com.tijarah.appstore';
    return {
      applinks: {
        apps: [],
        details: [
          {
            appID,
            paths: ['/b/*', '/p/*', '/c/*', '/shop*', '/provider-details*', '/product-details*'],
          },
        ],
      },
      webcredentials: { apps: [appID] },
    };
  }

  /** Android verifies app links against this at install time. */
  @Get('.well-known/assetlinks.json')
  @Header('Content-Type', 'application/json')
  @Header('Cache-Control', 'public, max-age=3600')
  assetLinks() {
    return [
      {
        relation: ['delegate_permission/common.handle_all_urls'],
        target: {
          namespace: 'android_app',
          package_name: 'com.pronttera.tijarah',
          sha256_cert_fingerprints: [
            '47:6E:B5:EA:E8:06:56:E5:D4:60:5B:41:EB:E9:A6:E2:5A:99:50:E6:B6:AE:38:70:63:27:25:F4:98:0A:32:A3',
            'CF:83:BB:B8:48:93:06:58:50:DA:FF:A1:B6:7D:03:C8:5C:09:52:5F:CB:89:F3:8D:7D:E0:A4:B0:3A:5E:E6:7F',
          ],
        },
      },
    ];
  }
}
