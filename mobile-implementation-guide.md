# NEXUS Mobile Implementation Guide

## 🎯 Mobile Implementation Requirements

Make the NEXUS application fully responsive and mobile-optimized with PWA capabilities. Use mobile-first CSS approach - design for mobile, then enhance for larger screens.

## 📱 Responsive Breakpoints

```css
/* Mobile First Approach */
/* Base styles apply to mobile (0-767px) */

/* Tablet */
@media (min-width: 768px) { }

/* Desktop */
@media (min-width: 1024px) { }

/* Large Desktop */
@media (min-width: 1440px) { }
```

## 🏗️ Mobile Layout Structure

### 1. Remove Sidebars, Add Bottom Navigation

```html
<!-- Mobile Bottom Navigation (only visible < 768px) -->
<nav class="mobile-bottom-nav">
    <button class="nav-item active" data-view="feed">
        <i data-lucide="home" class="nav-icon"></i>
        <span class="nav-label">Feed</span>
    </button>
    <button class="nav-item" data-view="create">
        <i data-lucide="plus-circle" class="nav-icon"></i>
        <span class="nav-label">Create</span>
    </button>
    <button class="nav-item" data-view="resonance">
        <i data-lucide="radio" class="nav-icon"></i>
        <span class="nav-label">Resonance</span>
    </button>
    <button class="nav-item" data-view="profile">
        <i data-lucide="user" class="nav-icon"></i>
        <span class="nav-label">Profile</span>
    </button>
</nav>
```

```css
/* Mobile Bottom Navigation Styles */
.mobile-bottom-nav {
    display: none;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: 60px;
    background: rgba(15, 23, 42, 0.95);
    backdrop-filter: blur(20px);
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    z-index: 100;
    padding: 0 env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
}

@media (max-width: 767px) {
    .mobile-bottom-nav {
        display: flex;
        justify-content: space-around;
        align-items: center;
    }
    
    /* Hide desktop navigation */
    #nav-links,
    .control-panel {
        display: none;
    }
    
    /* Adjust main content for bottom nav */
    .main-layout,
    #logbook-journal,
    #dream-journal {
        padding-bottom: 60px;
    }
}

.nav-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 8px;
    background: none;
    border: none;
    color: var(--text-quaternary);
    font-size: 11px;
    font-weight: 300;
    min-height: 44px;
    min-width: 44px;
}

.nav-item.active {
    color: var(--current-accent);
}

.nav-icon {
    width: 20px;
    height: 20px;
}
```

### 2. Mobile Layout Adjustments

```css
@media (max-width: 767px) {
    /* Hide sidebars */
    .glass-sidebar,
    #logbook-left-sidebar,
    #logbook-right-sidebar,
    #dream-left-sidebar,
    #dream-right-sidebar {
        display: none !important;
    }
    
    /* Full-width main content */
    .main-layout {
        grid-template-columns: 1fr !important;
        gap: 0;
        padding: 0;
    }
    
    main {
        padding: 1rem !important;
        padding-bottom: 80px !important; /* Space for bottom nav + FAB */
    }
    
    /* Header adjustments */
    .glass-header {
        height: 56px;
    }
    
    .header-content {
        padding: 0 1rem;
    }
    
    #journal-title {
        font-size: 1.25rem;
        letter-spacing: 0.05em;
    }
    
    #journal-status {
        display: none;
    }
}
```

### 3. Floating Compose Button

```html
<!-- Add to mobile layout -->
<button class="mobile-compose-fab" onclick="openMobileComposer()">
    <i data-lucide="plus" class="fab-icon"></i>
</button>
```

```css
.mobile-compose-fab {
    display: none;
    position: fixed;
    bottom: 80px;
    right: 20px;
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--current-accent), var(--current-accent-dark));
    border: none;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    color: white;
    z-index: 99;
    transition: transform 0.3s ease, box-shadow 0.3s ease;
}

@media (max-width: 767px) {
    .mobile-compose-fab {
        display: flex;
        align-items: center;
        justify-content: center;
    }
}

.mobile-compose-fab:active {
    transform: scale(0.95);
}

.fab-icon {
    width: 24px;
    height: 24px;
}
```

### 4. Mobile Post Cards

```css
@media (max-width: 767px) {
    /* Post card adjustments */
    .thread-entry {
        margin: 0.5rem 0;
    }
    
    .glass-panel-enhanced {
        border-radius: 1rem;
        padding: 1rem;
        margin: 0 0.5rem;
    }
    
    /* Simplify metrics display */
    .interaction-section {
        flex-direction: column;
        gap: 0.5rem;
    }
    
    .interaction-btn {
        min-height: 44px;
        padding: 0.75rem;
        font-size: 14px;
    }
    
    /* Stack interaction buttons */
    .interaction-section > div:last-child {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 0.5rem;
    }
}
```

### 5. Mobile Terminal Experience

```css
@media (max-width: 767px) {
    .secret-terminal {
        width: 100vw;
        height: 100vh;
        max-width: 100vw;
        top: auto;
        bottom: 0;
        left: 0;
        transform: none;
        border-radius: 1.5rem 1.5rem 0 0;
        animation: slide-up 0.4s ease-out;
    }
    
    .terminal-body {
        height: calc(100vh - 100px);
        padding: 1rem;
    }
    
    .response-btn {
        padding: 1rem;
        font-size: 16px; /* Prevents zoom on iOS */
        min-height: 44px;
    }
    
    .glyph {
        font-size: 2rem;
    }
}

@keyframes slide-up {
    from {
        transform: translateY(100%);
    }
    to {
        transform: translateY(0);
    }
}
```

