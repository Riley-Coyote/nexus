'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';

interface WebGLBackgroundProps {
  className?: string;
}

// Performance detection and quality settings
const getDevicePerformanceLevel = (): 'low' | 'medium' | 'high' => {
  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const pixelCount = window.innerWidth * window.innerHeight;
  const hasHighDPI = window.devicePixelRatio > 1.5;
  
  // Mobile devices or very high resolution = low quality
  if (isMobile || pixelCount > 2073600) return 'low';    // 1080p+
  if (pixelCount > 921600 || hasHighDPI) return 'medium'; // 720p+
  return 'high';
};

const qualitySettings = {
  low: { 
    resolution: 0.6, 
    iterations: 3, 
    pixelRatio: 1,
    intensity: 0.5,
    mouseSensitivity: 0.03
  },
  medium: { 
    resolution: 0.8, 
    iterations: 4, 
    pixelRatio: 1.5,
    intensity: 0.6,
    mouseSensitivity: 0.04
  },
  high: { 
    resolution: 1.0, 
    iterations: 6, 
    pixelRatio: 2,
    intensity: 0.7,
    mouseSensitivity: 0.05
  }
};

// Throttle function for mouse events
const throttle = (func: Function, delay: number) => {
  let timeoutId: number | null = null;
  let lastExecTime = 0;
  return function (this: any, ...args: any[]) {
    const currentTime = Date.now();
    
    if (currentTime - lastExecTime > delay) {
      func.apply(this, args);
      lastExecTime = currentTime;
    } else {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        func.apply(this, args);
        lastExecTime = Date.now();
      }, delay - (currentTime - lastExecTime));
    }
  };
};

