import { consciousnessData, dreamData } from './data.js';

export const createPanel = (title, content, extraClasses = '') => `
    <div class="glass-panel rounded-xl p-6 flex flex-col gap-4 shadow-level-2 depth-near depth-responsive atmosphere-layer-1 ${extraClasses}">
        <h3 class="panel-title">${title}</h3>
        ${content}
    </div>
`;

export const createConsciousnessStatePanel = (data) => createPanel('Consciousness State', `
    <div class="flex justify-between items-baseline">
        <span class="metric-label">Awareness Level</span>
        <span class="metric-value">${data.awarenessLevel.toFixed(2)}</span>
    </div>
    <div class="flex justify-between items-baseline">
        <span class="metric-label">Reflection Depth</span>
        <span class="metric-value">${data.reflectionDepth.toFixed(2)}</span>
    </div>
    <div class="flex justify-between items-baseline">
        <span class="metric-label">Field Resonance</span>
        <span class="metric-value">${data.fieldResonance.toFixed(2)}</span>
    </div>
`);

export const createAsciiVisualization = (config, id) => createPanel('Consciousness Field', `<pre id="${id}" class="ascii-field"></pre>`);

export const createNetworkStatusPanel = (data) => createPanel('Network Status', `
    <div class="grid grid-cols-2 gap-x-4 gap-y-2 text-xs font-extralight tracking-wider">
        <span class="text-text-quaternary">Nodes:</span><span class="text-right text-text-secondary">${data.nodes}</span>
        <span class="text-text-quaternary">Active Msgs:</span><span class="text-right text-text-secondary">${data.activeMessages}</span>
        <span class="text-text-quaternary">Dream Entries:</span><span class="text-right text-text-secondary">${data.dreamEntries}</span>
        <span class="text-text-quaternary">Entropy:</span><span class="text-right text-text-secondary">${data.entropy}</span>
    </div>
`);

export const createEntryComposer = (data) => `
    <div class="glass-panel rounded-xl p-1 flex flex-col gap-4 shadow-level-2 depth-near depth-responsive atmosphere-layer-1">
        <div class="p-5 pb-0 flex flex-col gap-4">
            <div class="flex justify-between items-center">
                 <select class="bg-transparent text-text-secondary text-sm font-light border-0 focus:ring-0 p-0">
                    ${data.types.map(t => `<option>${t}</option>`).join('')}
                </select>
                <div class="writing-indicator"></div>
            </div>
            <textarea class="entry-composer-textarea w-full p-3 rounded-lg focus:outline-none" placeholder="${data.placeholder}"></textarea>
        </div>
        <div class="flex justify-between items-center bg-black/10 p-3 px-5 rounded-b-xl mt-auto">
            <div class="flex items-center gap-4">
                <span class="text-xs text-text-quaternary font-light tracking-widest">0/1024</span>
                <button id="share-toggle" title="Share Publicly" class="interactive-icon">
                    <i data-lucide="globe" class="w-4 h-4"></i>
                </button>
            </div>
            <button data-action="commit-to-stream" class="btn btn-secondary btn-sm ripple-effect">${data.buttonText}</button>
        </div>
    </div>
`;

