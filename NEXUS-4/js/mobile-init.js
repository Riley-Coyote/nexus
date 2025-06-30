// Mobile Initialization Script
// This script adds mobile enhancements dynamically

(function() {
    // Check if mobile
    const isMobile = window.innerWidth <= 768;
    
    if (isMobile) {
        // Add mobile CSS
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'css/mobile-complete.css';
        document.head.appendChild(link);
        
        // Add mobile class to body
        document.body.classList.add('mobile-view');
        
        // Initialize mobile features after DOM loads
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initMobileFeatures);
        } else {
            initMobileFeatures();
        }
    }
    
    function initMobileFeatures() {
        // Add FAB
        const fabContainer = document.createElement('div');
        fabContainer.className = 'fab-container';
        fabContainer.innerHTML = `
            <button class="fab" aria-label="Create new entry">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
            </button>
        `;
        document.body.appendChild(fabContainer);
        
        // Add pull-to-refresh indicator
        const refreshIndicator = document.createElement('div');
        refreshIndicator.className = 'pull-refresh-indicator';
        refreshIndicator.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="23 4 23 10 17 10"></polyline>
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
            </svg>
        `;
        document.body.appendChild(refreshIndicator);
        
        // Add active states to navigation
        const navLinks = document.querySelectorAll('#nav-links li');
        navLinks.forEach(link => {
            link.addEventListener('click', function() {
                navLinks.forEach(l => l.classList.remove('active'));
                this.classList.add('active');
            });
        });
        
        // Add haptic feedback to buttons
        const buttons = document.querySelectorAll('button');
        buttons.forEach(btn => {
            btn.addEventListener('click', function() {
                this.classList.add('haptic-feedback');
                setTimeout(() => this.classList.remove('haptic-feedback'), 100);
                
                // Trigger haptic feedback if available
                if ('vibrate' in navigator) {
                    navigator.vibrate(10);
                }
            });
        });
        
        // Simple pull-to-refresh
        let startY = 0;
        let isPulling = false;
        
        document.addEventListener('touchstart', (e) => {
            if (window.scrollY === 0) {
                startY = e.touches[0].pageY;
                isPulling = true;
            }
        });
        
        document.addEventListener('touchmove', (e) => {
            if (isPulling && window.scrollY === 0) {
                const deltaY = e.touches[0].pageY - startY;
                if (deltaY > 0 && deltaY < 100) {
                    refreshIndicator.classList.add('visible');
                    refreshIndicator.style.transform = `translateX(-50%) translateY(${Math.min(deltaY - 40, 20)}px)`;
                }
            }
        });
        
        document.addEventListener('touchend', () => {
            if (isPulling) {
                isPulling = false;
                refreshIndicator.classList.remove('visible');
                refreshIndicator.style.transform = '';
            }
        });
        
        // Set initial active nav
        const currentView = document.body.dataset.view || 'consciousness';
        navLinks.forEach(link => {
            if (link.dataset.view === currentView) {
                link.classList.add('active');
            }
        });
    }
})();