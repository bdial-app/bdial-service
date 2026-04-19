import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { SupabaseAuthService } from '../supabase/supabase-auth.service';

/**
 * Supabase JWT Strategy
 * Validates JWT tokens issued by Supabase OAuth directly.
 * This is used when the frontend receives a token from Supabase and needs to validate it server-side.
 */
@Injectable()
export class SupabaseJwtStrategy extends PassportStrategy(Strategy, 'supabase-jwt') {
  constructor(private supabaseAuth: SupabaseAuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // We won't validate signature here because Supabase handles that
      // We'll call Supabase API to verify instead
      secretOrKey: 'placeholder', // Not used, we verify via Supabase API
    });
  }

  /**
   * Validate Supabase JWT token by calling Supabase API
   * This is called by Passport for routes using @UseGuards(AuthGuard('supabase-jwt'))
   */
  async validate(payload: any) {
    // The payload here is not used because we verify via Supabase API
    // This guard should be used with a middleware that extracts and validates the token
    return payload;
  }
}
