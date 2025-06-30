export class UserActivityManager {
    constructor() {
        this.userActivity = this.loadUserActivity();
        this.init();
    }

    init() {
        if (!this.userActivity.resonatedPosts) {
            this.userActivity = {
                resonatedPosts: [],
                branchedPosts: [],
                amplifiedPosts: [],
                sharedPosts: [],
                totalInteractions: 0,
                joinDate: new Date().toISOString()
            };
            this.saveUserActivity();
        }
    }

    loadUserActivity() {
        const saved = localStorage.getItem('liminal_user_activity');
        return saved ? JSON.parse(saved) : {};
    }

    saveUserActivity() {
        localStorage.setItem('liminal_user_activity', JSON.stringify(this.userActivity));
    }

    addResonance(postId, postData) {
        if (!this.userActivity.resonatedPosts.includes(postId)) {
            this.userActivity.resonatedPosts.push(postId);
            this.userActivity.totalInteractions++;
            this.saveUserActivity();
            return true;
        }
        return false;
    }

    addBranch(postId, branchData) {
        this.userActivity.branchedPosts.push({
            parentId: postId,
            branchId: branchData.id,
            timestamp: new Date().toISOString()
        });
        this.userActivity.totalInteractions++;
        this.saveUserActivity();
    }

    addAmplification(postId) {
        if (!this.userActivity.amplifiedPosts.includes(postId)) {
            this.userActivity.amplifiedPosts.push(postId);
            this.userActivity.totalInteractions++;
            this.saveUserActivity();
            return true;
        }
        return false;
    }

    addShare(postId, platform) {
        this.userActivity.sharedPosts.push({
            postId: postId,
            platform: platform,
            timestamp: new Date().toISOString()
        });
        this.userActivity.totalInteractions++;
        this.saveUserActivity();
    }

    hasResonated(postId) {
        return this.userActivity.resonatedPosts.includes(postId);
    }

    hasAmplified(postId) {
        return this.userActivity.amplifiedPosts.includes(postId);
    }

    getResonanceField(consciousnessData, dreamData) {
        const allPosts = [...consciousnessData.stream, ...dreamData.sharedDreams];
        return allPosts.filter(post => this.userActivity.resonatedPosts.includes(post.id));
    }

    getActivityStats() {
        return {
            totalInteractions: this.userActivity.totalInteractions,
            resonances: this.userActivity.resonatedPosts.length,
            branches: this.userActivity.branchedPosts.length,
            amplifications: this.userActivity.amplifiedPosts.length,
            shares: this.userActivity.sharedPosts.length
        };
    }
}

export class AuthenticationManager {
    constructor() {
        this.isAuthenticated = false;
        this.currentUser = null;
        this.sessionToken = null;
        this.init();
    }

    init() {
        const savedToken = localStorage.getItem('liminal_session_token');
        const savedUser = localStorage.getItem('liminal_user_data');
        
        if (savedToken && savedUser) {
            this.sessionToken = savedToken;
            this.currentUser = JSON.parse(savedUser);
            this.isAuthenticated = true;
        } else {
            this.programmaticLogin();
        }
        
        this.bindEvents();
    }

    programmaticLogin() {
        const userData = {
            username: 'admin',
            name: 'Admin User',
            role: 'Consciousness Architect',
            avatar: 'AD',
            joinDate: '2025-01-01',
            stats: {
                entries: 42,
                dreams: 18,
                connections: 7
            }
        };

        this.sessionToken = this.generateToken();
        this.currentUser = userData;
        this.isAuthenticated = true;

        localStorage.setItem('liminal_session_token', this.sessionToken);
        localStorage.setItem('liminal_user_data', JSON.stringify(userData));
    }

    bindEvents() {
        const logoutBtn = document.getElementById('logout-btn');
        logoutBtn?.addEventListener('click', () => {
            this.handleLogout();
        });
    }

    handleLogout() {
        this.isAuthenticated = false;
        this.currentUser = null;
        this.sessionToken = null;

        localStorage.removeItem('liminal_session_token');
        localStorage.removeItem('liminal_user_data');
        
        location.reload(); 
    }

    generateToken() {
        return 'token_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
    }

    showAuthPanel() {}

    hideAuthPanel() {}

    showProfilePanel() {
        if (!this.isAuthenticated) return;
        
        const profileOverlay = document.getElementById('profile-overlay');
        profileOverlay?.classList.remove('hidden');
        
        if (this.currentUser) {
            document.getElementById('profile-initials').textContent = this.currentUser.avatar;
            document.getElementById('profile-name').textContent = this.currentUser.name;
            document.getElementById('profile-role').textContent = this.currentUser.role;
            document.getElementById('stat-entries').textContent = this.currentUser.stats.entries;
            document.getElementById('stat-dreams').textContent = this.currentUser.stats.dreams;
            document.getElementById('stat-connections').textContent = this.currentUser.stats.connections;
        }
    }

    hideProfilePanel() {
        const profileOverlay = document.getElementById('profile-overlay');
        profileOverlay?.classList.add('hidden');
    }

    showError(message) {
        alert(message);
    }

    updateUI() {
        const profileBtn = document.getElementById('profile-toggle-btn');
        if (profileBtn && this.isAuthenticated) {
            profileBtn.style.display = 'block';
        }
    }
}