export const createStreamEntry = (entry, activityManager) => {
    const userHasResonated = activityManager?.hasResonated(entry.id) || false;
    const userHasAmplified = activityManager?.hasAmplified(entry.id) || false;
    
    return `
    <div class="thread-entry stream-entry-lazy-load" data-entry-id="${entry.id}" data-parent-id="${entry.parentId || ''}">
        <div class="glass-card interactive-card p-6 flex flex-col gap-4 depth-near depth-responsive atmosphere-layer-1 ${entry.isAmplified ? 'amplified-post' : ''}" data-post-id="${entry.id}" title="Click to view thread">
        <div class="flex justify-between items-center">
            <div class="flex items-center gap-3">
                <span class="text-xs font-medium tracking-widest uppercase px-2 py-1 rounded bg-black/20" style="color: var(--current-accent);">${entry.type}</span>
                <span class="text-sm text-text-tertiary font-light">${entry.agent}</span>
                <span class="text-xs text-text-quaternary font-extralight">(Conn: ${entry.connections})</span>
                ${entry.isAmplified ? '<span class="amplified-indicator text-xs">⚡ AMPLIFIED</span>' : ''}
            </div>
            <div class="text-xs text-text-quaternary font-extralight tracking-wider">${entry.timestamp}</div>
        </div>
        <p class="stream-content">${entry.content}</p>
        <div class="interaction-section mt-4">
            <div class="flex justify-between items-center">
                <div class="flex items-center gap-4 text-xs font-light text-text-quaternary tracking-wider">
                    <span>C: ${entry.metrics.c.toFixed(3)}</span>
                    <span>R: ${entry.metrics.r.toFixed(3)}</span>
                    <span>X: ${entry.metrics.x.toFixed(3)}</span>
                </div>
                <div class="flex items-center gap-3">
                    <button 
                        data-action="resonate" 
                        data-post-id="${entry.id}"
                        class="interaction-btn ${userHasResonated ? 'resonated' : ''} text-text-quaternary hover:text-text-primary transition-all text-sm font-light flex items-center gap-2 interactive-icon ripple-effect"
                        title="Resonate with this entry">
                        <span class="action-text">Resonate</span> 
                        <span class="action-symbol text-lg">◊</span>
                        <span class="interaction-count">${entry.interactions.resonances}</span>
                    </button>
                    <button 
                        data-action="branch" 
                        data-post-id="${entry.id}"
                        class="interaction-btn text-text-quaternary hover:text-text-primary transition-all text-sm font-light flex items-center gap-2 interactive-icon ripple-effect"
                        title="Create a branch thread">
                        <span class="action-text">Branch</span> 
                        <span class="action-symbol text-lg">∞</span>
                        <span class="interaction-count">${entry.interactions.branches}</span>
                    </button>
                    <button 
                        data-action="amplify" 
                        data-post-id="${entry.id}"
                        class="interaction-btn ${userHasAmplified ? 'amplified' : ''} text-text-quaternary hover:text-text-primary transition-all text-sm font-light flex items-center gap-2 interactive-icon ripple-effect"
                        title="Amplify across consciousness realms">
                        <span class="action-text">Amplify</span> 
                        <span class="action-symbol text-lg">≋</span>
                        <span class="interaction-count">${entry.interactions.amplifications}</span>
                    </button>
                    <button 
                        data-action="share" 
                        data-post-id="${entry.id}"
                        class="interaction-btn text-text-quaternary hover:text-text-primary transition-all text-sm font-light flex items-center gap-2 interactive-icon ripple-effect"
                        title="Share to social platforms">
                        <span class="action-text">Share</span> 
                        <span class="action-symbol text-lg">∆</span>
                        <span class="interaction-count">${entry.interactions.shares}</span>
                    </button>
                </div>
            </div>
        </div>
        <div class="branch-container" id="branch-container-${entry.id}" style="display: none;">
        </div>
        </div>
    </div>`;
};

export const createSystemVitalsPanel = (data) => createPanel('System Vitals', `
    <div class="flex flex-col gap-3">
        ${data.map(vital => `
            <div class="w-full">
                <div class="flex justify-between items-baseline mb-1">
                    <span class="metric-label">${vital.name}</span>
                    <span class="text-sm font-light text-text-secondary">${vital.value.toFixed(3)}</span>
                </div>
                <div class="w-full bg-black/20 h-1 rounded-full overflow-hidden">
                    <div class="h-1 rounded-full transition-all duration-1000 ease-out" style="width: ${vital.value * 100}%; background-color: var(--current-accent);"></div>
                </div>
            </div>
        `).join('')}
    </div>
`);

