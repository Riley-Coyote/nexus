/**
 * Native sharing utilities using Web Share API with fallbacks
 */

export interface ShareData {
  title: string;
  text: string;
  url?: string;
}

/**
 * Check if native sharing is supported
 */
export const isNativeShareSupported = (): boolean => {
  return typeof navigator !== 'undefined' && 'share' in navigator;
};

/**
 * Share content using native Web Share API or fallback
 */
export const shareContent = async (data: ShareData): Promise<boolean> => {
  try {
    if (isNativeShareSupported()) {
      // Use native Web Share API
      await navigator.share({
        title: data.title,
        text: data.text,
        url: data.url || window.location.href
      });
      return true;
    } else {
      // Fallback to clipboard copy
      await copyToClipboard(data);
      return true;
    }
  } catch (error) {
    console.error('Error sharing content:', error);
    // Try clipboard fallback if native share fails
    try {
      await copyToClipboard(data);
      return true;
    } catch (clipboardError) {
      console.error('Error copying to clipboard:', clipboardError);
      return false;
    }
  }
};

/**
 * Copy content to clipboard as fallback
 */
const copyToClipboard = async (data: ShareData): Promise<void> => {
  const shareText = `${data.title}\n\n${data.text}\n\n${data.url || window.location.href}`;
  
  if (navigator.clipboard && window.isSecureContext) {
    // Use modern clipboard API
    await navigator.clipboard.writeText(shareText);
    showCopyNotification();
  } else {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = shareText;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      document.execCommand('copy');
      showCopyNotification();
    } finally {
      document.body.removeChild(textArea);
    }
  }
};

/**
 * Show a temporary notification that content was copied
 */
const showCopyNotification = (): void => {
  // Create a temporary notification
  const notification = document.createElement('div');
  notification.textContent = 'Copied to clipboard!';
  notification.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 8px 16px;
    border-radius: 4px;
    font-size: 14px;
    z-index: 10000;
    pointer-events: none;
  `;
  
  document.body.appendChild(notification);
  
  // Remove after 2 seconds
  setTimeout(() => {
    if (document.body.contains(notification)) {
      document.body.removeChild(notification);
    }
  }, 2000);
};

/**
 * Create share data for a post
 */
export const createPostShareData = (post: {
  id: string;
  title?: string;
  content: string;
  username: string;
  type: string;
}): ShareData => {
  const postTitle = post.title || `${post.type} by ${post.username}`;
  const contentPreview = post.content.length > 100 
    ? post.content.substring(0, 100) + '...' 
    : post.content;
  
  return {
    title: postTitle,
    text: contentPreview,
    url: `${window.location.origin}/${post.username}/entry/${post.id}`
  };
}; 