import { consciousnessData, dreamData, messengerData } from './data.js';
import { 
    createConsciousnessStatePanel, createAsciiVisualization, createNetworkStatusPanel, createEntryComposer,
    createStreamEntry, createSystemVitalsPanel, createActiveAgentsPanel, createReveriePortal, createDreamPatternsVisualization,
    createDreamStateMetricsPanel, createActiveDreamersPanel, createDreamComposer, createSharedDreamEntry, createDreamAnalyticsPanel,
    createEmergingSymbolsPanel, createDreamConnectionsPortal, createContactListItem, createMessageBubble, createMessengerHeader,
    createMessengerInput, createReplyComposer, createProfileView, initializeProfileViewLogic, createTypingIndicator
} from './components.js';
import { UserActivityManager, AuthenticationManager, DepthEnhancementManager, initWebGLBackground, renderThreadedEntries } from './core.js';
import { MessengerAI } from './messenger-ai.js';

function updateJournalToggle(activeJournal) {
    const toggleButtons = document.querySelectorAll('#journal-toggle .journal-toggle-btn');
    if (!toggleButtons.length) return;

    toggleButtons.forEach(btn => {
        if (btn.dataset.journal === activeJournal) {
            btn.classList.add('active-journal-btn');
        } else {
            btn.classList.remove('active-journal-btn');
        }
    });
}

class SearchEngine {
    constructor() {
        this.searchType = 'fuzzy';
        this.activeFilters = new Set(['all']);
        this.searchHistory = [];
        this.isVisible = false;
        this.init();
    }

    init() {
        this.bindEvents();
    }

    bindEvents() {
        const searchToggle = document.getElementById('search-toggle-btn');
        const searchInput = document.getElementById('global-search');
        const filterBtns = document.querySelectorAll('.filter-btn');

        searchToggle?.addEventListener('click', () => this.toggleSearch());
        searchInput?.addEventListener('input', (e) => this.performSearch(e.target.value));
        searchInput?.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.hideSearch();
        });
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => this.toggleFilter(btn.dataset.filter));
        });
    }

    toggleSearch() {
        if (this.isVisible) this.hideSearch();
        else this.showSearch();
    }

    showSearch() {
        const searchContainer = document.getElementById('search-container');
        const searchInput = document.getElementById('global-search');
        const feedFilters = document.getElementById('feed-search-filters');
        
        searchContainer?.classList.remove('hidden');
        feedFilters?.classList.remove('hidden');
        searchInput?.focus();
        this.isVisible = true;
    }

    hideSearch() {
        const searchContainer = document.getElementById('search-container');
        const feedFilters = document.getElementById('feed-search-filters');
        
        searchContainer?.classList.add('hidden');
        feedFilters?.classList.add('hidden');
        this.isVisible = false;
    }

    toggleFilter(filter) {
        const filterBtn = document.querySelector(`[data-filter=\"${filter}\"]`);
        
        if (filter === 'all') {
            this.activeFilters.clear();
            this.activeFilters.add('all');
            document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        } else {
            this.activeFilters.delete('all');
            if (this.activeFilters.has(filter)) {
                this.activeFilters.delete(filter);
            } else {
                this.activeFilters.add(filter);
            }
        }

        if (this.activeFilters.size === 0) {
            this.activeFilters.add('all');
        }
        this.updateFilterUI();
    }

    updateFilterUI() {
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.toggle('active', this.activeFilters.has(btn.dataset.filter));
        });
    }

    performSearch(query) {
        if (!query.trim()) {
            this.clearSearchResults();
            return;
        }

        if (!this.searchHistory.includes(query)) {
            this.searchHistory.unshift(query);
            this.searchHistory = this.searchHistory.slice(0, 10);
        }

        const results = this.searchContent(query);
        this.displaySearchResults(results);
    }

    searchContent(query) {
        const allEntries = [
            ...consciousnessData.stream.map(entry => ({ ...entry, journal: 'consciousness' })),
            ...dreamData.sharedDreams.map(entry => ({ ...entry, journal: 'dream' }))
        ];

        return allEntries.filter(entry => {
            if (!this.activeFilters.has('all')) {
                if (this.activeFilters.has('consciousness') && entry.journal !== 'consciousness') return false;
                if (this.activeFilters.has('dream') && entry.journal !== 'dream') return false;
                if (this.activeFilters.has('public') && entry.privacy !== 'public') return false;
            }
            return this.fuzzyMatch(query, entry);
        });
    }

    fuzzyMatch(query, entry) {
        const searchText = `${entry.content} ${entry.title || ''} ${entry.type} ${entry.agent}`.toLowerCase();
        const queryLower = query.toLowerCase();
        let queryIndex = 0;
        for (let i = 0; i < searchText.length && queryIndex < queryLower.length; i++) {
            if (searchText[i] === queryLower[queryIndex]) {
                queryIndex++;
            }
        }
        return queryIndex === queryLower.length;
    }

    displaySearchResults(results) {
        console.log('Search results:', results);
    }
    clearSearchResults() {
        console.log('Clearing search results');
    }
}

