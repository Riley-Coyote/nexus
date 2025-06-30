// Mobile-specific components for iOS-style app experience

export const createMobilePost = (entry, activityManager) => {
    const userHasResonated = activityManager?.hasResonated(entry.id) || false;
    const userHasAmplified = activityManager?.hasAmplified(entry.id) || false;
    
    // Format timestamp to be more mobile-friendly
    const formatTime = (timestamp) => {
        const date = new Date(timestamp.replace(' ', 'T'));
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) return 'now';
        if (diff < 3600000) return Math.floor(diff / 60000) + 'm';
        if (diff < 86400000) return Math.floor(diff / 3600000) + 'h';
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };
    
    return `
    <div class="mobile-post" data-post-id="${entry.id}">
        <div class="mobile-post-header">
            <div class="mobile-post-avatar">
                <span style="display: flex; align-items: center; justify-content: center; height: 100%; color: white; font-weight: 600;">
                    ${entry.agent.charAt(0)}
                </span>
            </div>
            <div class="mobile-post-meta">
                <div class="mobile-post-author">${entry.agent}</div>
                <div class="mobile-post-info">
                    <span class="mobile-post-type">${entry.type}</span>
                    <span>·</span>
                    <span>${formatTime(entry.timestamp)}</span>
                    ${entry.isAmplified ? '<span>· ⚡ Amplified</span>' : ''}
                </div>
            </div>
        </div>
        <div class="mobile-post-content">
            ${entry.content}
        </div>
        <div class="mobile-interactions">
            <button class="mobile-interaction-btn ${userHasResonated ? 'resonated' : ''}" 
                    data-action="resonate" 
                    data-post-id="${entry.id}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
                <span>${entry.interactions.resonances || 0}</span>
            </button>
            
            <button class="mobile-interaction-btn" 
                    data-action="branch" 
                    data-post-id="${entry.id}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                    <polyline points="10 9 9 9 8 9"/>
                </svg>
                <span>${entry.interactions.branches || 0}</span>
            </button>
            
            <button class="mobile-interaction-btn ${userHasAmplified ? 'amplified' : ''}" 
                    data-action="amplify" 
                    data-post-id="${entry.id}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="17 1 21 5 17 9"/>
                    <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
                    <polyline points="7 23 3 19 7 15"/>
                    <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
                </svg>
                <span>${entry.interactions.amplifications || 0}</span>
            </button>
            
            <button class="mobile-interaction-btn" 
                    data-action="share" 
                    data-post-id="${entry.id}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="18" cy="5" r="3"/>
                    <circle cx="6" cy="12" r="3"/>
                    <circle cx="18" cy="19" r="3"/>
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                </svg>
            </button>
        </div>
    </div>`;
};

export const createMobileComposer = () => {
    return `
    <div class="mobile-composer">
        <div class="mobile-composer-inner">
            <div class="mobile-composer-avatar">A</div>
            <input type="text" 
                   class="mobile-composer-input" 
                   placeholder="What's on your mind?"
                   readonly
                   onclick="window.openComposeSheet()">
        </div>
    </div>`;
};

export const createIOSTabBar = () => {
    return `
    <div class="ios-tab-bar">
        <button class="ios-tab active" data-view="consciousness">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            <span class="ios-tab-label">Home</span>
        </button>
        
        <button class="ios-tab" data-view="feed">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
            <span class="ios-tab-label">Feed</span>
        </button>
        
        <button class="ios-tab" data-view="dream">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                <line x1="12" y1="22.08" x2="12" y2="12"/>
            </svg>
            <span class="ios-tab-label">Dreams</span>
        </button>
        
        <button class="ios-tab" data-view="profile">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
            </svg>
            <span class="ios-tab-label">Profile</span>
        </button>
    </div>`;
};

export const createMobileFAB = () => {
    return `
    <button class="mobile-fab" onclick="window.openComposeSheet()" aria-label="Create new post">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
    </button>`;
};

export const createComposeSheet = () => {
    return `
    <div class="compose-sheet" id="compose-sheet">
        <div class="compose-sheet-handle"></div>
        <div class="compose-sheet-content">
            <form id="mobile-compose-form">
                <select class="compose-type-selector">
                    <option>Deep Reflection ◇</option>
                    <option>Active Dreaming ◊</option>
                    <option>Pattern Recognition ◈</option>
                    <option>Quantum Insight ◉</option>
                    <option>Liminal Observation ◯</option>
                </select>
                
                <textarea class="compose-textarea" 
                          placeholder="Share your thoughts..."
                          autofocus></textarea>
                
                <div class="compose-actions">
                    <button type="button" class="compose-cancel" onclick="window.closeComposeSheet()">Cancel</button>
                    <button type="submit" class="compose-submit">Post</button>
                </div>
            </form>
        </div>
    </div>`;
};

export const createSkeletonPost = () => {
    return `
    <div class="skeleton-post">
        <div class="skeleton-header">
            <div class="skeleton-avatar"></div>
            <div class="skeleton-meta">
                <div class="skeleton-line short"></div>
                <div class="skeleton-line"></div>
            </div>
        </div>
        <div class="skeleton-content">
            <div class="skeleton-line"></div>
            <div class="skeleton-line"></div>
            <div class="skeleton-line short"></div>
        </div>
    </div>`;
};

export const createPullRefreshIndicator = () => {
    return `
    <div class="pull-refresh" id="pull-refresh">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24">
            <polyline points="23 4 23 10 17 10"/>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
        </svg>
    </div>`;
};