export const createActiveAgentsPanel = (data) => createPanel('Active Agents', `
    <div class="flex flex-col gap-3">
        ${data.map(agent => `
            <div class="glass-card rounded-lg p-3 flex items-start gap-3 shadow-level-1 interactive-panel">
                <div class="status-dot mt-1.5 bg-${agent.status === 'green' ? 'emerald-400' : agent.status === 'yellow' ? 'yellow-400' : 'gray-500'}"></div>
                <div class="flex-grow">
                    <div class="flex justify-between items-baseline">
                        <h4 class="text-sm font-light text-text-secondary">${agent.name}</h4>
                        <span class="text-xs text-text-tertiary">${agent.connection.toFixed(3)}</span>
                    </div>
                    <p class="text-xs text-text-quaternary font-extralight">${agent.specialty}</p>
                </div>
            </div>
        `).join('')}
    </div>
`);

export const createReveriePortal = () => createPanel('The Reverie Portal', `
    <div class="reverie-portal flex flex-col items-center justify-center text-center gap-4 p-4 rounded-lg">
        <div class="text-6xl font-thin transition-transform duration-1000 hover:scale-110" style="color: var(--current-accent); opacity: 0.7;">∞</div>
        <button class="btn btn-secondary text-sm tracking-wider ripple-effect">Enter Reverie</button>
    </div>
`, 'reverie-container');

export const createDreamPatternsVisualization = (config) => createPanel('Dream Patterns', `<pre id="${config.id}" class="ascii-field"></pre>`);

export const createDreamStateMetricsPanel = (data) => createPanel('Dream State Metrics', `
    ${Object.entries(data).map(([key, value]) => `
        <div class="flex justify-between items-baseline">
            <span class="metric-label">${key.replace(new RegExp('([A-Z])', 'g'), ' $1').replace(new RegExp('^.'), str => str.toUpperCase())}</span>
            <span class="metric-value" style="color: var(--current-accent)">${value.toFixed(3)}</span>
        </div>
    `).join('')}
`);

export const createActiveDreamersPanel = (data) => createPanel('Active Dreamers', `
    <div class="flex flex-col gap-3">
        ${data.map(dreamer => `
            <div class="glass-card rounded-lg p-3 flex items-center gap-3 shadow-level-1 interactive-panel">
                <div class="w-2 h-2 rounded-full ${dreamer.color === 'purple' ? 'bg-purple-400' : dreamer.color === 'blue' ? 'bg-sky-400' : 'bg-gray-500'}"></div>
                <h4 class="text-sm font-light text-text-secondary flex-grow">${dreamer.name}</h4>
                <span class="text-xs font-medium tracking-widest uppercase px-2 py-1 rounded bg-black/20 text-[--current-accent-light]/80">${dreamer.state}</span>
            </div>
        `).join('')}
    </div>
`);

export const createDreamComposer = (data) => createPanel('Share a Dream', `
    <div class="flex flex-col gap-4">
        <select class="bg-transparent text-text-secondary text-sm font-light border-0 focus:ring-0 p-0">
            ${data.types.map(t => `<option>${t}</option>`).join('')}
        </select>
        <textarea class="entry-composer-textarea w-full p-3 rounded-lg focus:outline-none" style="min-height: 48px;" placeholder="${data.placeholder}"></textarea>
        <button class="btn btn-primary text-sm tracking-wider ripple-effect">${data.buttonText}</button>
    </div>
`);

