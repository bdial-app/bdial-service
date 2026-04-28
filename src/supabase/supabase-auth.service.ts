import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseAuthService {
  private supabase?: SupabaseClient;
  private supabaseAdmin?: SupabaseClient; // Separate client for admin operations
  private readonly logger = new Logger(SupabaseAuthService.name);

  constructor(private readonly config: ConfigService) {
    const supabaseUrl = this.config.get<string>('SUPABASE_URL', '');
    const supabaseAnonKey = this.config.get<string>('SUPABASE_ANON_KEY', '');
    const supabaseServiceRoleKey = this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY', '');

    if (!supabaseUrl || !supabaseAnonKey) {
      this.logger.warn(
        'Supabase credentials not configured. Auth will use local OTP only.',
      );
      return; // Exit early to avoid initializing with empty strings
    }

    // Regular client for user operations
    this.supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });

    // Admin client for admin operations (user creation, metadata updates, etc.)
    this.supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey || supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });

    if (!supabaseServiceRoleKey) {
      this.logger.warn(
        'SUPABASE_SERVICE_ROLE_KEY not configured. Using SUPABASE_ANON_KEY for admin operations. This may fail!',
      );
    }
  }

  /**
   * Create or update a user in Supabase Auth
   * Returns Supabase user ID
   */
  async createOrUpdateUser(
    email: string,
    phone?: string,
    metadata?: Record<string, any>,
  ): Promise<string | null> {
    try {
      if (!this.supabaseAdmin) {
        this.logger.warn('createOrUpdateUser: Supabase admin client not configured');
        return null;
      }

      if (!email && !phone) {
        throw new Error('Either email or phone is required');
      }

      // Generate a random password (will be overridden by SSO or OTP)
      const tempPassword = Math.random().toString(36).slice(-16);

      // Use admin client for user creation
      const { data, error } = await this.supabaseAdmin.auth.admin.createUser({
        email: email || `${phone}@tijarahconnect.local`,
        phone: phone,
        password: tempPassword,
        email_confirm: !email, // Auto-confirm if email not provided
        phone_confirm: !phone, // Auto-confirm if phone not provided
        user_metadata: metadata || {},
      });

      if (error) {
        this.logger.debug(`User creation error (may already exist): ${error.message}`);
        // Try to get existing user by email
        if (email) {
          const { data: existingData } = await this.supabaseAdmin.auth.admin.listUsers();
          const existingUser = existingData?.users.find(u => u.email === email);
          if (existingUser) {
            this.logger.debug(`Found existing user: ${existingUser.id}`);
            return existingUser.id;
          }
        }
        return null;
      }

      this.logger.debug(`User created in Supabase: ${data?.user?.id}`);
      return data?.user?.id || null;
    } catch (error) {
      this.logger.error('Error creating/updating Supabase user:', error);
      return null;
    }
  }

  /**
   * Get full user profile including metadata
   */
  async getUserProfile(userId: string) {
    try {
      if (!this.supabaseAdmin) {
        this.logger.warn('getUserProfile: Supabase admin client not configured');
        return null;
      }
      // Use admin client for user profile retrieval
      const { data, error } = await this.supabaseAdmin.auth.admin.getUserById(userId);

      if (error) {
        this.logger.error(`Error getting user profile ${userId}:`, error);
        return null;
      }

      const user = data?.user;
      if (!user) {
        return null;
      }

      return {
        id: user.id,
        email: user.email,
        phone: user.phone,
        email_confirmed_at: user.email_confirmed_at,
        phone_confirmed_at: user.phone_confirmed_at,
        user_metadata: user.user_metadata,
        app_metadata: user.app_metadata,
        created_at: user.created_at,
        updated_at: user.updated_at,
      };
    } catch (error) {
      this.logger.error('Error in getUserProfile:', error);
      return null;
    }
  }

  /**
   * Get OAuth URL for Google Sign-In
   */
  async getGoogleOAuthUrl(redirectUrl: string): Promise<string | null> {
    try {
      if (!this.supabase) {
        this.logger.warn('getGoogleOAuthUrl: Supabase client not configured');
        return null;
      }
      const { data, error } = await this.supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
        },
      });

      if (error) {
        this.logger.error('Error getting Google OAuth URL:', error);
        return null;
      }

      return data?.url || null;
    } catch (error) {
      this.logger.error('Error in getGoogleOAuthUrl:', error);
      return null;
    }
  }

  /**
   * Verify OAuth callback code
   */
  async verifyOAuthCallback(code: string): Promise<{
    user: { id: string; email?: string; phone?: string; user_metadata?: any } | null;
    error?: string;
  }> {
    try {
      if (!this.supabase) {
        return { user: null, error: 'Supabase client not configured' };
      }
      const { data, error } = await this.supabase.auth.exchangeCodeForSession(code);

      if (error) {
        this.logger.error('Error exchanging OAuth code:', error);
        return { user: null, error: error.message };
      }

      const user = data?.user;
      if (!user) {
        return { user: null, error: 'No user returned from OAuth' };
      }

      return {
        user: {
          id: user.id,
          email: user.email,
          phone: user.phone,
          user_metadata: user.user_metadata,
        },
      };
    } catch (error) {
      this.logger.error('Error verifying OAuth callback:', error);
      return { user: null, error: String(error) };
    }
  }

  /**
   * Get user info from Supabase by ID
   */
  async getUser(userId: string) {
    try {
      if (!this.supabaseAdmin) {
        this.logger.warn('getUser: Supabase admin client not configured');
        return null;
      }
      const { data, error } = await this.supabaseAdmin.auth.admin.getUserById(userId);

      if (error) {
        this.logger.error(`Error getting user ${userId}:`, error);
        return null;
      }

      return data?.user || null;
    } catch (error) {
      this.logger.error('Error in getUser:', error);
      return null;
    }
  }

  /**
   * Update user metadata in Supabase
   */
  async updateUserMetadata(
    userId: string,
    metadata: Record<string, any>,
  ): Promise<boolean> {
    try {
      if (!this.supabaseAdmin) {
        this.logger.warn('updateUserMetadata: Supabase admin client not configured');
        return false;
      }
      // Use admin client for metadata updates
      const { error } = await this.supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: metadata,
      });

      if (error) {
        this.logger.error(`Error updating user ${userId} metadata:`, error);
        return false;
      }

      this.logger.debug(`User metadata updated: ${userId}`);
      return true;
    } catch (error) {
      this.logger.error('Error in updateUserMetadata:', error);
      return false;
    }
  }

  /**
   * Verify Supabase JWT token
   * Used to validate OAuth tokens from Supabase
   */
  async verifySupabaseToken(token: string): Promise<{
    user: { id: string; email?: string; phone?: string } | null;
    error?: string;
  }> {
    try {
      if (!this.supabase) {
        return { user: null, error: 'Supabase client not configured' };
      }
      const { data, error } = await this.supabase.auth.getUser(token);

      if (error) {
        this.logger.debug(`Error verifying Supabase token: ${error.message}`);
        return { user: null, error: error.message };
      }

      const user = data?.user;
      if (!user) {
        return { user: null, error: 'No user in token' };
      }

      return {
        user: {
          id: user.id,
          email: user.email,
          phone: user.phone,
        },
      };
    } catch (error) {
      this.logger.debug('Error in verifySupabaseToken:', error);
      return { user: null, error: String(error) };
    }
  }

  /**
   * Handle OAuth callback from Supabase
   * Called when user is redirected back from Supabase OAuth provider
   * The `code` is exchanged for a session
   */
  async handleOAuthCallback(code: string): Promise<{
    session: { access_token: string; user: any } | null;
    error?: string;
  }> {
    try {
      if (!this.supabase) {
        return { session: null, error: 'Supabase client not configured' };
      }
      const { data, error } = await this.supabase.auth.exchangeCodeForSession(code);

      if (error) {
        this.logger.error('Error handling OAuth callback:', error);
        return { session: null, error: error.message };
      }

      if (!data.session) {
        return { session: null, error: 'No session returned from OAuth' };
      }

      this.logger.debug(`OAuth session created for user: ${data.session.user.id}`);

      return {
        session: {
          access_token: data.session.access_token,
          user: {
            id: data.session.user.id,
            email: data.session.user.email,
            phone: data.session.user.phone,
            user_metadata: data.session.user.user_metadata,
            app_metadata: data.session.user.app_metadata,
          },
        },
      };
    } catch (error) {
      this.logger.error('Error in handleOAuthCallback:', error);
      return { session: null, error: String(error) };
    }
  }

  /**
   * Validate and extract user from Supabase OAuth response
   * Used after OAuth callback to get user info
   */
  async validateOAuthUser(supabaseUserId: string): Promise<{
    user: any | null;
    error?: string;
  }> {
    try {
      const user = await this.getUser(supabaseUserId);

      if (!user) {
        return { user: null, error: 'User not found in Supabase' };
      }

      return {
        user: {
          id: user.id,
          email: user.email,
          phone: user.phone,
          user_metadata: user.user_metadata,
          identities: user.identities,
          ssoProvider: user.identities?.[0]?.provider || 'unknown',
        },
      };
    } catch (error) {
      this.logger.error('Error validating OAuth user:', error);
      return { user: null, error: String(error) };
    }
  }

  /**
   * Ban a Supabase user (prevents all SSO/OTP login)
   * Used when pausing an account
   */
  async banUser(supabaseUserId: string): Promise<boolean> {
    try {
      if (!this.supabaseAdmin) {
        this.logger.warn('banUser: Supabase admin client not configured');
        return false;
      }
      const { error } = await this.supabaseAdmin.auth.admin.updateUserById(supabaseUserId, {
        ban_duration: '876600h', // ~100 years — effectively permanent
      });
      if (error) {
        this.logger.error(`Error banning Supabase user ${supabaseUserId}:`, error);
        return false;
      }
      this.logger.debug(`Supabase user banned: ${supabaseUserId}`);
      return true;
    } catch (error) {
      this.logger.error('Error in banUser:', error);
      return false;
    }
  }

  /**
   * Unban a Supabase user (restores SSO/OTP login)
   * Used when resuming a paused account
   */
  async unbanUser(supabaseUserId: string): Promise<boolean> {
    try {
      if (!this.supabaseAdmin) {
        this.logger.warn('unbanUser: Supabase admin client not configured');
        return false;
      }
      const { error } = await this.supabaseAdmin.auth.admin.updateUserById(supabaseUserId, {
        ban_duration: 'none',
      });
      if (error) {
        this.logger.error(`Error unbanning Supabase user ${supabaseUserId}:`, error);
        return false;
      }
      this.logger.debug(`Supabase user unbanned: ${supabaseUserId}`);
      return true;
    } catch (error) {
      this.logger.error('Error in unbanUser:', error);
      return false;
    }
  }

  /**
   * Permanently delete a Supabase Auth user
   * Used when a user deletes their account — prevents SSO ghost re-login
   */
  async deleteSupabaseUser(supabaseUserId: string): Promise<boolean> {
    try {
      if (!this.supabaseAdmin) {
        this.logger.warn('deleteSupabaseUser: Supabase admin client not configured');
        return false;
      }
      const { error } = await this.supabaseAdmin.auth.admin.deleteUser(supabaseUserId);
      if (error) {
        this.logger.error(`Error deleting Supabase user ${supabaseUserId}:`, error);
        return false;
      }
      this.logger.debug(`Supabase user deleted: ${supabaseUserId}`);
      return true;
    } catch (error) {
      this.logger.error('Error in deleteSupabaseUser:', error);
      return false;
    }
  }

  /**
   * Get OAuth configuration for frontend
   * Returns redirect URL and other OAuth metadata
   */
  getOAuthConfig() {
    return {
      supabaseUrl: this.config.get<string>('SUPABASE_URL'),
      supabaseAnonKey: this.config.get<string>('SUPABASE_ANON_KEY'),
      oauthRedirectUrl: this.config.get<string>('SUPABASE_OAUTH_REDIRECT_URL'),
      oauthProviders: ['google', 'github'], // Configured providers
    };
  }

  /** Returns true when Supabase credentials are configured */
  isConfigured(): boolean {
    return !!this.supabase;
  }

  /**
   * Send a phone OTP via Supabase (uses the configured SMS provider)
   */
  async sendPhoneOtp(phone: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.supabase) {
        return { success: false, error: 'Supabase client not configured' };
      }
      const { error } = await this.supabase.auth.signInWithOtp({ phone });
      if (error) {
        this.logger.error(`sendPhoneOtp error for ${phone}: ${error.message}`);
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err) {
      this.logger.error('Error in sendPhoneOtp:', err);
      return { success: false, error: String(err) };
    }
  }

  /**
   * Verify a phone OTP via Supabase
   */
  async verifyPhoneOtp(
    phone: string,
    token: string,
  ): Promise<{ valid: boolean; supabaseUserId?: string; error?: string }> {
    try {
      if (!this.supabase) {
        return { valid: false, error: 'Supabase client not configured' };
      }
      const { data, error } = await this.supabase.auth.verifyOtp({
        phone,
        token,
        type: 'sms',
      });
      if (error) {
        this.logger.error(`verifyPhoneOtp error for ${phone}: ${error.message}`);
        return { valid: false, error: error.message };
      }
      return { valid: true, supabaseUserId: data?.user?.id };
    } catch (err) {
      this.logger.error('Error in verifyPhoneOtp:', err);
      return { valid: false, error: String(err) };
    }
  }
}
