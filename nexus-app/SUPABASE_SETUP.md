# Supabase Authentication Setup Guide

This guide will help you set up Supabase authentication for the NEXUS app with email login, verification, and proper user management.

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - Name: `nexus-app` (or your preferred name)
   - Database Password: Generate a strong password (save this!)
   - Region: Choose closest to your users
5. Click "Create new project"
6. Wait for the project to be ready (~2 minutes)

## 2. Configure Environment Variables

1. In your Supabase dashboard, go to **Settings → API**
2. Copy the following values to your `.env.local` file:

```bash
# Replace these with your actual Supabase values
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# This should match your development URL
NEXT_PUBLIC_SITE_URL=http://localhost:3002
```

⚠️ **Important**: Replace `your-project-ref` and `your-anon-key-here` with your actual values from the Supabase dashboard.

## 3. Set Up Authentication Settings

### Email Templates
1. Go to **Authentication → Email Templates**
2. Configure the **Confirm signup** template:
   - Subject: `Welcome to NEXUS - Confirm Your Email`
   - Body: You can customize this, but ensure the `{{ .ConfirmationURL }}` is included

### URL Configuration
1. Go to **Authentication → URL Configuration**
2. Add your site URL: `http://localhost:3002`
3. Add redirect URLs:
   - `http://localhost:3002/auth/callback`
   - `http://localhost:3002/`

### Auth Settings
1. Go to **Authentication → Settings**
2. Configure these settings:
   - **Enable email confirmations**: ✅ ON (required for email verification)
   - **Enable phone confirmations**: ❌ OFF (we're using email-only)
   - **Secure email change**: ✅ ON (recommended)
   - **Double confirm email changes**: ✅ ON (recommended)

## 4. Set Up Database Schema

**EASY METHOD** - Copy and paste the complete schema:

1. Copy the entire contents of `supabase-schema.sql`
2. Go to your Supabase Dashboard → SQL Editor
3. Paste and execute the SQL (this includes all tables, functions, and RLS policies)

**ALTERNATIVE METHOD** - Run migrations manually:

```bash
cd nexus-app
chmod +x setup-supabase.sh
./setup-supabase.sh
```

Or connect via psql:
```bash
# Connect to your Supabase database and run:
psql "your-supabase-connection-string"

# Run the migration files in order:
\i database/migrations/001_initial_schema.sql
\i database/migrations/002_add_collaboration_features.sql
\i database/migrations/003_efficient_interactions.sql
\i database/migrations/004_add_users_table.sql
\i database/migrations/005_add_follow_system.sql
\i database/migrations/006_add_auth_profiles.sql
```

## 5. Configure Row Level Security (RLS)

**If you used the EASY METHOD above, skip this step** - RLS policies are already included in `supabase-schema.sql`.

If you ran individual migrations, you may need to verify RLS is properly configured. All necessary security policies should already be set up by the migration files.

## 6. Test the Setup

1. Start your development server:
```bash
cd nexus-app
npm run dev
```

2. Visit `http://localhost:3002`
3. You should see the auth panel
4. Try creating an account:
   - Enter an email and password
   - Check your email for verification link
   - Click the verification link
   - You should be redirected back and logged in

## 7. Email Configuration (Production)

For production, you'll want to configure a custom SMTP provider:

1. Go to **Settings → Auth** in Supabase
2. Scroll down to **SMTP Settings**
3. Configure your email provider (SendGrid, Mailgun, etc.)
4. Test the configuration

## 8. Security Best Practices

### Environment Variables
- Never commit `.env.local` to version control
- Use different Supabase projects for development/staging/production
- Rotate your database password regularly

### Database Security
- Always use RLS (Row Level Security)
- Limit API access with appropriate policies
- Monitor usage in Supabase dashboard

### Authentication
- Enable email verification (already configured)
- Consider adding password strength requirements
- Set up proper session management

## 9. Troubleshooting

### Common Issues

**"Missing Supabase environment variables"**
- Check that `.env.local` exists and has correct values
- Restart your development server after adding env vars

**"Auth callback error"**
- Verify URL configuration in Supabase dashboard
- Check that redirect URLs include `/auth/callback`

**"Email not confirmed" errors**
- Ensure email confirmations are enabled in Supabase
- Check spam folder for verification emails
- Try resending verification email from the UI

**Database connection errors**
- Verify your database is running
- Check connection string format
- Ensure database migrations have been run

### Debug Mode
In development, check the browser console for detailed error messages. The auth service includes comprehensive logging.

## 10. Next Steps

Once authentication is working:

1. **Test user flows**: Signup, login, logout, password reset
2. **Customize email templates** in Supabase dashboard
3. **Set up production environment** with proper SMTP
4. **Add social authentication** if desired (Google, GitHub, etc.)
5. **Implement proper error handling** in your UI

## Features Included

✅ **Email signup with verification**
✅ **Email signin**
✅ **Password reset functionality**
✅ **Automatic user profile creation**
✅ **Username uniqueness checking**
✅ **Duplicate email prevention**
✅ **Session management**
✅ **Proper security policies**
✅ **Real-time auth state updates**
✅ **Comprehensive error handling**

Your NEXUS app now has enterprise-grade authentication! 🚀 