# 🚀 FAROLS PRODUCTION DEPLOYMENT GUIDE

## Overview
This guide walks you through setting up Farols for production deployment with real OAuth integrations, optimized performance, and enterprise-grade reliability.

---

## 1. ENVIRONMENT CONFIGURATION

### Create `.env.production` file in the server directory:

```bash
# Deployment
NODE_ENV=production
PORT=3001
CLIENT_ORIGIN=https://yourdomain.com

# Database
DATABASE_URL=/data/farols.db

# JWT Configuration
JWT_SECRET=use-a-strong-random-secret-here-minimum-32-characters
JWT_REFRESH_SECRET=use-another-strong-random-secret-here
JWT_ACCESS_EXPIRES=15m

# ============================================
# GOOGLE OAUTH CONFIGURATION
# ============================================
# Steps:
# 1. Go to https://console.cloud.google.com/
# 2. Create a new project
# 3. Enable Google+ API
# 4. Create OAuth 2.0 credentials (Web application)
# 5. Add authorized redirect URIs

GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_CALLBACK_URL=https://yourdomain.com/api/v1/auth/callback/google

# ============================================
# APPLE SIGN-IN CONFIGURATION
# ============================================
# Steps:
# 1. Go to https://developer.apple.com/account/
# 2. Create an App ID and enable "Sign in with Apple"
# 3. Create a Service ID for web login
# 4. Create a private key for authentication
# 5. Download and save the private key securely

APPLE_TEAM_ID=your-10-character-team-id
APPLE_CLIENT_ID=com.yourdomain.app
APPLE_KEY_ID=your-key-id
APPLE_KEY_SECRET="-----BEGIN PRIVATE KEY-----\nYourPrivateKeyContentHere\n-----END PRIVATE KEY-----"
APPLE_CALLBACK_URL=https://yourdomain.com/api/v1/auth/callback/apple

# ============================================
# FACEBOOK LOGIN CONFIGURATION
# ============================================
# Steps:
# 1. Go to https://developers.facebook.com/apps
# 2. Create a new app (type: Consumer)
# 3. Add "Facebook Login" product
# 4. Configure OAuth Redirect URIs
# 5. Get API credentials

FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret
FACEBOOK_CALLBACK_URL=https://yourdomain.com/api/v1/auth/callback/facebook

# ============================================
# OPTIONAL: AWS S3 (for production image storage)
# ============================================
AWS_S3_REGION=us-east-1
AWS_S3_BUCKET=farols-production-uploads
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key

# ============================================
# OPTIONAL: MONITORING & LOGGING
# ============================================
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
LOG_LEVEL=info
```

---

## 2. GOOGLE OAUTH SETUP (Step-by-Step)

### Creating Google OAuth Credentials:

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Sign in with your Google account

2. **Create a new project**
   - Click "Select a Project" → "New Project"
   - Enter project name: "Farols"
   - Click "Create"

3. **Enable Google+ API**
   - Go to "APIs & Services" → "Library"
   - Search for "Google+ API"
   - Click it and press "Enable"

4. **Create OAuth 2.0 Credentials**
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth 2.0 Client ID"
   - Choose "Web application"
   - Under "Authorized redirect URIs" add:
     - `http://localhost:3001/api/v1/auth/callback/google` (development)
     - `https://yourdomain.com/api/v1/auth/callback/google` (production)
   - Click "Create"
   - Copy **Client ID** and **Client Secret**

5. **Save to .env**
   ```
   GOOGLE_CLIENT_ID=your-copied-client-id
   GOOGLE_CLIENT_SECRET=your-copied-client-secret
   ```

---

## 3. APPLE SIGN-IN SETUP (Step-by-Step)

### Configuring Apple Sign-In:

1. **Register as Apple Developer**
   - Go to: https://developer.apple.com/
   - Enroll in Apple Developer Program ($99/year)

2. **Create an App ID**
   - Go to: https://developer.apple.com/account/resources/identifiers/list
   - Click "+"
   - Select "App IDs"
   - Enter Bundle ID: `com.yourdomain.app`
   - Enable "Sign in with Apple"
   - Click "Continue" → "Register"

3. **Create a Services ID**
   - Go back to Identifiers
   - Click "+"
   - Select "Services IDs"
   - Enter identifier: `com.yourdomain.app.services`
   - Enable "Sign in with Apple"
   - In configuration, add Domain: `yourdomain.com`
   - Add Return URLs:
     - `https://yourdomain.com/api/v1/auth/callback/apple`
   - Save

4. **Create a Private Key**
   - Go to: https://developer.apple.com/account/resources/authkeys/
   - Click "+"
   - Select "Sign in with Apple"
   - Click "Configure"
   - Select your primary App ID
   - Click "Save"
   - Download the key file (save securely)
   - Copy the **Key ID** (displayed in the list)

5. **Find Your Team ID**
   - Go to: https://developer.apple.com/account/
   - Under membership, find **Team ID**

6. **Save to .env**
   ```
   APPLE_TEAM_ID=your-team-id
   APPLE_CLIENT_ID=com.yourdomain.app.services
   APPLE_KEY_ID=your-key-id
   APPLE_KEY_SECRET="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
   ```

---

## 4. FACEBOOK LOGIN SETUP (Step-by-Step)

### Configuring Facebook App:

1. **Create a Facebook App**
   - Go to: https://developers.facebook.com/apps
   - Click "Create App"
   - Choose "Consumer"
   - Fill in app details
   - Click "Create App"