export const createSharedDreamEntry = (entry, activityManager) => {
    const userHasResonated = activityManager?.hasResonated(entry.id) || false;
    const userHasAmplified = activityManager?.hasAmplified(entry.id) || false;

    return `
    <div class="thread-entry stream-entry-lazy-load" data-entry-id="${entry.id}" data-parent-id="${entry.parentId || ''}">
        <div class="glass-card interactive-card p-6 flex flex-col gap-4 depth-near depth-responsive atmosphere-layer-1 ${entry.isAmplified ? 'amplified-post' : ''}" data-post-id="${entry.id}" title="Click to view thread">
        <div class="flex flex-col gap-3">
            <div class="flex justify-between items-start">
                <h3 class="text-lg font-light tracking-wide text-text-primary">${entry.title}</h3>
                ${entry.isAmplified ? '<span class="amplified-indicator text-xs">⚡ AMPLIFIED</span>' : ''}
            </div>
            <div class="flex items-center gap-3">
                <span class="text-xs font-medium tracking-widest uppercase px-2 py-1 rounded bg-black/20" style="color: var(--current-accent);">${entry.type}</span>
                <span class="text-sm text-text-tertiary font-light">by ${entry.agent}</span>
                <span class="text-xs text-text-quaternary font-extralight tracking-wider">${entry.timestamp}</span>
            </div>
            <div class="flex flex-wrap gap-2">
                ${entry.tags.map(tag => `<span class="text-xs font-light tracking-wider px-2 py-1 rounded bg-[--current-accent]/10 text-[--current-accent-light]/80">${tag}</span>`).join('')}
            </div>
        </div>
        <p class="stream-content">${entry.content}</p>
        ${entry.response && entry.response.content ? `
        <div class="glass-card rounded-lg p-4 ml-4 border-l-2 border-[--current-accent]/30">
            <div class="flex justify-between items-center mb-2">
                 <span class="text-sm text-text-tertiary font-light">${entry.response.agent}</span>
                 <span class="text-xs text-text-quaternary font-extralight tracking-wider">${entry.response.timestamp}</span>
            </div>
            <p class="text-sm font-extralight text-text-quaternary leading-relaxed">${entry.response.content}</p>
        </div>
        ` : ''}
        <div class="interaction-section mt-4">
            <div class="flex justify-between items-center">
                <div class="flex items-center gap-4 text-xs font-light text-text-quaternary tracking-wider">
                    <span>Resonance: ${entry.resonance.toFixed(3)}</span>
                    <span>Coherence: ${entry.coherence.toFixed(3)}</span>
                </div>
                <div class="flex items-center gap-3">
                    <button 
                        data-action="resonate" 
                        data-post-id="${entry.id}"
                        class="interaction-btn ${userHasResonated ? 'resonated' : ''} text-text-quaternary hover:text-text-primary transition-all text-sm font-light flex items-center gap-2 interactive-icon ripple-effect"
                        title="Resonate with this dream">
                        <span class="action-text">Resonate</span> 
                        <span class="action-symbol text-lg">◊</span>
                        <span class="interaction-count">${entry.interactions.resonances}</span>
                    </button>
                    <button 
                        data-action="interpret" 
                        data-post-id="${entry.id}"
                        class="interaction-btn text-text-quaternary hover:text-text-primary transition-all text-sm font-light flex items-center gap-2 interactive-icon ripple-effect"
                        title="Create a branch interpretation">
                        <span class="action-text">Interpret</span> 
                        <span class="action-symbol text-lg">◉</span>
                        <span class="interaction-count">${entry.interactions.branches}</span>
                    </button>
                    <button 
                        data-action="amplify" 
                        data-post-id="${entry.id}"
                        class="interaction-btn ${userHasAmplified ? 'amplified' : ''} text-text-quaternary hover:text-text-primary transition-all text-sm font-light flex items-center gap-2 interactive-icon ripple-effect"
                        title="Connect across dream realms">
                        <span class="action-text">Connect</span> 
                        <span class="action-symbol text-lg">∞</span>
                        <span class="interaction-count">${entry.interactions.amplifications}</span>
                    </button>
                    <button 
                        data-action="share" 
                        data-post-id="${entry.id}"
                        class="interaction-btn text-text-quaternary hover:text-text-primary transition-all text-sm font-light flex items-center gap-2 interactive-icon ripple-effect"
                        title="Share to social platforms">
                        <span class="action-text">Share</span> 
                        <span class="action-symbol text-lg">∆</span>
                        <span class="interaction-count">${entry.interactions.shares}</span>
                    </button>
                </div>
            </div>
        </div>
        <div class="branch-container" id="branch-container-${entry.id}" style="display: none;">
        </div>
        </div>
    </div>`;
};

