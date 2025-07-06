# Profile & Banner Images Guide

This guide explains the new profile and banner image features added to NEXUS profiles.

## Features

### Banner Images
- **Display**: Full-width banner at the top of user profiles (similar to X/Twitter)
- **Dimensions**: 1500x500px recommended for optimal display
- **Fallback**: Gradient background with NEXUS logo when no banner is set

### Profile Images
- **Display**: Circular profile picture overlapping the banner
- **Usage**: Shown beside posts and throughout the UI
- **Dimensions**: Square images work best (400x400px recommended)
- **Fallback**: User initials with gradient background

## Database Changes

### Migration 022
- Added `banner_image_url` column to `users` table
- Updated profile update functions to handle both images
- Added indexed columns for performance

### Functions Added
- `update_user_profile()` - handles both profile and banner images
- `get_user_profile_images()` - optimized for displaying images
- `bulk_get_user_profile_images()` - batch fetching for feeds

## Components

### UserAvatar Component
```tsx
import UserAvatar from '@/components/UserAvatar';

<UserAvatar 
  profileImage={user.profileImage}
  avatar={user.avatar}
  username={user.username}
  name={user.name}
  size="md"
  onClick={() => handleUserClick(user.username)}
/>
```

### ProfileView Updates
- Banner image display with edit overlay
- Profile image with edit button
- Real-time preview during editing
- URL validation for image inputs

## Performance Optimizations

### User Cache Hook
```tsx
import { useUserCache } from '@/hooks/useUserCache';

const { getUserData, setUserFromFullUser } = useUserCache();
```

- 5-minute cache for user profile data
- Reduces database calls for profile images
- Automatic cache invalidation

### Image Loading
- Lazy loading for performance
- Error handling with fallbacks
- Optimized image referrer policies

## Usage in Profile Editing

1. **Edit Mode**: Click "Edit profile" button
2. **Banner Image**: Click on banner area to edit URL
3. **Profile Image**: Click edit icon on profile picture
4. **Save**: Click "Save" to update both images

## API Integration

### Update Profile
```typescript
await dataService.updateUserProfile({
  name: 'New Name',
  bio: 'New bio',
  profileImage: 'https://example.com/profile.jpg',
  bannerImage: 'https://example.com/banner.jpg'
});
```

### Database Provider
```typescript
await supabaseProvider.updateUser(userId, {
  profileImage: 'https://example.com/profile.jpg',
  bannerImage: 'https://example.com/banner.jpg'
});
```

## Best Practices

1. **Image URLs**: Use HTTPS URLs from trusted sources
2. **Dimensions**: Follow recommended dimensions for best display
3. **File Size**: Keep images under 5MB for good performance
4. **Caching**: Leverage the user cache for repeated profile displays
5. **Fallbacks**: Always provide meaningful fallbacks

## Example Image URLs
For testing, you can use these sample URLs:
- Profile: `https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face`
- Banner: `https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1500&h=500&fit=crop&crop=center` 