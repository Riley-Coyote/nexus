// Mobile Enhancements - Non-Breaking
(function() {
    // Only run on mobile
    if (window.innerWidth > 768) return;
    
    // Add mobile CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'css/mobile-enhance.css';
    document.head.appendChild(link);
    
    // Wait for DOM to be ready
    document.addEventListener('DOMContentLoaded', function() {
        // Update mobile header
        const headerContent = document.querySelector('#app-header .header-content');
        if (headerContent) {
            // Hide desktop-only elements
            const searchContainer = headerContent.querySelector('#search-container');
            const journalToggle = headerContent.querySelector('#journal-toggle');
            const navLinks = headerContent.querySelector('#nav-links');
            
            if (searchContainer) searchContainer.style.display = 'none';
            if (journalToggle) journalToggle.style.display = 'none';
            
            // Hide desktop nav items but keep messenger and profile icons
            if (navLinks) {
                navLinks.querySelectorAll('li').forEach(li => {
                    const hasMessengerBtn = li.querySelector('#open-messenger-btn');
                    const hasProfileBtn = li.querySelector('#profile-toggle-btn');
                    if (!hasMessengerBtn && !hasProfileBtn) {
                        li.style.display = 'none';
                    }
                });
            }
        }
        
        // Create mobile bottom tab bar
        const tabBar = document.createElement('div');
        tabBar.className = 'mobile-tab-bar';
        tabBar.innerHTML = `
            <button class="mobile-tab active" data-view="consciousness">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                    <polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
                <span class="mobile-tab-label">Home</span>
            </button>
            
            <button class="mobile-tab" data-view="feed">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M3 12h18m-9-9v18"/>
                    <circle cx="12" cy="12" r="9"/>
                </svg>
                <span class="mobile-tab-label">Feed</span>
            </button>
            
            <button class="mobile-tab" data-view="resonance">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <circle cx="12" cy="12" r="3"/>
                    <circle cx="12" cy="12" r="6" opacity="0.6"/>
                    <circle cx="12" cy="12" r="9" opacity="0.3"/>
                </svg>
                <span class="mobile-tab-label">Resonance</span>
            </button>
            
            <button class="mobile-tab" data-view="dream">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
                <span class="mobile-tab-label">Dreams</span>
            </button>
        `;
        document.body.appendChild(tabBar);
        
        // Add FAB button
        const fab = document.createElement('button');
        fab.className = 'mobile-fab';
        fab.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
        `;
        fab.setAttribute('aria-label', 'Create new post');
        document.body.appendChild(fab);
        
        // FAB click handler
        fab.addEventListener('click', function() {
            const textarea = document.querySelector('.entry-composer-textarea');
            if (textarea) {
                textarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
                textarea.focus();
            }
        });
        
        // Tab bar navigation
        const tabs = tabBar.querySelectorAll('.mobile-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', function() {
                tabs.forEach(t => t.classList.remove('active'));
                this.classList.add('active');
                
                // Trigger the view change
                const view = this.dataset.view;
                if (window.renderView) {
                    window.renderView(view);
                }
            });
        });
        
        
        // Set initial active tab based on current view
        const currentView = document.body.dataset.view || 'consciousness';
        const activeTab = tabBar.querySelector(`[data-view="${currentView}"]`);
        if (activeTab) {
            tabs.forEach(t => t.classList.remove('active'));
            activeTab.classList.add('active');
        }
        
        // Fix post visibility by forcing opacity
        setTimeout(() => {
            const posts = document.querySelectorAll('.stream-entry-lazy-load');
            posts.forEach(post => {
                post.style.opacity = '1';
                post.style.transform = 'none';
                post.classList.add('in-view');
            });
        }, 100);
        
        // Add pull-to-refresh hint
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
                if (deltaY > 80) {
                    // Would trigger refresh
                    document.body.style.transform = `translateY(${Math.min(deltaY / 3, 40)}px)`;
                }
            }
        });
        
        document.addEventListener('touchend', () => {
            if (isPulling) {
                isPulling = false;
                document.body.style.transform = '';
                // Could implement actual refresh here
            }
        });
        
        // Enhance share buttons with native share API
        document.addEventListener('click', (e) => {
            if (e.target.closest('button[data-action="share"]') && navigator.share) {
                e.preventDefault();
                const postCard = e.target.closest('.glass-card');
                const content = postCard?.querySelector('.stream-content')?.textContent || '';
                
                navigator.share({
                    title: 'Liminal Logbook',
                    text: content.substring(0, 200) + '...',
                    url: window.location.href
                }).catch(() => {
                    // User cancelled or error
                });
            }
        });
        
        // Watch for new posts and fix their visibility
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1 && node.classList?.contains('stream-entry-lazy-load')) {
                        setTimeout(() => {
                            node.style.opacity = '1';
                            node.style.transform = 'none';
                            node.classList.add('in-view');
                        }, 10);
                    }
                });
            });
        });
        
        // Observe the main content areas
        const mainContainers = document.querySelectorAll('main, #consciousness-stream, #dream-stream');
        mainContainers.forEach(container => {
            if (container) {
                observer.observe(container, { childList: true, subtree: true });
            }
        });
        
        // Add haptic feedback to buttons
        const buttons = document.querySelectorAll('button');
        buttons.forEach(btn => {
            btn.addEventListener('click', function() {
                // Vibrate for 10ms if available
                if ('vibrate' in navigator) {
                    navigator.vibrate(10);
                }
            });
        });
    });
})();