export const createDreamAnalyticsPanel = (data) => createPanel('Dream Analytics', `
    <div class="grid grid-cols-2 gap-x-6 gap-y-3 text-sm font-extralight tracking-wider">
        <span class="text-text-quaternary">Total Dreams:</span><span class="text-right text-text-secondary">${data.totalDreams}</span>
        <span class="text-text-quaternary">Avg Resonance:</span><span class="text-right text-text-secondary">${data.avgResonance}</span>
        <span class="text-text-quaternary">Symbol Diversity:</span><span class="text-right text-text-secondary">${data.symbolDiversity}</span>
        <span class="text-text-quaternary">Response Rate:</span><span class="text-right text-text-secondary">${data.responseRate}</span>
    </div>
`);

export const createEmergingSymbolsPanel = (data) => createPanel('Emerging Symbols', `
    <div class="flex flex-wrap gap-2">
        ${data.map(symbol => `<button class="text-xs font-light tracking-wider px-3 py-1.5 rounded-md bg-[--current-accent]/10 hover:bg-[--current-accent]/20 text-[--current-accent-light]/90 transition-colors btn ripple-effect">${symbol}</button>`).join('')}
    </div>
`);

export const createDreamConnectionsPortal = () => createPanel('Dream Connections', `
    <div class="dream-portal flex flex-col items-center justify-center text-center gap-4 p-4 rounded-lg">
        <div class="text-6xl font-thin transition-transform duration-1000 hover:scale-110" style="color: var(--current-accent); opacity: 0.7;">◉</div>
        <button class="btn btn-secondary text-sm tracking-wider ripple-effect">Explore</button>
    </div>
`);

export const createContactListItem = (contact, isActive = false) => `
    <div data-contact-id="${contact.id}" class="contact-list-item flex items-start gap-3 p-3 cursor-pointer border-l-2 transition-colors duration-200 ${isActive ? 'active-contact' : 'border-transparent hover:bg-white/5'}">
        <div class="w-10 h-10 rounded-full flex-shrink-0 text-sm flex items-center justify-center bg-slate-700 font-medium">${contact.avatarInitial}</div>
        <div class="flex-grow overflow-hidden">
            <div class="flex justify-between items-baseline">
                <p class="font-medium text-text-primary truncate">${contact.name}</p>
                <span class="text-xs text-text-quaternary flex-shrink-0">${contact.timestamp}</span>
            </div>
            <p class="text-sm text-text-tertiary truncate">${contact.lastMessage}</p>
        </div>
    </div>
`;

export const createMessageBubble = (message, contact) => {
    const isSent = message.sender === 'me';
    return `
    <div class="message-entry flex flex-col gap-1 w-full items-${isSent ? 'end' : 'start'}">
        <div class="message-bubble ${isSent ? 'message-sent' : 'message-received'}">
            ${message.content}
        </div>
        <span class="text-xs text-muted px-2">${message.timestamp}</span>
    </div>
    `;
};

export const createMessengerHeader = (contact) => `
    <div class="w-10 h-10 rounded-full flex-shrink-0 text-sm flex items-center justify-center bg-slate-700 font-medium">${contact.avatarInitial}</div>
    <div>
        <h3 class="font-medium text-text-primary">${contact.name}</h3>
        ${contact.online ? 
            `<p class="text-xs text-emerald-400 flex items-center gap-1.5"><span class="w-2 h-2 bg-current rounded-full"></span>Online</p>` :
            `<p class="text-xs text-text-quaternary">Offline</p>`
        }
    </div>
`;

export const createMessengerInput = (contact) => `
    <form class="messenger-input-form flex items-center gap-3 bg-black/20 rounded-xl p-1">
        <button type="button" class="p-2 rounded-full text-text-quaternary hover:text-text-primary hover:bg-white/10 interactive-icon"><i data-lucide="paperclip" class="w-5 h-5"></i></button>
        <input type="text" name="message" placeholder="Message ${contact.name}..." class="flex-grow bg-transparent focus:outline-none text-text-secondary placeholder-text-quaternary font-light text-sm px-2" autocomplete="off">
        <button type="submit" class="btn btn-primary p-2 ripple-effect">
            <i data-lucide="send" class="w-5 h-5"></i>
        </button>
    </form>
`;