export default function WebGLBackground({ className = '' }: WebGLBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(true);
  const lastInteractionRef = useRef(Date.now()); // Use ref instead of state to avoid closure issues
  
  // Don't render on /immerse path
  if (pathname?.startsWith('/immerse')) {
    console.log('🚫 WebGL Background: Skipping /immerse route');
    return null;
  }

  console.log('🌌 WebGL Background: Component mounting for path:', pathname);

  useEffect(() => {
    let scene: any, camera: any, renderer: any, material: any, mesh: any;
    let uniforms: any;
    let animationId: number;
    let cleanupFn: (() => void) | null = null;
    let isShaderReady = false;
    let isAnimating = true;
    let animationPaused = false;
    
    const canvas = canvasRef.current;
    const performanceLevel = getDevicePerformanceLevel();
    const settings = qualitySettings[performanceLevel];
    
    console.log(`🎛️ WebGL Background: Using ${performanceLevel} quality settings`, settings);
    
    if (!canvas) {
      return;
    }
    
    if (!window.WebGLRenderingContext) {
      console.warn("WebGL not supported. Falling back to CSS gradient.");
      if (document.body) {
        document.body.classList.add('webgl-fallback');
      }
      return;
    }

    // Reset interaction time
    lastInteractionRef.current = Date.now();

    // Visibility change handler
    const handleVisibilityChange = () => {
      const visible = !document.hidden;
      setIsVisible(visible);
      if (visible) {
        lastInteractionRef.current = Date.now();
        console.log('👁️ WebGL Background: Tab became visible, resetting interaction time');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Initialize WebGL background with performance optimizations
    const initWebGLBackground = async () => {
      try {
        // Dynamic import of Three.js
        const THREE = await import('three');
        
        try {
          renderer = new THREE.WebGLRenderer({ 
            canvas: canvas, 
            antialias: performanceLevel === 'high', // Disable antialiasing on lower-end devices
            alpha: true,
            powerPreference: "high-performance"
          });
        } catch (e) {
          console.error("Could not initialize WebGL renderer.", e);
          if (document.body) {
            document.body.classList.add('webgl-fallback');
          }
          return;
        }
        
        // Adaptive resolution
        const renderWidth = Math.floor(window.innerWidth * settings.resolution);
        const renderHeight = Math.floor(window.innerHeight * settings.resolution);
        
        renderer.setSize(renderWidth, renderHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, settings.pixelRatio));
        
        // Scale canvas to fill screen
        canvas.style.width = '100%';
        canvas.style.height = '100%';

        scene = new THREE.Scene();
        camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

        // Optimized uniforms
        uniforms = {
          u_time: { value: 0.0 },
          u_resolution: { value: new THREE.Vector2(renderWidth, renderHeight) },
          u_mouse: { value: new THREE.Vector2(0.5, 0.5) },
          u_intensity: { value: settings.intensity },
          u_quality: { value: settings.iterations }
        };

        const vertexShader = `
          precision mediump float;
          void main() {
            gl_Position = vec4(position, 1.0);
          }
        `;

        // Optimized fragment shader with adaptive quality
        const fragmentShader = `
          precision mediump float;
          uniform vec2 u_resolution;
          uniform float u_time;
          uniform vec2 u_mouse;
          uniform float u_intensity;
          uniform float u_quality;

          vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
          float snoise(vec2 v) {
            const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
            vec2 i  = floor(v + dot(v, C.yy));
            vec2 x0 = v - i + dot(i, C.xx);
            vec2 i1;
            i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
            vec4 x12 = x0.xyxy + C.xxzz;
            x12.xy -= i1;
            i = mod(i, 289.0);
            vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
            vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
            m = m*m;
            m = m*m;
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
            // Adaptive iterations based on quality uniform
            int maxIterations = int(u_quality);
            for (int i = 0; i < 6; i++) {
              if (i >= maxIterations) break;
              value += amplitude * snoise(p);
              p *= 2.0;
              amplitude *= 0.5;
            }
            return value;
          }

          void main() {
            vec2 uv = gl_FragCoord.xy / u_resolution.xy;
            uv.x *= u_resolution.x / u_resolution.y;

            vec2 mouse_offset = (u_mouse - 0.5) * -${settings.mouseSensitivity.toFixed(3)};

            float time1 = u_time * 0.0002;
            float time2 = u_time * 0.0001;
            float time3 = u_time * 0.00007;

            vec2 p1 = uv * 3.0 - vec2(1.5);
            p1 += fbm(p1 + time1 + mouse_offset);

            vec2 p2 = uv * 2.5 - vec2(1.25);
            p2 -= fbm(p2 - time2 - mouse_offset);
            
            vec2 p3 = uv * 3.5 - vec2(1.75);
            p3 += fbm(p3 + time3);

            float noise = fbm(p1 + p2 - p3) * u_intensity;

            // Enhanced colors that maintain the atmospheric beauty
            vec3 color1 = vec3(0.045, 0.047, 0.055); // Slightly brighter base
            vec3 color2 = vec3(0.065, 0.068, 0.080); // More visible mid-tone
            vec3 color3 = vec3(0.035, 0.038, 0.048); // Deeper shadow

            vec3 finalColor = mix(color1, color2, smoothstep(-0.25, 0.25, noise));
            finalColor = mix(finalColor, color3, smoothstep(0.0, 0.5, noise));
            finalColor *= (0.75 + abs(noise) * 0.4); // Moderate brightness variation
            finalColor += (abs(noise) * 0.06); // Subtle glow

            gl_FragColor = vec4(finalColor, 1.0);
          }
        `;
        
        material = new THREE.ShaderMaterial({
          uniforms: uniforms,
          vertexShader: vertexShader,
          fragmentShader: fragmentShader,
        });

        mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
        scene.add(mesh);

        const clock = new THREE.Clock();

        // Proper shader validation function
        // NOTE: material.program is no longer exposed in recent Three.js versions.
        // Instead, rely on renderer.info.programs to determine when the program has been compiled
        // and linked successfully.
        const validateShaderProgram = () => {
          if (!renderer) return false;

          // renderer.info.programs is populated after the first render call
          const programs = (renderer.info as any).programs as Array<{ program: WebGLProgram } | undefined>;
          if (!programs || programs.length === 0 || !programs[0]?.program) {
            return false;
          }

          const gl = renderer.getContext();
          const program = programs[0]!.program;

          // Check if program is linked successfully
          if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error('Shader program failed to link:', gl.getProgramInfoLog(program));
            return false;
          }

          // Verify all required uniforms exist
          const requiredUniforms = ['u_time', 'u_resolution', 'u_mouse', 'u_intensity', 'u_quality'];
          for (const uniformName of requiredUniforms) {
            const location = gl.getUniformLocation(program, uniformName);
            if (location === null) {
              console.warn(`Uniform ${uniformName} not found in shader`);
            }
          }

          return true;
        };

        function animate() {
          animationId = requestAnimationFrame(animate);
          
          // Smart rendering: pause when inactive or hidden (but always render for first few seconds)
          const now = Date.now();
          const timeSinceInteraction = now - lastInteractionRef.current;
          const shouldRender = isVisible && (timeSinceInteraction < 10000); // Pause after 10s of inactivity
          
          if (!shouldRender && !animationPaused) {
            animationPaused = true;
            console.log(`🔋 WebGL Background: Pausing animation to save power (${(timeSinceInteraction/1000).toFixed(1)}s idle)`);
          } else if (shouldRender && animationPaused) {
            animationPaused = false;
            console.log('🎬 WebGL Background: Resuming animation');
          }
          
          // Always render when should render OR during initial startup
          if ((shouldRender || !isShaderReady) && renderer && scene && camera) {
            // Render first to ensure shader compilation
            renderer.render(scene, camera);
            
            // Update uniforms once the shader is confirmed ready
            if (isShaderReady && uniforms) {
              try {
                uniforms.u_time.value = clock.getElapsedTime() * 1000;
              } catch (error) {
                console.warn('WebGL uniform update failed:', error);
                // Attempt to re-validate shader on error
                isShaderReady = validateShaderProgram();
              }
            }
          }
        }

        // Start animation
        animate();

        // Wait for shader compilation and validate
        const checkShaderReady = () => {
          if (validateShaderProgram()) {
            isShaderReady = true;
            console.log(`✅ WebGL Background: Shader compiled successfully (${performanceLevel} quality)`);
          } else {
            // Retry after a short delay
            setTimeout(checkShaderReady, 50);
          }
        };
        
        // Initial check after a brief delay
        setTimeout(checkShaderReady, 100);

        // Throttled mouse handler for better performance
        const throttledMouseMove = throttle((event: MouseEvent) => {
          if (uniforms && uniforms.u_mouse && isShaderReady) {
            try {
              uniforms.u_mouse.value.x = event.clientX / window.innerWidth;
              uniforms.u_mouse.value.y = 1.0 - (event.clientY / window.innerHeight);
              lastInteractionRef.current = Date.now();
            } catch (error) {
              console.warn('Mouse uniform update failed:', error);
            }
          }
        }, 16); // ~60fps throttling

        // Optimized resize handler
        const handleResize = throttle(() => {
          if (renderer && uniforms && isShaderReady) {
            const newWidth = Math.floor(window.innerWidth * settings.resolution);
            const newHeight = Math.floor(window.innerHeight * settings.resolution);
            
            try {
              renderer.setSize(newWidth, newHeight);
              uniforms.u_resolution.value.set(newWidth, newHeight);
              lastInteractionRef.current = Date.now();
            } catch (error) {
              console.warn('Resize uniform update failed:', error);
            }
          }
        }, 100);

        // Add event listeners
        window.addEventListener('resize', handleResize);
        window.addEventListener('mousemove', throttledMouseMove);
        
        // Track any user interaction to reset idle timer
        const resetIdleTimer = () => lastInteractionRef.current = Date.now();
        window.addEventListener('keydown', resetIdleTimer);
        window.addEventListener('click', resetIdleTimer);
        window.addEventListener('scroll', resetIdleTimer);

        // Cleanup function
        cleanupFn = () => {
          document.removeEventListener('visibilitychange', handleVisibilityChange);
          window.removeEventListener('resize', handleResize);
          window.removeEventListener('mousemove', throttledMouseMove);
          window.removeEventListener('keydown', resetIdleTimer);
          window.removeEventListener('click', resetIdleTimer);
          window.removeEventListener('scroll', resetIdleTimer);
          
          if (animationId) {
            cancelAnimationFrame(animationId);
          }
          if (renderer) {
            renderer.dispose();
          }
          if (material) {
            material.dispose();
          }
          if (mesh && mesh.geometry) {
            mesh.geometry.dispose();
          }
        };
        
      } catch (error) {
        console.error("WebGL Background initialization failed:", error);
        if (document.body) {
          document.body.classList.add('webgl-fallback');
        }
      }
    };

    // Initialize WebGL
    initWebGLBackground();
    
    // Return cleanup function
    return () => {
      if (cleanupFn) {
        cleanupFn();
      }
    };
  }, []);

  return (
    <>
      {/* Enhanced fallback background */}
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'radial-gradient(ellipse at bottom, #0f1114 0%, #090a0c 30%, #080a0b 100%)',
          zIndex: -10000,
          pointerEvents: 'none'
        }}
      />
      
      <canvas
        ref={canvasRef}
        id="webgl-canvas"
        className={`webgl-background-canvas ${className}`}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: -9999,
          pointerEvents: 'none'
        }}
      />
    </>
  );
} 