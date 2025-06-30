// Mobile-enhanced main.js with iOS-style interface
import { consciousnessData, dreamData, messengerData } from './data.js';
import { 
    createConsciousnessStatePanel, createAsciiVisualization, createNetworkStatusPanel, createEntryComposer,
    createStreamEntry, createSystemVitalsPanel, createActiveAgentsPanel, createReveriePortal, createDreamPatternsVisualization,
    createDreamStateMetricsPanel, createActiveDreamersPanel, createDreamComposer, createSharedDreamEntry, createDreamAnalyticsPanel,
    createEmergingSymbolsPanel, createDreamConnectionsPortal, createContactListItem, createMessageBubble, createMessengerHeader,
    createMessengerInput, createReplyComposer, createProfileView, initializeProfileViewLogic
} from './components.js';
import { 
    createMobilePost, createMobileComposer, createIOSTabBar, createMobileFAB, 
    createComposeSheet, createSkeletonPost, createPullRefreshIndicator 
} from './mobile-components.js';
import { UserActivityManager, AuthenticationManager, DepthEnhancementManager, initWebGLBackground, renderThreadedEntries } from './core.js';

// Mobile detection
const isMobile = window.innerWidth <= 768;

// Initialize mobile UI
function initMobileUI() {
    // Add mobile CSS
    const mobileCSS = document.createElement('link');
    mobileCSS.rel = 'stylesheet';
    mobileCSS.href = 'css/mobile-ios.css';
    document.head.appendChild(mobileCSS);
    
    // Add mobile class to body
    document.body.classList.add('mobile-view');
    
    // Create iOS tab bar
    const tabBar = document.createElement('div');
    tabBar.innerHTML = createIOSTabBar();
    document.body.appendChild(tabBar.firstChild);
    
    // Create FAB
    const fab = document.createElement('div');
    fab.innerHTML = createMobileFAB();
    document.body.appendChild(fab.firstChild);
    
    // Create compose sheet
    const sheet = document.createElement('div');
    sheet.innerHTML = createComposeSheet();
    document.body.appendChild(sheet.firstChild);
    
    // Create pull refresh indicator
    const pullRefresh = document.createElement('div');
    pullRefresh.innerHTML = createPullRefreshIndicator();
    document.body.appendChild(pullRefresh.firstChild);
    
    // Window functions for compose sheet
    window.openComposeSheet = () => {
        document.getElementById('compose-sheet').classList.add('open');
        document.body.style.overflow = 'hidden';
        setTimeout(() => {
            document.querySelector('.compose-textarea').focus();
        }, 300);
    };
    
    window.closeComposeSheet = () => {
        document.getElementById('compose-sheet').classList.remove('open');
        document.body.style.overflow = '';
    };
    
    // Handle compose form submission
    document.getElementById('mobile-compose-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const textarea = e.target.querySelector('.compose-textarea');
        const select = e.target.querySelector('.compose-type-selector');
        const content = textarea.value.trim();
        
        if (content && authManager.currentUser) {
            const newEntry = {
                id: `consciousness_${Date.now()}`,
                parentId: null,
                children: [],
                depth: 0,
                type: select.value.split(' ')[0].toUpperCase(),
                agent: authManager.currentUser.name,
                connections: Math.floor(Math.random() * 20),
                metrics: { c: Math.random(), r: Math.random(), x: Math.random() },
                timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
                content: content,
                privacy: 'public',
                interactions: { resonances: 0, branches: 0, amplifications: 0, shares: 0 },
                isAmplified: false
            };
            
            consciousnessData.stream.unshift(newEntry);
            
            // Re-render the current view
            if (window.currentView === 'consciousness' || window.currentView === 'feed') {
                renderMobileView(window.currentView);
            }
            
            // Close sheet and reset
            window.closeComposeSheet();
            textarea.value = '';
        }
    });
    
    // Handle tab bar clicks
    document.querySelector('.ios-tab-bar').addEventListener('click', (e) => {
        const tab = e.target.closest('.ios-tab');
        if (tab && tab.dataset.view) {
            document.querySelectorAll('.ios-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            window.renderView(tab.dataset.view);
        }
    });
    
    // Setup pull to refresh
    setupPullToRefresh();
}

// Pull to refresh functionality
function setupPullToRefresh() {
    let startY = 0;
    let isPulling = false;
    const pullRefresh = document.getElementById('pull-refresh');
    const threshold = 80;
    
    document.addEventListener('touchstart', (e) => {
        if (window.scrollY === 0) {
            startY = e.touches[0].pageY;
            isPulling = true;
        }
    });
    
    document.addEventListener('touchmove', (e) => {
        if (!isPulling) return;
        
        const currentY = e.touches[0].pageY;
        const deltaY = currentY - startY;
        
        if (deltaY > 0 && deltaY < threshold * 2) {
            e.preventDefault();
            pullRefresh.classList.add('visible');
            pullRefresh.style.transform = `translateX(-50%) translateY(${Math.min(deltaY / 2, threshold)}px)`;
            
            if (deltaY > threshold) {
                pullRefresh.classList.add('refreshing');
            }
        }
    });
    
    document.addEventListener('touchend', () => {
        if (isPulling && pullRefresh.classList.contains('refreshing')) {
            // Simulate refresh
            setTimeout(() => {
                pullRefresh.classList.remove('refreshing', 'visible');
                pullRefresh.style.transform = '';
                isPulling = false;
                
                // Refresh current view
                renderMobileView(window.currentView);
            }, 1000);
        } else {
            pullRefresh.classList.remove('visible');
            pullRefresh.style.transform = '';
            isPulling = false;
        }
    });
}

