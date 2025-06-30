// Mobile fixes - inject CSS dynamically
const mobileFixes = `
<link rel="stylesheet" href="css/mobile-fixes.css">
`;

// Add mobile fixes CSS to head
document.head.insertAdjacentHTML('beforeend', mobileFixes);

// Additional mobile-specific JavaScript fixes
document.addEventListener('DOMContentLoaded', () => {
    // Detect mobile device
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const isSmallScreen = window.innerWidth <= 768;
    
    if (isMobile || isSmallScreen) {
        // Add mobile class to body
        document.body.classList.add('is-mobile');
        
        // Disable WebGL on mobile for better performance
        const canvas = document.getElementById('webgl-canvas');
        if (canvas) {
            canvas.style.display = 'none';
        }
        
        // Fix iOS viewport height issue
        const setVH = () => {
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--vh', `${vh}px`);
        };
        setVH();
        window.addEventListener('resize', setVH);
        
        // Prevent double-tap zoom
        let lastTouchEnd = 0;
        document.addEventListener('touchend', (event) => {
            const now = Date.now();
            if (now - lastTouchEnd <= 300) {
                event.preventDefault();
            }
            lastTouchEnd = now;
        }, false);
        
        // Improve scroll performance
        const scrollableElements = document.querySelectorAll('.overflow-y-auto');
        scrollableElements.forEach(el => {
            el.style.webkitOverflowScrolling = 'touch';
        });
        
        // Fix mobile navigation labels
        const navItems = document.querySelectorAll('#nav-links li[data-view] span');
        const mobileNavLabels = {
            'feed': 'Feed',
            'resonance': 'Field',
            'profile': 'Profile'
        };
        
        navItems.forEach(item => {
            const view = item.parentElement.dataset.view;
            if (mobileNavLabels[view]) {
                item.textContent = mobileNavLabels[view];
            }
        });
        
        // Add mobile-specific event handlers
        const touchableElements = document.querySelectorAll('.btn, .interactive-card, .interaction-btn');
        touchableElements.forEach(el => {
            el.addEventListener('touchstart', () => {
                el.classList.add('touch-active');
            });
            el.addEventListener('touchend', () => {
                setTimeout(() => {
                    el.classList.remove('touch-active');
                }, 100);
            });
        });
    }
    
    // Mobile-specific search toggle
    const searchToggle = document.getElementById('search-toggle-btn');
    const searchContainer = document.getElementById('search-container');
    const journalToggle = document.getElementById('journal-toggle');
    
    if (searchToggle && searchContainer && isSmallScreen) {
        searchToggle.addEventListener('click', () => {
            if (!searchContainer.classList.contains('hidden')) {
                // Hide journal toggle when search is open on mobile
                if (journalToggle) {
                    journalToggle.style.display = searchContainer.classList.contains('hidden') ? 'flex' : 'none';
                }
            }
        });
    }
});

// Export mobile detection for use in other modules
export const isMobileDevice = () => {
    return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth <= 768;
};