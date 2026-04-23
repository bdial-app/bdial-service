import { Controller, Post, Body, Get, UseGuards, Req, HttpCode } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InviteService } from './invite.service';

@Controller('invite')
export class InviteController {
  constructor(private readonly inviteService: InviteService) {}

  @Post('track')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(204)
  async trackInvite(@Req() req: any, @Body('method') method: string) {
    await this.inviteService.trackInvite(req.user.id, method || 'native_share');
  }

  @Get('count')
  @UseGuards(AuthGuard('jwt'))
  async getCount(@Req() req: any) {
    const count = await this.inviteService.getMyInviteCount(req.user.id);
    return { count };
  }
}