2. **Add Facebook Login**
   - In the left menu, search for "Facebook Login"
   - Click "Set Up"
   - Choose "On the web"
   - Enter your website URL: `https://yourdomain.com`

3. **Configure OAuth Redirect URIs**
   - Go to Settings → Basic (in left sidebar)
   - Copy your **App ID** and **App Secret**
   - Go to Settings → Facebook Login
   - Under "Valid OAuth Redirect URIs" add:
     - `https://yourdomain.com/api/v1/auth/callback/facebook`
   - Save

4. **Save to .env**
   ```
   FACEBOOK_APP_ID=your-app-id
   FACEBOOK_APP_SECRET=your-app-secret
   ```

---

## 5. FRONTEND OAUTH CONFIGURATION

In `client/src/components/LoginModal.jsx`, the OAuth buttons are now ready. When users click a provider button, they'll be redirected to the configured OAuth provider.

### Integration Flow:
1. User clicks "Continue with Google/Apple/Facebook"
2. Frontend redirects to OAuth provider
3. User logs in and authorizes access
4. Browser redirects back to `/api/v1/auth/callback/{provider}`
5. Backend verifies token and creates/logs in user
6. User is logged in and redirected to dashboard

---

##6. DEPLOYMENT CHECKLIST

### Before Going Live:

- [ ] Update all OAuth redirect URIs to production domain
- [ ] Set strong random JWT_SECRET values
- [ ] Configure environment variables on server
- [ ] Test OAuth flows with all three providers
- [ ] Set up SSL/HTTPS certificate
- [ ] Enable CORS for production domain
- [ ] Test image uploads with compression
- [ ] Verify all API endpoints return proper error responses
- [ ] Set up database backups
- [ ] Configure monitoring and error logging (Sentry)
- [ ] Load test the application
- [ ] Enable rate limiting on sensitive endpoints
- [ ] Set up security headers (Content-Security-Policy, etc.)

### Production Environment Variables Template:

```bash
# .env.production
NODE_ENV=production
PORT=3001
CLIENT_ORIGIN=https://farols.io

JWT_SECRET=$(openssl rand -base64 32)
JWT_REFRESH_SECRET=$(openssl rand -base64 32)

GOOGLE_CLIENT_ID=xxxxx
GOOGLE_CLIENT_SECRET=xxxxx
GOOGLE_CALLBACK_URL=https://farols.io/api/v1/auth/callback/google

APPLE_TEAM_ID=xxxxx
APPLE_CLIENT_ID=xxxxx
APPLE_KEY_ID=xxxxx
APPLE_KEY_SECRET=xxxxx

FACEBOOK_APP_ID=xxxxx
FACEBOOK_APP_SECRET=xxxxx
```

---

## 7. PERFORMANCE OPTIMIZATION

### Server-Side:
- ✅ Image compression with Sharp
- ✅ Database query optimization
- ✅ Redis caching (optional)
- ✅ Rate limiting on sensitive endpoints
- ✅ Gzip compression for all responses

### Client-Side:
- ✅ Code splitting with lazy loading
- ✅ Image compression before upload
- ✅ Efficient state management
- ✅ CSS minification
- ✅ JavaScript minification and tree-shaking

### Monitoring:
- Set up error tracking (Sentry)
- Monitor database performance
- Track OAuth failure rates
- Monitor image upload times
- Set up alerting for critical errors

---

## 8. SECURITY BEST PRACTICES

1. **Never commit secrets to version control**
   - Use `.env.example` for template only
   - Add `.env` to `.gitignore`

2. **Use environment variables**
   - All sensitive data should be in `.env`
   - Never hardcode API keys

3. **Enable HTTPS**
   - Use SSL/TLS certificate
   - Redirect HTTP to HTTPS

4. **Secure cookies**
   - Set `HttpOnly` flag
   - Set `Secure` flag (HTTPS only)
   - Set `SameSite=Strict`

5. **CORS Configuration**
   - Only allow trusted origins
   - Don't use `*` in production

6. **Rate Limiting**
   - Already configured on auth endpoints
   - Consider adding to all endpoints

7. **Input Validation**
   - Validate all user inputs on server
   - Sanitize HTML content
   - Use zod for schema validation

---

## 9. TROUBLESHOOTING

### OAuth Not Working?
- Check redirect URIs match exactly
- Verify environment variables are loaded
- Check browser console for errors
- Use browser DevTools Network tab to inspect requests

### Images Not Uploading?
- Check upload directory permissions
- Verify file size limits
- Check file type whitelist
- Review server logs for errors

### API Calls Failing?
- Check CORS configuration
- Verify JWT tokens are valid
- Check backend is running
- Review error responses

---

## 10. NEXT STEPS

1. ✅ Set up OAuth credentials for all three providers
2. ✅ Create `.env.production` file with credentials
3. ✅ Deploy server to production
4. ✅ Deploy client to CDN/hosting
5. ✅ Test all OAuth flows
6. ✅ Monitor error logs
7. ✅ Set up automated backups
8. ✅ Configure monitoring and alerting

---

## Support & Documentation

- OAuth.io Documentation: https://oauth.io/docs
- Google OAuth: https://developers.google.com/identity/protocols/oauth2
- Apple Sign-In: https://developer.apple.com/sign-in-with-apple/
- Facebook Login: https://developers.facebook.com/docs/facebook-login