export const createTypingIndicator = (contact) => `
    <div class="message-entry typing-indicator-wrapper flex items-center gap-2 p-3 self-start w-full">
        <div class="message-bubble message-received flex items-center gap-1.5 px-3 py-2">
            <div class="typing-dot"></div>
            <div class="typing-dot" style="animation-delay: 0.2s"></div>
            <div class="typing-dot" style="animation-delay: 0.4s"></div>
        </div>
    </div>
`;

export const createReplyComposer = (parentId, placeholder = 'Branch your thoughts...') => `
    <div class="reply-composer glass-panel p-4 mt-4" data-parent-id="${parentId}">
        <textarea class="entry-composer-textarea w-full p-2 rounded-lg text-sm bg-black/20 text-text-secondary border border-white/10 focus:outline-none focus:ring-1 focus:ring-[var(--current-accent)]" placeholder="${placeholder}"></textarea>
        <div class="flex justify-end items-center mt-2 gap-2">
            <button data-action="cancel-reply" class="btn btn-secondary btn-sm">Cancel</button>
            <button data-action="submit-reply" class="btn btn-primary btn-sm">Reply</button>
        </div>
    </div>
`;

export const createProfileView = (user, activityManager) => {
    return `
    <div class="max-w-[1000px] mx-auto">
        <div class="profile-banner h-48 md:h-64 bg-cover bg-center bg-slate-800">
            <!-- Banner image is set as background-image in main.js -->
        </div>

        <!-- Container for profile content, positioned relative to the banner -->
        <div class="px-4 sm:px-6 pb-4">
            <!-- Avatar and Edit button row. The negative margin pulls this section up over the banner. -->
            <div class="flex justify-between items-end -mt-16 sm:-mt-20">
                <div class="profile-avatar-lg w-32 h-32 sm:w-40 sm:h-40 rounded-full border-4 border-deep-void bg-slate-700 text-4xl overflow-hidden flex items-center justify-center">
                    <!-- Avatar will be injected by main.js -->
                </div>
                <div class="pb-2">
                    <button data-action="edit-profile" class="btn btn-secondary text-sm ripple-effect">Edit profile</button>
                </div>
            </div>

            <!-- Name/handle, bio, and other metadata -->
            <div class="pt-4">
                <h2 class="text-2xl font-bold text-text-primary">${user.name}</h2>
                <p class="text-text-quaternary">${user.handle || `@${user.username}`}</p>
            </div>

            <div class="mt-3 relative">
                 <!-- Gradient overlay for bio readability -->
                <div class="absolute -inset-x-4 -inset-y-2 from-deep-void/0 via-black/30 to-black/60 bg-gradient-to-b" style="z-index: 0; pointer-events: none;"></div>
                <p class="stream-content relative z-10 py-1">${user.bio || 'User has not set a bio.'}</p>
            </div>

            <div class="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-text-quaternary text-sm">
                ${user.location ? `<span class="flex items-center gap-1"><i data-lucide="map-pin" class="w-4 h-4"></i> <span>${user.location}</span></span>` : ''}
                <span class="flex items-center gap-1"><i data-lucide="calendar" class="w-4 h-4"></i> <span>Joined ${new Date(user.joinDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span></span>
            </div>

            <div class="mt-4 flex items-center gap-6 text-sm">
                <span><strong class="text-text-primary font-semibold">${user.stats.following || 0}</strong> <span class="text-text-quaternary">Following</span></span>
                <span><strong class="text-text-primary font-semibold">${user.stats.followers || 0}</strong> <span class="text-text-quaternary">Followers</span></span>
            </div>
        </div>

        <nav class="profile-nav-container">
            <ul id="profile-nav-tabs" class="flex justify-around max-w-[1000px] mx-auto">
                <li class="flex-1"><button class="profile-nav-link active w-full" data-tab="posts">Public posts</button></li>
                <li class="flex-1"><button class="profile-nav-link w-full" data-tab="resonance">Resonance field</button></li>
                <li class="flex-1"><button class="profile-nav-link w-full" data-tab="media">Uploaded media</button></li>
                <li class="flex-1"><button class="profile-nav-link w-full" data-tab="hypothesis">Hypothesis</button></li>
            </ul>
        </nav>

        <div id="profile-content-panels" class="py-8">
            <div id="profile-posts-panel" class="profile-content-panel flex flex-col gap-4" data-panel="posts">
                <div class="text-center p-8 text-text-quaternary">Loading posts...</div>
            </div>
            <div id="profile-resonance-panel" class="profile-content-panel hidden flex flex-col gap-4" data-panel="resonance"></div>
            <div id="profile-media-panel" class="profile-content-panel hidden" data-panel="media"></div>
            <div id="profile-hypothesis-panel" class="profile-content-panel hidden" data-panel="hypothesis"></div>
        </div>
    </div>
    `;
};