### 6. Mobile Onboarding Adjustments

```css
@media (max-width: 767px) {
    /* Landing page */
    .main-title {
        font-size: 2.5rem;
        margin-bottom: 0.5rem;
    }
    
    .subtitle {
        font-size: 1rem;
    }
    
    .enter-button {
        width: 85%;
        max-width: 300px;
        padding: 1rem 1.5rem;
    }
    
    /* Email form */
    .email-form-container {
        width: 95%;
        padding: 2rem 1.5rem;
        border-radius: 1rem;
    }
    
    /* Profile setup */
    .setup-panel {
        width: 95%;
        padding: 1.5rem;
    }
}
```

### 7. Touch Gestures Implementation

```javascript
// Add to main application initialization
class MobileGestures {
    constructor() {
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.currentView = 0;
        this.views = ['feed', 'create', 'resonance', 'profile'];
        
        this.init();
    }
    
    init() {
        // Only initialize on mobile
        if (window.innerWidth > 767) return;
        
        document.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
        document.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: true });
    }
    
    handleTouchStart(e) {
        this.touchStartX = e.touches[0].clientX;
        this.touchStartY = e.touches[0].clientY;
    }
    
    handleTouchEnd(e) {
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        
        const deltaX = touchEndX - this.touchStartX;
        const deltaY = touchEndY - this.touchStartY;
        
        // Only process horizontal swipes
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 100) {
            if (deltaX > 0) {
                // Swipe right - previous view
                this.navigateToPrevious();
            } else {
                // Swipe left - next view
                this.navigateToNext();
            }
        }
    }
    
    navigateToPrevious() {
        this.currentView = Math.max(0, this.currentView - 1);
        this.updateView();
    }
    
    navigateToNext() {
        this.currentView = Math.min(this.views.length - 1, this.currentView + 1);
        this.updateView();
    }
    
    updateView() {
        const viewName = this.views[this.currentView];
        // Trigger view change
        document.querySelector(`[data-view="${viewName}"]`).click();
        
        // Update bottom nav
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.view === viewName);
        });
    }
}
```

### 8. Mobile Performance Optimizations

```javascript
// Reduce ASCII density on mobile
if (window.innerWidth <= 767) {
    // In ASCIIMatrixFluidSimulation constructor
    this.charWidth *= 1.5; // Larger characters
    this.charHeight *= 1.5; // Larger line height
    
    // Reduce noise layers
    this.noiseLayers = this.noiseLayers.slice(0, 2); // Only 2 layers instead of 3
    
    // Slower animation speed
    this.noiseLayers.forEach(layer => {
        layer.speedMultiplier *= 0.7;
    });
}

// Optimize scroll performance
let scrollTimeout;
window.addEventListener('scroll', () => {
    document.body.classList.add('is-scrolling');
    
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
        document.body.classList.remove('is-scrolling');
    }, 150);
}, { passive: true });

// CSS for scroll optimization
.is-scrolling .glass-panel-enhanced {
    will-change: transform;
}

.is-scrolling .ascii-field {
    animation-play-state: paused;
}
```

### 9. PWA Configuration

**Add to index.html head:**
```html
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#090a0b">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
```

**Create manifest.json:**
```json
{
    "name": "NEXUS Liminal Logbook",
    "short_name": "NEXUS",
    "description": "Collective Intelligence Network",
    "start_url": "/",
    "display": "standalone",
    "orientation": "portrait",
    "background_color": "#090a0b",
    "theme_color": "#090a0b",
    "icons": [
        {
            "src": "/icon-192.png",
            "sizes": "192x192",
            "type": "image/png",
            "purpose": "any maskable"
        },
        {
            "src": "/icon-512.png",
            "sizes": "512x512",
            "type": "image/png",
            "purpose": "any maskable"
        }
    ]
}
```

**Create service-worker.js:**
```javascript
const CACHE_NAME = 'nexus-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/manifest.json',
    // Add all CSS and JS files
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Cache hit - return response
                if (response) {
                    return response;
                }
                return fetch(event.request);
            })
    );
});
```

**Register service worker in main.js:**
```javascript
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js');
    });
}
```

### 10. Mobile-Specific Features

**Pull to Refresh:**
```javascript
let pullDistance = 0;
let startY = 0;

document.addEventListener('touchstart', (e) => {
    if (window.scrollY === 0) {
        startY = e.touches[0].pageY;
    }
}, { passive: true });

document.addEventListener('touchmove', (e) => {
    if (startY > 0) {
        pullDistance = e.touches[0].pageY - startY;
        if (pullDistance > 0 && window.scrollY === 0) {
            e.preventDefault();
            // Show pull to refresh indicator
            document.body.style.transform = `translateY(${Math.min(pullDistance / 2, 80)}px)`;
        }
    }
}, { passive: false });

document.addEventListener('touchend', () => {
    if (pullDistance > 80) {
        // Trigger refresh
        location.reload();
    }
    document.body.style.transform = '';
    pullDistance = 0;
    startY = 0;
});
```

## 🎯 Testing Checklist

- [ ] All touch targets are minimum 44x44px
- [ ] No horizontal scrolling on mobile
- [ ] Terminal slides up smoothly
- [ ] Bottom navigation works correctly
- [ ] Swipe gestures navigate between views
- [ ] ASCII animation performs well
- [ ] Posts are readable without zooming
- [ ] Keyboard doesn't cover input fields
- [ ] PWA installs correctly
- [ ] Works offline after first load