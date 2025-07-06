# Hybrid Password Reset Setup Guide

This guide explains the new hybrid password reset system that provides both traditional and forgot password flows.

## Overview

### Two Password Reset Flows:

1. **Traditional Flow (For logged-in users)**
   - Accessed via Profile Modal → Account Settings → Change Password
   - Requires: Current password + New password + Confirm password
   - Uses secure server-side verification

2. **Forgot Password Flow (For users who forgot their password)**
   - Accessed via "Forgot Password" link in login form
   - Sends magic link to email
   - Magic link opens reset page with just: New password + Confirm password
   - User is auto-authenticated via magic link

## Implementation Details

### Files Created/Modified:

1. **ProfileModal Component** (`src/components/ProfileModal.tsx`)
   - Two-tab modal: Profile + Account Settings
   - Traditional password change with old password verification
   - Beautiful UI matching your app design

2. **Updated Reset Password Page** (`src/app/auth/reset-password/page.tsx`)
   - Detects magic link flow vs traditional flow
   - Conditional UI based on flow type
   - Handles both authentication methods

3. **Updated AuthService** (`src/lib/services/supabaseAuthService.ts`)
   - Magic link redirects to reset page with `type=recovery` parameter
   - Maintains both secure update methods

## How to Integrate

### Step 1: Add ProfileModal to Your Main Layout

Add the ProfileModal to your main layout or header component:

```tsx
// In your Header/Layout component
import ProfileModal from '@/components/ProfileModal';

export default function Header() {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const user = authService.getCurrentUser();

  return (
    <header>
      {/* Your existing header content */}
      
      {/* Profile Button */}
      {user && (
        <button
          onClick={() => setIsProfileOpen(true)}
          className="flex items-center space-x-2 p-2 rounded-lg hover:bg-white/5"
        >
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <span className="text-sm font-bold">
              {user.avatar || user.name?.charAt(0)?.toUpperCase() || 'U'}
            </span>
          </div>
          <span className="text-sm">{user.name}</span>
        </button>
      )}

      {/* Profile Modal */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        user={user}
      />
    </header>
  );
}
```

### Step 2: Update Supabase Redirect URLs

In your Supabase dashboard:
1. Go to Authentication → URL Configuration
2. Add redirect URL: `https://yourdomain.com/auth/reset-password`

## User Experience Flows

### Traditional Password Change (Logged-in Users)

1. **User clicks profile button** → Profile modal opens
2. **Clicks "Account Settings" tab** → Shows account options
3. **Clicks "Change Password"** → Shows password form
4. **Enters current + new + confirm passwords** → Validates and updates
5. **Success** → Password updated, form closes

### Forgot Password Flow (Not logged in)

1. **User clicks "Forgot your password?"** → Shows email input
2. **Enters email and submits** → Receives magic link email
3. **Clicks magic link** → Opens reset page (auto-authenticated)
4. **Enters new + confirm passwords** → Updates password and logs in
5. **Success** → Redirected to main app

## Security Features

### Traditional Flow Security:
- ✅ **Current password verification** (server-side)
- ✅ **Bcrypt password storage** with salts
- ✅ **Authentication required** before access
- ✅ **Rate limiting** by Supabase

### Magic Link Flow Security:
- ✅ **Time-limited magic links** (Supabase default: 1 hour)
- ✅ **Single-use magic links** (cannot be reused)
- ✅ **Email verification required** (must have access to email)
- ✅ **Auto-authentication** via Supabase session

## Configuration Options

### Customize Magic Link Email

In Supabase Dashboard → Authentication → Email Templates → Reset Password:

```html
<div style="font-family: Arial, sans-serif;">
  <h2>Reset Your Password</h2>
  <p>Click the link below to reset your password:</p>
  <a href="{{ .ConfirmationURL }}" style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
    Reset Password
  </a>
  <p>This link will expire in 1 hour.</p>
</div>
```

### Customize Password Requirements

Update the `validatePassword` function in both files:

```typescript
const validatePassword = (password: string) => {
  const errors: string[] = [];
  
  if (password.length < 12) errors.push('Must be at least 12 characters');
  if (!/(?=.*[0-9])/.test(password)) errors.push('Must contain a number');
  if (!/(?=.*[!@#$%^&*])/.test(password)) errors.push('Must contain special character');
  
  return { isValid: errors.length === 0, errors };
};
```

## Testing the Flows

### Test Traditional Flow:
1. Sign in to your app
2. Click profile button
3. Go to Account Settings → Change Password
4. Enter current password + new password
5. Verify it works

### Test Forgot Password Flow:
1. Sign out of your app
2. Click "Forgot your password?"
3. Enter your email
4. Check email for magic link
5. Click link → should open reset page
6. Enter new password → should log you in

## Troubleshooting

### Common Issues:

1. **Magic link opens auth/callback instead of reset page**
   - Check that `redirectTo` is set correctly in `resetPassword` method
   - Verify redirect URL is configured in Supabase dashboard

2. **Profile modal not opening**
   - Check that ProfileModal is imported and rendered
   - Verify user object is being passed correctly

3. **Traditional password change fails**
   - Ensure database migration was applied
   - Check Edge function was deployed
   - Verify user is authenticated

4. **Magic link password reset fails**
   - Check if user has valid session after clicking link
   - Verify URL contains proper parameters

## Deployment Checklist

- [ ] Apply database migration for password verification function
- [ ] Deploy `secure_update_password` Edge function  
- [ ] Add ProfileModal to your main layout/header
- [ ] Update Supabase redirect URLs
- [ ] Test both flows in production
- [ ] Customize email templates (optional)

## Benefits of This Approach

### Security:
- **Traditional flow**: Maximum security with current password verification
- **Magic link flow**: Secure account recovery for forgotten passwords
- **No password exposure**: All validation happens server-side

### User Experience:
- **Convenient**: Easy password changes for logged-in users
- **Recovery**: Safe account recovery for forgotten passwords
- **Familiar**: Both flows follow common UX patterns

### Flexibility:
- **Two options**: Users can choose their preferred method
- **Contextual**: Right flow for the right situation
- **Extensible**: Easy to add more security features (2FA, etc.)

This hybrid approach gives you the best of both worlds: maximum security for routine password changes and reliable account recovery for emergency situations. 