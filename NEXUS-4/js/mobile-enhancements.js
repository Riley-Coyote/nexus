// World-Class Mobile Enhancements
export class MobileEnhancements {
    constructor() {
        this.touchStartY = 0;
        this.pullDistance = 0;
        this.isPulling = false;
        this.init();
    }

    init() {
        if (this.isMobile()) {
            this.setupTouchInteractions();
            this.setupPullToRefresh();
            this.setupSwipeNavigation();
            this.enhanceNavigation();
            this.addHapticFeedback();
            this.optimizeScrolling();
            this.setupFloatingActionButton();
        }
    }

    isMobile() {
        return window.innerWidth <= 768 || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    }

    setupTouchInteractions() {
        // Add tap feedback to all interactive elements
        const interactiveElements = document.querySelectorAll('.btn, .glass-card, .interaction-btn, .nav-item');
        
        interactiveElements.forEach(element => {
            element.addEventListener('touchstart', (e) => {
                element.classList.add('tap-feedback');
                this.triggerHaptic('light');
            });
            
            element.addEventListener('touchend', () => {
                setTimeout(() => {
                    element.classList.remove('tap-feedback');
                }, 200);
            });
        });
    }

    setupPullToRefresh() {
        const mainContent = document.querySelector('.main-layout > main');
        if (!mainContent) return;

        const pullToRefreshEl = document.createElement('div');
        pullToRefreshEl.className = 'pull-to-refresh';
        pullToRefreshEl.innerHTML = '<i data-lucide="refresh-cw" class="w-6 h-6 animate-spin"></i>';
        mainContent.appendChild(pullToRefreshEl);

        mainContent.addEventListener('touchstart', (e) => {
            if (mainContent.scrollTop === 0) {
                this.touchStartY = e.touches[0].clientY;
                this.isPulling = true;
            }
        });

        mainContent.addEventListener('touchmove', (e) => {
            if (!this.isPulling) return;
            
            const touchY = e.touches[0].clientY;
            this.pullDistance = Math.max(0, touchY - this.touchStartY);
            
            if (this.pullDistance > 20) {
                pullToRefreshEl.classList.add('active');
                pullToRefreshEl.style.transform = `translateX(-50%) translateY(${Math.min(this.pullDistance * 0.5, 60)}px)`;
                
                if (this.pullDistance > 80) {
                    this.triggerHaptic('medium');
                }
            }
        });

        mainContent.addEventListener('touchend', () => {
            if (this.pullDistance > 80) {
                this.refreshContent();
                this.triggerHaptic('heavy');
            }
            
            pullToRefreshEl.classList.remove('active');
            pullToRefreshEl.style.transform = 'translateX(-50%) translateY(0)';
            this.isPulling = false;
            this.pullDistance = 0;
        });
    }

