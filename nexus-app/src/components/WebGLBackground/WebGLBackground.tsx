'use client';

import React, { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

interface WebGLBackgroundProps {
  className?: string;
}

export default function WebGLBackground({ className = '' }: WebGLBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pathname = usePathname();
  
  // Don't render on /immerse path
  if (pathname?.startsWith('/immerse')) {
    return null;
  }

  useEffect(() => {
    let scene: any, camera: any, renderer: any, material: any, mesh: any;
    let uniforms: any;
    let animationId: number;
    
    const canvas = canvasRef.current;
    
    if (!canvas) {
      return;
    }
    
    if (!window.WebGLRenderingContext) {
      if (document.body) {
        document.body.classList.add('webgl-fallback');
      }
      return;
    }

    // Dynamically import Three.js to avoid SSR issues
    const initWebGL = async () => {
      try {
        // Dynamic import of Three.js
        const THREE = await import('three');
        
        renderer = new THREE.WebGLRenderer({ 
          canvas: canvas, 
          antialias: true, 
          alpha: true,
          powerPreference: "high-performance"
        });
        
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        scene = new THREE.Scene();
        camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

        uniforms = {
          u_time: { value: 0.0 },
          u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
          u_mouse: { value: new THREE.Vector2(0.5, 0.5) },
          u_intensity: { value: 1.2 }, // Moderate increase from 0.6 to 1.0 - subtle but visible
        };

        const vertexShader = `
          void main() {
            gl_Position = vec4(position, 1.0);
          }
        `;

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
            float frequency = 0.0;
            for (int i = 0; i < 6; i++) {
              value += amplitude * snoise(p);
              p *= 2.0;
              amplitude *= 0.5;
            }
            return value;
          }

          void main() {
            vec2 uv = gl_FragCoord.xy / u_resolution.xy;
            uv.x *= u_resolution.x / u_resolution.y;

            vec2 mouse_offset = (u_mouse - 0.5) * -0.08; // Slightly more responsive

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

            // Subtly enhanced colors - visible but not bright
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

        function animate() {
          animationId = requestAnimationFrame(animate);
          if (uniforms) {
            uniforms.u_time.value = clock.getElapsedTime() * 1000;
          }
          if (renderer && scene && camera) {
            renderer.render(scene, camera);
          }
        }

        animate();

        // Event listeners
        const handleResize = () => {
          if (renderer && uniforms) {
            renderer.setSize(window.innerWidth, window.innerHeight);
            uniforms.u_resolution.value.set(window.innerWidth, window.innerHeight);
          }
        };

        const handleMouseMove = (event: MouseEvent) => {
          if (uniforms && uniforms.u_mouse) {
            uniforms.u_mouse.value.x = event.clientX / window.innerWidth;
            uniforms.u_mouse.value.y = 1.0 - (event.clientY / window.innerHeight);
          }
        };

        window.addEventListener('resize', handleResize);
        window.addEventListener('mousemove', handleMouseMove);

        // Cleanup function
        return () => {
          window.removeEventListener('resize', handleResize);
          window.removeEventListener('mousemove', handleMouseMove);
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
        // Silently fall back to CSS gradient on error
        if (document.body) {
          document.body.classList.add('webgl-fallback');
        }
      }
    };

    // Initialize WebGL
    const cleanup = initWebGL();
    
    // Return cleanup function
    return () => {
      if (cleanup instanceof Promise) {
        cleanup.then(cleanupFn => {
          if (typeof cleanupFn === 'function') {
            cleanupFn();
          }
        });
      }
    };
  }, []);

  return (
    <>
      {/* Subtle enhanced fallback background */}
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