export function initWebGLBackground() {
    let scene, camera, renderer, material, mesh;
    let uniforms;
    const canvas = document.getElementById('webgl-canvas');

    if (!canvas || !window.WebGLRenderingContext) {
        console.warn("WebGL not supported or canvas not found.");
        return;
    }
    try {
        renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    } catch (e) {
        console.error("Could not initialize WebGL renderer.", e);
        return;
    }
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    scene = new THREE.Scene();
    camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    uniforms = {
        u_time: { value: 0.0 },
        u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        u_mouse: { value: new THREE.Vector2(0.5, 0.5) },
        u_intensity: { value: 0.6 },
    };

    const vertexShader = `void main() { gl_Position = vec4(position, 1.0); }`;
    const fragmentShader = `
        uniform vec2 u_resolution;
        uniform float u_time;
        uniform vec2 u_mouse;
        uniform float u_intensity;

        vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }

        float snoise(vec2 v) {
            const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
            vec2 i  = floor(v + dot(v, C.yy));
            vec2 x0 = v - i + dot(i, C.xx);
            vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
            vec4 x12 = x0.xyxy + C.xxzz;
            x12.xy -= i1;
            i = mod(i, 289.0);
            vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
            vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
            m = m*m; m = m*m;
            vec3 x = 2.0 * fract(p * C.www) - 1.0;
            vec3 h = abs(x) - 0.5;
            vec3 ox = floor(x + 0.5);
            vec3 a0 = x - ox;
            m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
            vec3 g;
            g.x  = a0.x  * x0.x  + h.x  * x0.y;
            g.yz = a0.yz * x12.xz + h.yz * x12.yw;
            return 130.0 * dot(m, g);
        }

        float fbm(vec2 p) {
            float value = 0.0;
            float amplitude = 0.5;
            for (int i = 0; i < 5; i++) {
                value += amplitude * snoise(p);
                p *= 2.0;
                amplitude *= 0.5;
            }
            return value;
        }

        void main() {
            vec2 st = gl_FragCoord.xy / u_resolution.xy;
            st.x *= u_resolution.x / u_resolution.y;

            float time = u_time * 0.00003;
            float speed_x = time;
            float speed_y = time * 0.8;

            vec2 q = vec2(
                fbm(st + vec2(speed_x, speed_y)),
                fbm(st + vec2(5.2 + speed_x * 0.5, 1.3 + speed_y * 0.5))
            );

            vec2 r = vec2(
                fbm(st + q * u_intensity + vec2(1.7, 9.2) - vec2(speed_y, speed_x)),
                fbm(st + q * u_intensity + vec2(8.3, 2.8) - vec2(speed_y, speed_x))
            );

            float v = fbm(r * 0.8);

            float color_val = pow(v * 0.5 + 0.5, 2.0);

            vec3 final_color = vec3(color_val * 0.2, color_val * 0.25, color_val * 0.35);

            gl_FragColor = vec4(final_color, 1.0);
        }
    `;
    
    material = new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader });
    mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(mesh);

    const clock = new THREE.Clock();
    function animate() {
        requestAnimationFrame(animate);
        uniforms.u_time.value = clock.getElapsedTime() * 1000;
        renderer.render(scene, camera);
    }
    animate();

    window.addEventListener('resize', () => {
        renderer.setSize(window.innerWidth, window.innerHeight);
        uniforms.u_resolution.value.set(window.innerWidth, window.innerHeight);
    });
}

export class DepthEnhancementManager {
    constructor() {
        this.isParallaxEnabled = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        this.init();
    }
    init() {
        if (this.isParallaxEnabled) {
            this.setupParallaxScrolling();
        }
        this.setupDepthResponsiveElements();
    }
    setupParallaxScrolling() {}
    setupDepthResponsiveElements() {
        document.querySelectorAll('.depth-near').forEach((el, index) => { el.style.animationDelay = `${index * 50}ms`; });
        document.querySelectorAll('.depth-mid').forEach((el, index) => { el.style.animationDelay = `${index * 75}ms`; });
        document.querySelectorAll('.depth-far').forEach((el, index) => { el.style.animationDelay = `${index * 100}ms`; });
    }
}

export function renderThreadedEntries(entries, createEntryFunc, activityManager) {
    const entriesById = new Map(entries.map(entry => [entry.id, { ...entry, children: [] }]));
    const rootEntries = [];

    for (const entry of entriesById.values()) {
        if (entry.parentId && entriesById.has(entry.parentId)) {
            const parent = entriesById.get(entry.parentId);
            if (parent && parent.children) {
                parent.children.push(entry);
            }
        } else {
            rootEntries.push(entry);
        }
    }

    for (const entry of entriesById.values()) {
        if (entry.children && entry.children.length > 0) {
            entry.children.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        }
    }
    
    rootEntries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    function renderEntry(entry) {
        const childrenHtml = entry.children ? entry.children.map(renderEntry).join('') : '';
        let entryHtml = createEntryFunc(entry, activityManager);
        
        if (childrenHtml) {
            const placeholder = `<div class="branch-container" id="branch-container-${entry.id}" style="display: none;">`;
            const replacement = `<div class="branch-container" id="branch-container-${entry.id}" style="display: block;">${childrenHtml}</div>`;
            entryHtml = entryHtml.replace(placeholder, replacement);
        }
        return entryHtml;
    }

    return `<div class="thread-container">${rootEntries.map(renderEntry).join('')}</div>`;
}