    setupSwipeNavigation() {
        const views = ['consciousness', 'dream', 'feed', 'resonance', 'profile'];
        let touchStartX = 0;
        let touchEndX = 0;
        
        document.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
        });
        
        document.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].clientX;
            this.handleSwipe(touchStartX, touchEndX, views);
        });
    }

    handleSwipe(startX, endX, views) {
        const swipeThreshold = 50;
        const diff = startX - endX;
        
        if (Math.abs(diff) > swipeThreshold) {
            const currentView = document.body.dataset.view;
            const currentIndex = views.indexOf(currentView);
            
            if (diff > 0 && currentIndex < views.length - 1) {
                // Swipe left - next view
                window.renderView(views[currentIndex + 1]);
                this.triggerHaptic('light');
            } else if (diff < 0 && currentIndex > 0) {
                // Swipe right - previous view
                window.renderView(views[currentIndex - 1]);
                this.triggerHaptic('light');
            }
        }
    }

    enhanceNavigation() {
        const navItems = document.querySelectorAll('#nav-links li[data-view]');
        
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                // Remove active class from all items
                navItems.forEach(nav => nav.classList.remove('active'));
                // Add active class to clicked item
                item.classList.add('active');
                this.triggerHaptic('light');
            });
        });

        // Set initial active state
        const currentView = document.body.dataset.view || 'consciousness';
        const activeItem = document.querySelector(`#nav-links li[data-view="${currentView}"]`);
        if (activeItem) {
            activeItem.classList.add('active');
        }
    }

    addHapticFeedback() {
        // Check if the Haptic API is available
        this.hapticEnabled = 'vibrate' in navigator;
    }

    triggerHaptic(style = 'light') {
        if (!this.hapticEnabled) return;
        
        const patterns = {
            light: [10],
            medium: [20],
            heavy: [30],
            success: [10, 20, 10],
            warning: [20, 10, 20, 10],
            error: [50, 100, 50]
        };
        
        navigator.vibrate(patterns[style] || patterns.light);
    }

    optimizeScrolling() {
        const scrollContainers = document.querySelectorAll('.overflow-y-auto, main');
        
        scrollContainers.forEach(container => {
            container.classList.add('momentum-scrolling');
            
            // Add scroll indicators
            let scrollTimeout;
            container.addEventListener('scroll', () => {
                container.classList.add('is-scrolling');
                clearTimeout(scrollTimeout);
                scrollTimeout = setTimeout(() => {
                    container.classList.remove('is-scrolling');
                }, 150);
            });
        });
    }

    refreshContent() {
        // Simulate content refresh
        const mainContent = document.querySelector('.main-layout > main');
        mainContent.style.opacity = '0.5';
        
        setTimeout(() => {
            mainContent.style.opacity = '1';
            // Here you would actually refresh the content
            console.log('Content refreshed');
        }, 1000);
    }

    setupFloatingActionButton() {
        const fab = document.createElement('button');
        fab.className = 'fab';
        fab.innerHTML = '<i data-lucide="plus" class="w-6 h-6"></i>';
        fab.setAttribute('aria-label', 'Create new entry');
        
        document.body.appendChild(fab);
        
        fab.addEventListener('click', () => {
            this.triggerHaptic('medium');
            // Focus on the composer
            const composer = document.querySelector('.entry-composer-textarea');
            if (composer) {
                composer.focus();
                composer.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        });

        // Hide FAB when scrolling down, show when scrolling up
        let lastScrollTop = 0;
        const scrollContainer = document.querySelector('.main-layout > main');
        
        if (scrollContainer) {
            scrollContainer.addEventListener('scroll', () => {
                const scrollTop = scrollContainer.scrollTop;
                
                if (scrollTop > lastScrollTop && scrollTop > 100) {
                    // Scrolling down
                    fab.style.transform = 'translateY(120px)';
                } else {
                    // Scrolling up
                    fab.style.transform = 'translateY(0)';
                }
                
                lastScrollTop = scrollTop;
            });
        }

        // Update Lucide icons
        setTimeout(() => {
            if (window.lucide) {
                window.lucide.createIcons();
            }
        }, 100);
    }

    setupCardSwipeActions() {
        const cards = document.querySelectorAll('.glass-card');
        
        cards.forEach(card => {
            let startX = 0;
            let currentX = 0;
            let cardLeft = 0;
            
            card.addEventListener('touchstart', (e) => {
                startX = e.touches[0].clientX;
                cardLeft = 0;
            });
            
            card.addEventListener('touchmove', (e) => {
                currentX = e.touches[0].clientX;
                const diffX = currentX - startX;
                
                // Only allow left swipe
                if (diffX < 0) {
                    cardLeft = Math.max(diffX, -100);
                    card.style.transform = `translateX(${cardLeft}px)`;
                    
                    // Show action buttons
                    if (Math.abs(cardLeft) > 50) {
                        card.classList.add('swipe-active');
                    }
                }
            });
            
            card.addEventListener('touchend', () => {
                if (Math.abs(cardLeft) > 80) {
                    // Trigger action
                    this.triggerHaptic('medium');
                    card.style.transform = 'translateX(0)';
                    // Here you would handle the swipe action
                } else {
                    card.style.transform = 'translateX(0)';
                }
                
                card.classList.remove('swipe-active');
            });
        });
    }
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    window.mobileEnhancements = new MobileEnhancements();
});

// Re-initialize when view changes
const originalRenderView = window.renderView;
window.renderView = function(view) {
    originalRenderView(view);
    setTimeout(() => {
        if (window.mobileEnhancements) {
            window.mobileEnhancements.setupTouchInteractions();
            window.mobileEnhancements.setupCardSwipeActions();
            window.mobileEnhancements.enhanceNavigation();
        }
    }, 100);
};