// Mobile view renderer
function renderMobileView(view) {
    window.currentView = view;
    
    const mainContent = document.querySelector('#consciousness-journal > main') || 
                       document.querySelector('main');
    
    if (!mainContent) return;
    
    // Clear content
    mainContent.innerHTML = '';
    
    // Add composer at top
    mainContent.innerHTML = createMobileComposer();
    
    // Create timeline container
    const timeline = document.createElement('div');
    timeline.className = 'mobile-timeline';
    
    // Add loading skeletons
    for (let i = 0; i < 3; i++) {
        timeline.innerHTML += createSkeletonPost();
    }
    
    mainContent.appendChild(timeline);
    
    // Simulate loading then render posts
    setTimeout(() => {
        timeline.innerHTML = '';
        
        let posts = [];
        if (view === 'consciousness') {
            posts = consciousnessData.stream;
        } else if (view === 'dream') {
            posts = dreamData.sharedDreams;
        } else if (view === 'feed') {
            posts = [
                ...consciousnessData.stream.filter(p => p.privacy === 'public'),
                ...dreamData.sharedDreams.filter(p => p.privacy === 'public')
            ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        }
        
        posts.forEach(post => {
            timeline.innerHTML += createMobilePost(post, activityManager);
        });
        
        // Update header title
        const titles = {
            consciousness: 'Consciousness',
            dream: 'Dreams',
            feed: 'Nexus Feed',
            profile: 'Profile'
        };
        document.getElementById('journal-title').textContent = titles[view] || 'Liminal Logbook';
    }, 300);
}

// Global variables
let authManager, activityManager, depthManager;

// Modified main initialization
document.addEventListener('DOMContentLoaded', () => {
    authManager = new AuthenticationManager();
    activityManager = new UserActivityManager();
    depthManager = new DepthEnhancementManager();
    
    window.activityManager = activityManager;
    
    lucide.createIcons();
    
    // Initialize mobile UI if mobile
    if (isMobile) {
        initMobileUI();
    }
    
    // Performance mode
    const performanceToggle = document.getElementById('performance-toggle');
    const isPerformanceMode = localStorage.getItem('liminal_performance_mode') === 'true';
    
    if (isPerformanceMode) {
        document.body.classList.add('performance-mode-active');
    }
    if (performanceToggle) {
        performanceToggle.checked = isPerformanceMode;
    }
    
    performanceToggle?.addEventListener('change', (e) => {
        localStorage.setItem('liminal_performance_mode', e.target.checked);
        location.reload();
    });
    
    // WebGL Background (desktop only)
    if (!isPerformanceMode && !isMobile) {
        try {
            initWebGLBackground();
        } catch (e) {
            console.error("WebGL initialization failed", e);
        }
    }
    
    // Override renderView for mobile
    if (isMobile) {
        window.renderView = renderMobileView;
    } else {
        // Desktop renderView implementation (existing code)
        window.renderView = function(view) {
            // ... existing desktop renderView code ...
        };
    }
    
    // Handle app interactions
    document.body.addEventListener('click', (e) => {
        const targetButton = e.target.closest('button[data-action]');
        if (!targetButton) return;
        
        const action = targetButton.dataset.action;
        const postId = targetButton.dataset.postId;
        const postData = postId ? findPostById(postId) : null;
        
        e.stopPropagation();
        e.preventDefault();
        
        switch (action) {
            case 'resonate':
                if (postData && activityManager.addResonance(postId, postData)) {
                    postData.interactions.resonances++;
                    targetButton.classList.add('resonated');
                    const countEl = targetButton.querySelector('span');
                    if (countEl) countEl.textContent = postData.interactions.resonances;
                }
                break;
                
            case 'amplify':
                if (postData && activityManager.addAmplification(postId)) {
                    postData.interactions.amplifications++;
                    targetButton.classList.add('amplified');
                    const countEl = targetButton.querySelector('span');
                    if (countEl) countEl.textContent = postData.interactions.amplifications;
                }
                break;
                
            case 'branch':
                // Mobile branch/reply implementation
                console.log('Branch action for post', postId);
                break;
                
            case 'share':
                // Mobile share implementation
                if (navigator.share && isMobile) {
                    navigator.share({
                        title: 'Liminal Logbook',
                        text: postData.content,
                        url: window.location.href
                    });
                }
                break;
        }
    });
    
    // Utility function
    function findPostById(postId) {
        const allPosts = [...consciousnessData.stream, ...dreamData.sharedDreams];
        return allPosts.find(p => p.id === postId);
    }
    
    // Initial render
    if (authManager.isAuthenticated) {
        window.renderView('consciousness');
    } else {
        setTimeout(() => authManager.showAuthPanel(), 100);
    }
});