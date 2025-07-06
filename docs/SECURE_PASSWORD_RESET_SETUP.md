# Secure Password Reset Setup Guide

This guide will help you deploy the secure password reset functionality that allows users to change their password by verifying their old password first.

## Overview

The new system provides a traditional password reset flow:
1. User enters their current password
2. User enters their new password
3. User confirms their new password
4. System verifies the old password before updating to the new one

## Deployment Steps

### 1. Apply Database Migration

Run the database migration to create the password verification function:

```bash
# Navigate to your project directory
cd nexus-app

# Apply the migration
npx supabase db push
```

Or manually run the SQL in your Supabase dashboard:

```sql
-- Create function to verify user password
CREATE OR REPLACE FUNCTION verify_user_password(password text)
RETURNS BOOLEAN SECURITY DEFINER AS
$$
BEGIN
  RETURN EXISTS (
    SELECT id 
    FROM auth.users 
    WHERE id = auth.uid() 
    AND encrypted_password = crypt(password::text, auth.users.encrypted_password)
  );
END;
$$ LANGUAGE plpgsql;

-- Restrict function access for security
REVOKE EXECUTE ON FUNCTION verify_user_password from anon, authenticated;
GRANT EXECUTE ON FUNCTION verify_user_password TO authenticated;
```

### 2. Deploy Edge Function

Deploy the Edge function to handle secure password updates:

```bash
# Deploy the Edge function
npx supabase functions deploy secure_update_password
```

### 3. Set Environment Variables

Ensure your environment variables are set:

```bash
# In your .env.local file
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 4. Test the Implementation

1. **Sign in to your application**
2. **Navigate to `/auth/reset-password`**
3. **Enter your current password**
4. **Enter a new password (must meet requirements)**
5. **Confirm the new password**
6. **Submit the form**

## Security Features

### Password Storage
- Passwords are stored using **bcrypt hashing with salts**
- Only hashed passwords are stored in the database
- The original password cannot be retrieved from the hash

### Password Verification
- The `verify_user_password` function uses PostgreSQL's `crypt` function
- It compares the provided password with the stored hash
- The function has restricted access (only authenticated users)

### Password Requirements
- Minimum 12 characters, maximum 25 characters
- Must contain at least one number
- Must contain at least one special character
- Passwords must match when confirming

### Edge Function Security
- Verifies user authentication before proceeding
- Uses service role key only on the server side
- Proper error handling and validation
- CORS headers configured for security

## Usage

### For Users
1. Sign in to your account
2. Go to Settings or Password Reset page
3. Enter your current password
4. Choose a new secure password
5. Confirm the new password
6. Submit to update

### For Developers
```typescript
// Use the authService method
const result = await authService.updatePasswordSecure(
  oldPassword, 
  newPassword
);

if (result.success) {
  // Password updated successfully
} else {
  // Handle error: result.error
}
```

## Troubleshooting

### Common Issues

1. **"Invalid old password" error**
   - Verify the user entered their current password correctly
   - Check if the user's account is properly authenticated

2. **"Password requirements not met"**
   - Ensure new password meets all requirements
   - Check password length and character requirements

3. **Edge function not found**
   - Verify the Edge function was deployed: `npx supabase functions list`
   - Check environment variables are set correctly

4. **Database function not found**
   - Verify the migration was applied: `npx supabase db diff`
   - Check function exists in database

### Testing Database Function

You can test the password verification function directly:

```sql
-- Test the function (replace with actual password)
SELECT verify_user_password('your-current-password');
```

## Migration from Magic Link Reset

If you want to completely replace the magic link flow:

1. Update the "Forgot Password" button in AuthPanel to redirect to `/auth/reset-password`
2. Require users to be signed in to access the reset page
3. Remove the magic link email template customization

## Security Considerations

- The Edge function uses the service role key securely on the server
- Password verification happens in the database using secure functions
- All operations require proper authentication
- Rate limiting is handled by Supabase's built-in protections

## Files Modified

- `nexus-app/supabase/migrations/021_add_password_verification_function.sql`
- `nexus-app/supabase/functions/secure_update_password/index.ts`
- `nexus-app/src/app/auth/reset-password/page.tsx`
- `nexus-app/src/lib/services/supabaseAuthService.ts`
- `nexus-app/src/components/AuthPanel.tsx`

This implementation provides a secure, user-friendly way to handle password updates while maintaining the highest security standards. 