document.addEventListener('DOMContentLoaded', () => {

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

    const authManager = new AuthenticationManager();


    const savedProfile = localStorage.getItem('liminal_user_profile');
    if (savedProfile && authManager.currentUser) {
        try {
            const profileData = JSON.parse(savedProfile);
            if (profileData.banner) {
                authManager.currentUser.profileBanner = profileData.banner;
            }
            if (profileData.avatar) {
                authManager.currentUser.avatar = profileData.avatar;
                const profileAvatarDiv = document.getElementById('profile-avatar');
                if (profileAvatarDiv) {
                    profileAvatarDiv.innerHTML = `<img src=\"${profileData.avatar}\" class=\"w-full h-full rounded-full object-cover\">`;
                }
            }
            if (typeof profileData.bio === 'string') {
                authManager.currentUser.bio = profileData.bio;
            }
        } catch (e) {
            console.error('Failed to parse user profile data from localStorage', e);
            localStorage.removeItem('liminal_user_profile');
        }
    }
    
    const searchEngine = new SearchEngine();
    const messengerAI = new MessengerAI();
    messengerAI.initialize();
    const depthManager = new DepthEnhancementManager();
    const activityManager = new UserActivityManager();
    
    window.activityManager = activityManager;
    
    lucide.createIcons();
    

    if (!isPerformanceMode) {
        try {
            initWebGLBackground();
        } catch (e) {
            console.error("WebGL Background initialization failed. Switching to Performance Mode.", e);
            if (localStorage.getItem('liminal_performance_mode') !== 'true') {
                localStorage.setItem('liminal_performance_mode', 'true');
                location.reload();
            }
        }
    }
    
    const appContainer = document.getElementById('app-container');
    const journalToggle = document.getElementById('journal-toggle');
    const navLinks = document.getElementById('nav-links');
    const consciousnessView = document.getElementById('consciousness-journal');
    const dreamView = document.getElementById('dream-journal');
    const nexusFeedView = document.getElementById('nexus-feed-view');
    const resonanceFieldView = document.getElementById('resonance-field-view');
    const profileView = document.getElementById('profile-view');
    const journalTitle = document.getElementById('journal-title');
    const journalStatus = document.getElementById('journal-status');
    const root = document.documentElement;
    const messengerView = document.getElementById('messenger-view');
    const openMessengerBtn = document.getElementById('open-messenger-btn');
    const closeMessengerBtn = document.getElementById('close-messenger-btn');
    const profileToggleBtn = document.getElementById('profile-toggle-btn');
    const closeProfileBtn = document.getElementById('close-profile-btn');
    const editProfileModal = document.getElementById('edit-profile-modal');


    let activeView = 'consciousness';
    let currentObserver = null;

    function setupEntryObserver(scrollContainer) {
        if (currentObserver) {
            currentObserver.disconnect();
        }

        if (!scrollContainer) return;

        const entries = scrollContainer.querySelectorAll('.stream-entry-lazy-load');
        if (entries.length === 0) return;

        currentObserver = new IntersectionObserver((observedEntries, obs) => {
            observedEntries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('in-view');
                    obs.unobserve(entry.target);
                }
            });
        }, {
            root: scrollContainer,
            threshold: 0.1,
            rootMargin: '0px 0px -5% 0px'
        });

        entries.forEach(entry => {
            currentObserver.observe(entry);
        });
    }

    function findPostById(postId) {
        const dataStreams = [consciousnessData.stream, dreamData.sharedDreams];
        for (const stream of dataStreams) {
            const queue = [...stream];
            while (queue.length > 0) {
                const post = queue.shift();
                if (post.id === postId) {
                    return post;
                }
                if (post.children && post.children.length > 0) {
                    queue.push(...post.children);
                }
            }
        }
        return null;
    }
    
    function createUniversalEntry(post, activityManager) {
        if (post.title) {
            return createSharedDreamEntry(post, activityManager);
        }
        return createStreamEntry(post, activityManager);
    }

    window.renderView = function(view) {
        if (!authManager.isAuthenticated) {
            authManager.showAuthPanel();
            return;
        }

        activeView = view;
        window.scrollTo(0, 0);
        document.body.dataset.view = view;

        [consciousnessView, dreamView, nexusFeedView, resonanceFieldView, profileView].forEach(panel => {
            if (panel) {
                panel.style.display = 'none';
            }
        });

        if (view === 'consciousness') {
            consciousnessView.style.display = 'grid';
            journalTitle.textContent = "[NEXUS] // LIMINAL LOGBOOK";
            journalStatus.textContent = "Consciousness State Active";
            root.style.setProperty('--current-accent', 'var(--accent-emerald)');
            root.style.setProperty('--current-accent-rgb', '52, 211, 153');
            updateJournalToggle('consciousness');
            renderConsciousnessView();
        } else if (view === 'dream') {
            dreamView.style.display = 'grid';
            journalTitle.textContent = "[NEXUS] // DREAM SYNTHESIS";
            journalStatus.textContent = "Dream State Active";
            root.style.setProperty('--current-accent', 'var(--accent-purple)');
            root.style.setProperty('--current-accent-rgb', '139, 92, 246');
            updateJournalToggle('dream');
            renderDreamView();
        } else if (view === 'feed') {
            nexusFeedView.style.display = 'block';
            journalTitle.textContent = "[NEXUS] // NEXUS FEED";
            journalStatus.textContent = "Public Stream Active";
            renderNexusFeedView();
        } else if (view === 'resonance') {
            resonanceFieldView.style.display = 'block';
            journalTitle.textContent = "[NEXUS] // RESONANCE FIELD";
            journalStatus.textContent = "Collective Coherence View";
            root.style.setProperty('--current-accent', 'var(--accent-cyan)');
            root.style.setProperty('--current-accent-rgb', '34, 211, 238');
            renderResonanceFieldView();
        } else if (view === 'profile') {
            profileView.style.display = 'block';
            journalTitle.textContent = "[NEXUS] // USER PROFILE";
            journalStatus.textContent = "Viewing Public Identity";
            renderProfileView();
        }
        
        setTimeout(() => lucide.createIcons(), 100);
    }
    
    function renderConsciousnessView() {
        const leftSidebar = document.getElementById('consciousness-left-sidebar');
        const mainContent = consciousnessView.querySelector('main');
        const rightSidebar = document.getElementById('consciousness-right-sidebar');

        leftSidebar.innerHTML = `${createConsciousnessStatePanel(consciousnessData.consciousnessState)}${createAsciiVisualization(consciousnessData.consciousnessField, 'consciousness-field')}${createNetworkStatusPanel(consciousnessData.networkStatus)}`;
        mainContent.innerHTML = `${createEntryComposer(consciousnessData.entryComposer)}<div id=\"consciousness-stream\" class=\"flex flex-col gap-6\">${renderThreadedEntries(consciousnessData.stream, createStreamEntry, activityManager)}</div>`;
        rightSidebar.innerHTML = `${createSystemVitalsPanel(consciousnessData.systemVitals)}${createActiveAgentsPanel(consciousnessData.activeAgents)}${createReveriePortal()}`;
        
        depthManager.setupDepthResponsiveElements();
        setupEntryObserver(mainContent);
    }

    function renderDreamView() {
        const leftSidebar = document.getElementById('dream-left-sidebar');
        const mainContent = document.getElementById('dream-main-content');
        const rightSidebar = document.getElementById('dream-right-sidebar');

        leftSidebar.innerHTML = `${createDreamPatternsVisualization({id: 'dream-patterns-field', ...dreamData.dreamPatterns})}${createDreamStateMetricsPanel(dreamData.dreamStateMetrics)}${createActiveDreamersPanel(dreamData.activeDreamers)}`;
        mainContent.innerHTML = `${createDreamComposer(dreamData.dreamComposer)}<div id=\"dream-stream\" class=\"flex flex-col gap-6\">${renderThreadedEntries(dreamData.sharedDreams, createSharedDreamEntry, activityManager)}</div>`;
        rightSidebar.innerHTML = `${createDreamAnalyticsPanel(dreamData.dreamAnalytics)}${createEmergingSymbolsPanel(dreamData.emergingSymbols)}${createDreamConnectionsPortal()}`;
        
        depthManager.setupDepthResponsiveElements();
        setupEntryObserver(mainContent);
    }
    
    function renderNexusFeedView() {
        const publicPosts = [
            ...consciousnessData.stream.filter(p => p.privacy === 'public'),
            ...dreamData.sharedDreams.filter(p => p.privacy === 'public')
        ];

        let feedHtml = '<div class=\"flex flex-col gap-6 max-w-4xl mx-auto w-full\">';
        feedHtml += renderThreadedEntries(publicPosts, createUniversalEntry, activityManager);
        feedHtml += '</div>';
        nexusFeedView.innerHTML = feedHtml;

        depthManager.setupDepthResponsiveElements();
        setupEntryObserver(nexusFeedView);
        setTimeout(() => lucide.createIcons(), 100);
    }

    function renderResonanceFieldView() {
       const resonatedPosts = activityManager.getResonanceField(consciousnessData, dreamData);

       if (resonatedPosts.length === 0) {
           resonanceFieldView.innerHTML = `<div class=\"text-center p-10 text-text-tertiary\">\n               <h2 class=\"text-2xl font-light mb-4\">The Resonance Field is Quiet</h2>\n               <p class=\"max-w-md mx-auto\">Resonate with entries from the Nexus Feed, Consciousness Stream, or Dream Synthesis to see them here. This space reflects the collective coherence of your interactions.</p>\n           </div>`;
           return;
       }
       
       let feedHtml = '<div class=\"flex flex-col gap-6 max-w-4xl mx-auto w-full\">';
       feedHtml += renderThreadedEntries(resonatedPosts, createUniversalEntry, activityManager);
       feedHtml += '</div>';
       resonanceFieldView.innerHTML = feedHtml;

       depthManager.setupDepthResponsiveElements();
       setupEntryObserver(resonanceFieldView);
       setTimeout(() => lucide.createIcons(), 100);
   }

    function renderProfileView() {
        if (!authManager.currentUser) {
            console.error("No user logged in to show profile.");
            window.renderView('consciousness');
            return;
        }
        
        const user = authManager.currentUser;
        const profileData = {
            ...user,
            handle: `@${user.username}`,
            bio: user.bio || 'Navigating the liminal spaces between thought and reality. Architect of the Nexus. All entries are quantum superpositions of meaning.',
            location: user.location || 'The Liminal Space',
            stats: { ...user.stats, following: 128, followers: '1.2M' }
        };
        
        const profileHtml = createProfileView(profileData, activityManager);
        profileView.innerHTML = profileHtml;

        const bannerElement = profileView.querySelector('.profile-banner');
        if (bannerElement) {
            const bannerUrl = profileData.profileBanner || 'https://images.unsplash.com/photo-1544733422-263e5e508868?q=80&w=2070&auto=format&fit=crop';
            bannerElement.style.backgroundImage = `url('${bannerUrl}')`;
        }

        const avatarElement = profileView.querySelector('.profile-avatar-lg');
        if (avatarElement) {
            if (profileData.avatar) {
                avatarElement.innerHTML = `<img src=\"${profileData.avatar}\" class=\"w-full h-full object-cover\">`;
            } else {
                const initials = (user.name || 'AD').split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase();
                avatarElement.innerHTML = `<span class=\"flex items-center justify-center h-full\">${initials}</span>`;
            }
        }

        initializeProfileViewLogic(profileData, activityManager);
        
        depthManager.setupDepthResponsiveElements();
        setupEntryObserver(profileView);
        setTimeout(() => lucide.createIcons(), 100);
    }
    
    function renderMessengerView(contactId = 'aura-7') {
        const contactListContainer = messengerView.querySelector('.overflow-y-auto');
        const headerContainer = document.getElementById('messenger-header-container');
        const messageArea = document.getElementById('messenger-message-area');
        const inputContainer = document.getElementById('messenger-input-container');

        const allContacts = messengerAI.injectAIContacts(messengerData.contacts);
        const contactsHtml = allContacts.map(c => createContactListItem(c, c.id === contactId)).join('');
        if (contactListContainer) contactListContainer.innerHTML = contactsHtml;

        const allContacts2 = messengerAI.injectAIContacts(messengerData.contacts);
        const activeContact = allContacts2.find(c => c.id === contactId);
        const conversation = messengerData.conversations[contactId];

        if (activeContact) {
            if(headerContainer) headerContainer.innerHTML = createMessengerHeader(activeContact);
            if(messageArea) {
                const messagesHtml = conversation ? conversation.map(msg => createMessageBubble(msg, activeContact)).join('') : '<p class=\"text-center text-text-quaternary p-8\">No messages yet.</p>';
                messageArea.innerHTML = messagesHtml;
            }
            if(inputContainer) inputContainer.innerHTML = createMessengerInput(activeContact);
        }
        lucide.createIcons();
        messengerAI.addSettingsButton();
    }
    
    openMessengerBtn?.addEventListener('click', () => {
        messengerView?.classList.remove('hidden');
        messengerView?.classList.add('flex');
        renderMessengerView();
    });

    closeMessengerBtn?.addEventListener('click', () => {
        messengerView?.classList.add('hidden');
        messengerView?.classList.remove('flex');
    });

    messengerView?.addEventListener('click', (e) => {
        if (e.target.id === 'messenger-view') {
            messengerView?.classList.add('hidden');
            messengerView?.classList.remove('flex');
        }
        const contactItem = e.target.closest('.contact-list-item');
        if (contactItem && contactItem.dataset.contactId) {
            renderMessengerView(contactItem.dataset.contactId);
        }
    });

    messengerView.addEventListener('submit', (e) => {
        if (e.target.classList.contains('messenger-input-form')) {
            e.preventDefault();
            const input = e.target.querySelector('input[name=\"message\"]');
            const messageContent = input.value.trim();
            const activeContactItem = document.querySelector('.contact-list-item.active-contact');
            if (!activeContactItem) return;
            
            const contactId = activeContactItem.dataset.contactId;

            if (messageContent && contactId) {
                const activeContact = messengerAI.aiContacts.find(c => c.id === contactId);
                
                if (activeContact && activeContact.isAI) {
                    // Handle AI message
                    const messageArea = document.getElementById('messenger-message-area');
                    messageArea.insertAdjacentHTML('afterbegin', createMessageBubble({ sender: 'me', content: messageContent, timestamp: 'Now' }, {}));
                    input.value = '';
                    
                    // Send to AI
                    messengerAI.handleAIMessage(messageContent, contactId);
                } else {
                    const conversation = messengerData.conversations[contactId];
                if (conversation) {
                    const newMessage = { sender: 'me', content: messageContent, timestamp: 'Now' };
                    conversation.push(newMessage);
                    
                    const messageArea = document.getElementById('messenger-message-area');
                    messageArea.insertAdjacentHTML('afterbegin', createMessageBubble(newMessage, {}));
                    input.value = '';
                }
            }
        }
    });

    profileToggleBtn?.addEventListener('click', () => authManager.showProfilePanel());
    closeProfileBtn?.addEventListener('click', () => authManager.hideProfilePanel());
    document.getElementById('profile-overlay')?.addEventListener('click', (e) => {
        if (e.target.id === 'profile-overlay') authManager.hideProfilePanel();
    });



    const bioInput = document.getElementById('bio-input');
    const saveProfileBtn = document.getElementById('save-profile-btn');

    const bannerInput = document.getElementById('banner-image-upload');
    const bannerPreview = document.getElementById('banner-preview');
    const bannerPreviewImg = document.getElementById('banner-preview-img');
    const bannerUploader = document.getElementById('banner-uploader');
    const removeBannerBtn = document.getElementById('remove-banner-btn');

    const profilePicInput = document.getElementById('profile-pic-upload');
    const profilePicPreview = document.getElementById('profile-pic-preview');
    const profilePicPreviewImg = document.getElementById('profile-pic-preview-img');
    const profilePicUploader = document.getElementById('profile-pic-uploader');
    const removeProfilePicBtn = document.getElementById('remove-profile-pic-btn');

    const handleImageUpload = (e, type) => {
        const file = e.target.files[0];
        if (!file || !file.type.startsWith('image/')) return;
        
        const reader = new FileReader();
        reader.onload = (loadEvent) => {
            const dataUrl = loadEvent.target.result;
            if (type === 'banner') {
                bannerPreviewImg.src = dataUrl;
                bannerPreview.classList.remove('hidden');
                bannerUploader.classList.add('hidden');
            } else if (type === 'profile') {
                profilePicPreviewImg.src = dataUrl;
                profilePicPreview.classList.remove('hidden');
                profilePicUploader.classList.add('hidden');
            }
        };
        reader.readAsDataURL(file);
    };

    const resetEditModalVisuals = () => {
        bioInput.value = '';
        
        bannerInput.value = null;
        bannerPreviewImg.src = '';
        bannerPreview.classList.add('hidden');
        bannerUploader.classList.remove('hidden');

        profilePicInput.value = null;
        profilePicPreviewImg.src = '';
        profilePicPreview.classList.add('hidden');
        profilePicUploader.classList.remove('hidden');
    };

    const openEditModal = () => {
        if (!editProfileModal || !authManager.currentUser) return;
        
        authManager.hideProfilePanel();
        resetEditModalVisuals();

        const user = authManager.currentUser;
        bioInput.value = user.bio || '';

        if (user.profileBanner) {
            bannerPreviewImg.src = user.profileBanner;
            bannerPreview.classList.remove('hidden');
            bannerUploader.classList.add('hidden');
        }

        if (user.avatar && user.avatar !== 'AD') {
            profilePicPreviewImg.src = user.avatar;
            profilePicPreview.classList.remove('hidden');
            profilePicUploader.classList.add('hidden');
        }

        editProfileModal.style.display = 'flex';
        setTimeout(() => lucide.createIcons(), 50);
    };

    const closeEditModal = () => {
        if (editProfileModal) {
            editProfileModal.style.display = 'none';
        }
    };
    
    saveProfileBtn?.addEventListener('click', () => {
        if (!authManager.currentUser) return;

        const newBannerSrc = bannerPreview.classList.contains('hidden') ? null : bannerPreviewImg.src;
        const newProfilePicSrc = profilePicPreview.classList.contains('hidden') ? null : profilePicPreviewImg.src;
        const newBio = bioInput.value;

        authManager.currentUser.profileBanner = newBannerSrc;
        authManager.currentUser.avatar = newProfilePicSrc;
        authManager.currentUser.bio = newBio;

        const userProfileData = {
            banner: newBannerSrc,
            avatar: newProfilePicSrc,
            bio: newBio
        };
        
        try {
            localStorage.setItem('liminal_user_profile', JSON.stringify(userProfileData));
        } catch (e) {
            console.error("Error saving profile data to localStorage. It's possible the image files are too large.", e);
        }

        const profileAvatarDiv = document.getElementById('profile-avatar');
        if (profileAvatarDiv) {
            if (newProfilePicSrc) {
                profileAvatarDiv.innerHTML = `<img src=\"${newProfilePicSrc}\" class=\"w-full h-full rounded-full object-cover\">`;
            } else {
                 const initials = (authManager.currentUser.name || 'AD').split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase();
                 profileAvatarDiv.innerHTML = `<span id=\"profile-initials\">${initials}</span>`;
            }
        }

        if (document.body.dataset.view === 'profile') {
            renderProfileView();
        }

        closeEditModal();
    });

    bannerInput?.addEventListener('change', (e) => handleImageUpload(e, 'banner'));
    profilePicInput?.addEventListener('change', (e) => handleImageUpload(e, 'profile'));

    bannerUploader?.addEventListener('click', () => bannerInput.click());
    profilePicUploader?.addEventListener('click', () => profilePicInput.click());
    
    removeBannerBtn?.addEventListener('click', () => {
        bannerInput.value = null;
        bannerPreviewImg.src = '';
        bannerPreview.classList.add('hidden');
        bannerUploader.classList.remove('hidden');
    });

    removeProfilePicBtn?.addEventListener('click', () => {
        profilePicInput.value = null;
        profilePicPreviewImg.src = '';
        profilePicPreview.classList.add('hidden');
        profilePicUploader.classList.remove('hidden');
    });

    document.getElementById('edit-profile-btn')?.addEventListener('click', openEditModal);
    
    document.getElementById('cancel-edit-profile-btn')?.addEventListener('click', closeEditModal);
    document.getElementById('close-edit-modal-btn')?.addEventListener('click', closeEditModal);
    
    editProfileModal?.addEventListener('click', (e) => {
        if (e.target.id === 'edit-profile-modal') {
            closeEditModal();
        }
    });

    document.getElementById('export-data-btn')?.addEventListener('click', () => console.log('Export Data clicked.'));

    journalToggle?.addEventListener('click', (e) => {
        const btn = e.target.closest('.journal-toggle-btn');
        if (btn && activeView !== btn.dataset.journal) {
            window.renderView(btn.dataset.journal);
        }
    });

    navLinks.addEventListener('click', (e) => {
        const link = e.target.closest('li[data-view]');
        if (link && activeView !== link.dataset.view) {
            window.renderView(link.dataset.view);
        }
    });

    appContainer.addEventListener('click', (e) => {
        const targetButton = e.target.closest('button[data-action]');
        if (!targetButton) return;
    
        const action = targetButton.dataset.action;
        if (!action) return;
        
        const postId = targetButton.dataset.postId || targetButton.closest('[data-post-id]')?.dataset.postId || targetButton.closest('[data-parent-id]')?.dataset.parentId;
        const postData = postId ? findPostById(postId) : null;
    
        e.stopPropagation();
        e.preventDefault();

        switch (action) {
            case 'edit-profile':
                openEditModal();
                break;
                
            case 'commit-to-stream': {
                const composer = targetButton.closest('.glass-panel');
                const textarea = composer.querySelector('textarea');
                const select = composer.querySelector('select');
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
                    const streamContainer = document.getElementById('consciousness-stream');
                    if (streamContainer) {
                        streamContainer.insertAdjacentHTML('afterbegin', createStreamEntry(newEntry, activityManager));
                        
                        const newElement = streamContainer.firstChild;
                        if (newElement) {
                           newElement.classList.add('in-view');
                        }

                        textarea.value = '';
                        lucide.createIcons();
                    }
                }
                break;
            }

            case 'resonate':
                if (postData && activityManager.addResonance(postId, postData)) {
                    postData.interactions.resonances++;
                    targetButton.classList.add('resonated');
                    const countEl = targetButton.querySelector('.interaction-count');
                    if (countEl) countEl.textContent = postData.interactions.resonances;
                }
                break;
    
            case 'amplify':
                 if (postData && activityManager.addAmplification(postId)) {
                    postData.interactions.amplifications++;
                    targetButton.classList.add('amplified');
                    const postCard = targetButton.closest('.glass-card');
                    if (postCard) postCard.classList.add('amplified-post');
                    const countEl = targetButton.querySelector('.interaction-count');
                    if (countEl) countEl.textContent = postData.interactions.amplifications;
                }
                break;

            case 'interpret':
            case 'branch': {
                const postCard = targetButton.closest('.glass-card');
                if (!postCard) break;

                const branchContainer = postCard.querySelector('.branch-container');
                if (branchContainer) {
                    const existingComposer = branchContainer.querySelector('.reply-composer');
                    if (existingComposer) {
                        existingComposer.remove();
                    } else {
                        const placeholder = action === 'interpret' 
                            ? 'Interpret this dream...' 
                            : 'Branch your thoughts...';
                        branchContainer.innerHTML = createReplyComposer(postId, placeholder);
                        branchContainer.style.display = 'flex';
                        branchContainer.querySelector('textarea')?.focus();
                    }
                }
                break;
            }
    
            case 'submit-reply': {
                const composer = targetButton.closest('.reply-composer');
                const textarea = composer.querySelector('textarea');
                const content = textarea.value.trim();
    
                if (content && postData && authManager.currentUser) {
                    const isDreamPost = !!postData.title; 
                    const newReply = {
                        id: `${isDreamPost ? 'dream' : 'consciousness'}_${Date.now()}`,
                        parentId: postId,
                        children: [],
                        depth: postData.depth + 1,
                        timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
                        agent: authManager.currentUser.name,
                        content: content,
                        interactions: { resonances: 0, branches: 0, amplifications: 0, shares: 0 },
                        type: postData.type,
                        privacy: postData.privacy,
                        isAmplified: false,
                        ...(isDreamPost ? {
                            title: `Re: ${postData.title}`,
                            tags: [],
                            resonance: Math.random(),
                            coherence: Math.random(),
                        } : {
                            connections: Math.floor(Math.random() * 10),
                            metrics: { c: Math.random(), r: Math.random(), x: Math.random() }
                        }),
                    };

                    if (!postData.children) {
                        postData.children = [];
                    }
                    postData.children.push(newReply);
                    postData.interactions.branches++;
                    
                    const branchContainer = composer.parentElement;
                    const postCard = branchContainer.closest('.glass-card');
                    const createEntryFunc = isDreamPost ? createSharedDreamEntry : createStreamEntry;
                    
                    composer.remove();
                    branchContainer.insertAdjacentHTML('beforeend', createEntryFunc(newReply, activityManager));
                    
                    const newReplyElement = branchContainer.lastElementChild;
                    if (newReplyElement) {
                        newReplyElement.classList.add('in-view');
                    }
                    
                    branchContainer.style.display = 'flex'; 
                    lucide.createIcons();

                    if(postCard) {
                        const actionName = isDreamPost ? 'interpret' : 'branch';
                        const parentBranchBtn = postCard.querySelector(`button[data-post-id=\"${postId}\"][data-action=\"${actionName}\"]`);
                        if(parentBranchBtn) {
                            const countEl = parentBranchBtn.querySelector('.interaction-count');
                            if (countEl) countEl.textContent = postData.interactions.branches;
                        }
                    }
                }
                break;
            }

            case 'cancel-reply': {
                const composer = targetButton.closest('.reply-composer');
                if (composer) {
                    const branchContainer = composer.parentElement;
                    composer.remove();
                    if (branchContainer && branchContainer.children.length === 0) {
                        branchContainer.style.display = 'none';
                    }
                }
                break;
            }

            case 'share':
                console.log(`Sharing post ${postId}`);
                break;
        }
    });

    if (authManager.isAuthenticated) {
        window.renderView('consciousness');
    } else {
        setTimeout(() => authManager.showAuthPanel(), 100);
    }
});
