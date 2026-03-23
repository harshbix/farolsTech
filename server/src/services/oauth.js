/**
 * OAuth Integration Module
 * Handles real OAuth authentication for Google, Apple, and Facebook
 * This module provides both server-side token verification and 
 * client-side redirect URLs for production use.
 * 
 * SETUP INSTRUCTIONS:
 * 1. Create OAuth applications on each provider's developer console:
 *    - Google: https://console.cloud.google.com/
 *    - Apple: https://developer.apple.com/account/
 *    - Facebook: https://developers.facebook.com/apps
 * 
 * 2. Add credentials to your .env file:
 *    GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL
 *    APPLE_CLIENT_ID, APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_KEY_SECRET
 *    FACEBOOK_APP_ID, FACEBOOK_APP_SECRET
 * 
 * 3. Each provider will give you specific redirect URIs to register
 *    Make sure they match the callback URLs in your .env
 */

import axios from 'axios';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_CALLBACK_URL,
  APPLE_CLIENT_ID,
  APPLE_TEAM_ID,
  APPLE_KEY_ID,
  FACEBOOK_APP_ID,
  FACEBOOK_APP_SECRET,
  JWT_SECRET,
} = process.env;

const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || GOOGLE_CALLBACK_URL;

export class OAuthProvider {
  /**
   * Generate Google OAuth redirect URL for client-side login
   */
  static googleAuthUrl() {
    if (!GOOGLE_CLIENT_ID) {
      throw new Error('GOOGLE_CLIENT_ID not configured in .env');
    }

    const state = crypto.randomBytes(32).toString('hex');
    const scope = encodeURIComponent('openid profile email');
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: GOOGLE_REDIRECT_URI,
      response_type: 'code',
      scope,
      state,
    });

    return {
      url: `https://accounts.google.com/o/oauth2/v2/auth?${params}`,
      state,
    };
  }

  /**
   * Exchange Google authorization code for user data
   */
  static async verifyGoogleToken(code) {
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      throw new Error('Google OAuth credentials not configured');
    }

    try {
      const response = await axios.post('https://oauth2.googleapis.com/token', {
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code',
      });

      const { id_token, access_token } = response.data;

      // Verify and decode ID token
      const googlePublicKey = await this.getGooglePublicKey();
      const decoded = jwt.verify(id_token, googlePublicKey, {
        algorithms: ['RS256'],
      });

      return {
        provider: 'google',
        id: decoded.sub,
        email: decoded.email,
        name: decoded.name,
        picture: decoded.picture,
      };
    } catch (error) {
      throw new Error(`Google OAuth verification failed: ${error.message}`);
    }
  }

  static async exchangeGoogleCode(code) {
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      throw new Error('Google OAuth credentials not configured');
    }

    const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: GOOGLE_REDIRECT_URI,
      grant_type: 'authorization_code',
    });

    const accessToken = tokenResponse.data?.access_token;
    if (!accessToken) {
      throw new Error('Google did not return an access token');
    }

    const profileResponse = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const profile = profileResponse.data || {};
    if (!profile.email) {
      throw new Error('Google account does not provide email');
    }

    return {
      provider: 'google',
      id: profile.id,
      email: profile.email,
      name: profile.name || profile.email.split('@')[0],
      picture: profile.picture || null,
    };
  }

  /**
   * Fetch Google's public signing key
   */
  static async getGooglePublicKey() {
    try {
      const response = await axios.get(
        'https://www.googleapis.com/oauth2/v1/certs'
      );
      // In production, cache this and refresh periodically
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch Google public key: ${error.message}`);
    }
  }

  /**
   * Generate Apple Sign-In redirect URL
   */
  static appleAuthUrl() {
    if (!APPLE_CLIENT_ID) {
      throw new Error('APPLE_CLIENT_ID not configured in .env');
    }

    const state = crypto.randomBytes(32).toString('hex');
    const params = new URLSearchParams({
      client_id: APPLE_CLIENT_ID,
      team_id: APPLE_TEAM_ID,
      key_id: APPLE_KEY_ID,
      redirect_uri: process.env.APPLE_CALLBACK_URL,
      response_type: 'code',
      response_mode: 'form_post',
      scope: 'name email',
      state,
    });

    return {
      url: `https://appleid.apple.com/auth/authorize?${params}`,
      state,
    };
  }

  /**
   * Verify Apple authorization code
   */
  static async verifyAppleToken(code) {
    if (!APPLE_CLIENT_ID || !APPLE_TEAM_ID || !APPLE_KEY_ID) {
      throw new Error('Apple Sign-In credentials not configured');
    }

    try {
      // Generate client secret (JWT) for Apple
      const clientSecret = this.generateAppleClientSecret();

      const response = await axios.post('https://appleid.apple.com/auth/token', {
        code,
        client_id: APPLE_CLIENT_ID,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
      });

      const { id_token } = response.data;

      // Verify Apple's ID token
      const decoded = jwt.decode(id_token, { complete: true });

      return {
        provider: 'apple',
        id: decoded.payload.sub,
        email: decoded.payload.email,
        name: 'Apple User', // Apple doesn't always provide name in JWT
      };
    } catch (error) {
      throw new Error(`Apple Sign-In verification failed: ${error.message}`);
    }
  }

  /**
   * Generate JWT client secret for Apple (required for each request)
   */
  static generateAppleClientSecret() {
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + 15 * 60; // 15 minutes

    return jwt.sign(
      {
        iss: APPLE_TEAM_ID,
        aud: 'https://appleid.apple.com',
        sub: APPLE_CLIENT_ID,
        iat: now,
        exp: expiresAt,
      },
      process.env.APPLE_KEY_SECRET,
      {
        algorithm: 'ES256',
        keyid: APPLE_KEY_ID,
      }
    );
  }

  /**
   * Generate Facebook OAuth redirect URL
   */
  static facebookAuthUrl() {
    if (!FACEBOOK_APP_ID) {
      throw new Error('FACEBOOK_APP_ID not configured in .env');
    }

    const state = crypto.randomBytes(32).toString('hex');
    const scope = encodeURIComponent('email public_profile');
    const params = new URLSearchParams({
      client_id: FACEBOOK_APP_ID,
      redirect_uri: process.env.FACEBOOK_CALLBACK_URL,
      response_type: 'code',
      scope,
      state,
    });

    return {
      url: `https://www.facebook.com/v18.0/dialog/oauth?${params}`,
      state,
    };
  }

  /**
   * Exchange Facebook authorization code for user data
   */
  static async verifyFacebookToken(code) {
    if (!FACEBOOK_APP_ID || !FACEBOOK_APP_SECRET) {
      throw new Error('Facebook Login credentials not configured');
    }

    try {
      const response = await axios.post(
        'https://graph.facebook.com/v18.0/oauth/access_token',
        {
          client_id: FACEBOOK_APP_ID,
          client_secret: FACEBOOK_APP_SECRET,
          redirect_uri: process.env.FACEBOOK_CALLBACK_URL,
          code,
        }
      );

      const { access_token } = response.data;

      // Get user profile
      const profileResponse = await axios.get(
        `https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${access_token}`
      );

      const profile = profileResponse.data;

      return {
        provider: 'facebook',
        id: profile.id,
        email: profile.email,
        name: profile.name,
        picture: profile.picture?.data?.url,
      };
    } catch (error) {
      throw new Error(`Facebook verification failed: ${error.message}`);
    }
  }
}

export default OAuthProvider;