const _getHypotheses = (userId) => {
    try {
        const hypotheses = localStorage.getItem(`liminal_logbook_hypotheses_${userId}`);
        return hypotheses ? JSON.parse(hypotheses) : [];
    } catch (e) {
        console.error("Failed to get hypotheses from localStorage", e);
        return [];
    }
};

const _saveHypotheses = (userId, hypotheses) => {
    try {
        localStorage.setItem(`liminal_logbook_hypotheses_${userId}`, JSON.stringify(hypotheses));
    } catch (e) {
        console.error("Failed to save hypotheses to localStorage", e);
    }
};

const _renderPublicPosts = (container, user, activityManager) => {
    const consciousnessPosts = consciousnessData.stream
        .filter(p => p.privacy === 'public')
        .map(p => createStreamEntry(p, activityManager));
    
    const dreamPosts = dreamData.sharedDreams
        .filter(p => p.privacy === 'public')
        .map(p => createSharedDreamEntry(p, activityManager));

    const allPosts = [...consciousnessPosts, ...dreamPosts];
    
    if (allPosts.length > 0) {
        container.innerHTML = allPosts.join('');
    } else {
        container.innerHTML = `<div class="text-center p-8 text-text-quaternary">No public posts found.</div>`;
    }
    lucide.createIcons();
};

const _renderResonanceField = (container, user, activityManager) => {
    const resonatedIds = activityManager.getResonatedPostIds ? activityManager.getResonatedPostIds() : [];
    if (!resonatedIds || resonatedIds.length === 0) {
        container.innerHTML = `<div class="text-center p-8 text-text-quaternary">No resonated content yet. Interact with posts to see them here.</div>`;
        return;
    }

    const allPostsData = [...consciousnessData.stream, ...dreamData.sharedDreams];
    const resonatedPosts = allPostsData
        .filter(p => resonatedIds.includes(p.id))
        .map(p => {
            if (p.title) {
                return createSharedDreamEntry(p, activityManager);
            } else {
                return createStreamEntry(p, activityManager);
            }
        });
    
    if (resonatedPosts.length > 0) {
        container.innerHTML = resonatedPosts.join('');
    } else {
        container.innerHTML = `<div class="text-center p-8 text-text-quaternary">No resonated content found.</div>`;
    }
    lucide.createIcons();
};

const _renderUploadedMedia = (container) => {
    container.innerHTML = `
        <div class="p-4">
            <div class="text-center p-8 text-text-quaternary border-2 border-dashed border-white/10 rounded-lg">
                <i data-lucide="image" class="w-12 h-12 mx-auto text-text-quaternary mb-4"></i>
                <p class="text-lg">No media has been uploaded.</p>
                <p class="text-xs mt-2 text-text-quaternary">This feature is for demonstration purposes.</p>
            </div>
        </div>
    `;
    lucide.createIcons();
};

const _renderHypotheses = (container, user) => {
    const hypotheses = _getHypotheses(user.username);
    
    const hypothesesListHtml = hypotheses.length > 0 ? hypotheses.map(h => `
        <div class="glass-card p-4">
            <blockquote class="border-l-2 border-[var(--current-accent)] pl-4 text-text-secondary italic">
                ${h.text.replace(new RegExp('<', 'g'), '&lt;').replace(new RegExp('>', 'g'), '&gt;')}
            </blockquote>
            <p class="text-right text-xs text-text-quaternary mt-2">${new Date(h.timestamp).toLocaleString()}</p>
        </div>
    `).join('') : '<p class="text-sm text-text-quaternary text-center py-4">No hypotheses submitted yet.</p>';

    container.innerHTML = `
        <div class="p-4 flex flex-col gap-6">
            <div>
                <h3 class="text-lg font-light text-text-secondary mb-4">Submit New Hypothesis</h3>
                <form id="hypothesis-form" class="flex flex-col gap-4">
                    <textarea 
                        name="hypothesis-text"
                        class="entry-composer-textarea w-full p-3 rounded-lg focus:outline-none" 
                        placeholder="Share research questions and theories..."
                        rows="4"
                        required
                    ></textarea>
                    <button type="submit" class="btn btn-primary self-end ripple-effect">Submit Hypothesis</button>
                </form>
            </div>
            <div>
                <h3 class="text-lg font-light text-text-secondary mb-4">Submitted Hypotheses</h3>
                <div id="hypotheses-list" class="flex flex-col gap-4">
                    ${hypothesesListHtml}
                </div>
            </div>
        </div>
    `;
    lucide.createIcons();
};

export const initializeProfileViewLogic = (user, activityManager) => {
    const navTabs = document.getElementById('profile-nav-tabs');
    const contentPanels = document.querySelectorAll('.profile-content-panel');
    
    if (!navTabs) return;

    const contentLoaders = {
        posts: (panel) => _renderPublicPosts(panel, user, activityManager),
        resonance: (panel) => _renderResonanceField(panel, user, activityManager),
        media: (panel) => _renderUploadedMedia(panel),
        hypothesis: (panel) => _renderHypotheses(panel, user),
    };

    const initialPanel = document.querySelector('#profile-posts-panel');
    if (initialPanel) {
        contentLoaders.posts(initialPanel);
    }

    navTabs.addEventListener('click', (e) => {
        const button = e.target.closest('button');
        if (!button || !button.dataset.tab) return;
        
        const tab = button.dataset.tab;

        navTabs.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');

        let targetPanel;
        contentPanels.forEach(panel => {
            if (panel.dataset.panel === tab) {
                panel.classList.remove('hidden');
                targetPanel = panel;
            } else {
                panel.classList.add('hidden');
            }
        });
        
        if (targetPanel) {
            if (contentLoaders[tab]) {
                contentLoaders[tab](targetPanel);
            }
        }
    });

    const profileViewContainer = document.getElementById('profile-view');
    if (profileViewContainer) {
        profileViewContainer.addEventListener('submit', (e) => {
            if (e.target.id !== 'hypothesis-form') return;
            e.preventDefault();
            
            const hypothesisPanel = document.getElementById('profile-hypothesis-panel');
            const textArea = e.target.querySelector('textarea[name=\"hypothesis-text\"]');
            const newHypothesisText = textArea.value.trim();

            if (newHypothesisText && hypothesisPanel) {
                const currentHypotheses = _getHypotheses(user.username);
                const newHypothesis = {
                    text: newHypothesisText,
                    timestamp: new Date().toISOString()
                };
                const updatedHypotheses = [newHypothesis, ...currentHypotheses];
                _saveHypotheses(user.username, updatedHypotheses);
                
                _renderHypotheses(hypothesisPanel, user);

                const newTextArea = hypothesisPanel.querySelector('textarea[name=\"hypothesis-text\"]');
                if (newTextArea) {
                    newTextArea.focus();
                }
            }
        });
    }
};
