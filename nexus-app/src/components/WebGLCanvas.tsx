'use client';

import { useEffect } from 'react';
import Script from 'next/script';

export default function WebGLCanvas() {
  useEffect(() => {
    // Initialize WebGL when Three.js is loaded
    if (typeof window !== 'undefined' && (window as any).THREE) {
      initWebGLBackground();
    }
  }, []);

  const initWebGLBackground = () => {
    const THREE = (window as any).THREE;
    if (!THREE) return;

    let scene: any, camera: any, renderer: any, material: any, mesh: any;
    let uniforms: any;
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
        
        vec2 mouse_offset = (u_mouse - 0.5) * -0.05;
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
        
        vec3 color1 = vec3(0.035, 0.037, 0.042); // Deep Void Grey
        vec3 color2 = vec3(0.055, 0.058, 0.065); // Neutral Navy-Grey
        vec3 color3 = vec3(0.04, 0.043, 0.046); // Pure Charcoal Grey
        
        vec3 finalColor = mix(color1, color2, smoothstep(-0.2, 0.2, noise));
        finalColor = mix(finalColor, color3, smoothstep(0.1, 0.4, noise));
        finalColor *= (0.7 + abs(noise) * 0.3); // Brightness variation
        finalColor += (abs(noise) * 0.04);
        
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
      requestAnimationFrame(animate);
      uniforms.u_time.value = clock.getElapsedTime() * 1000;
      renderer.render(scene, camera);
    }
    
    animate();

    window.addEventListener('resize', () => {
      renderer.setSize(window.innerWidth, window.innerHeight);
      uniforms.u_resolution.value.set(window.innerWidth, window.innerHeight);
    });

    window.addEventListener('mousemove', (event) => {
      if (uniforms && uniforms.u_mouse) {
        uniforms.u_mouse.value.x = event.clientX / window.innerWidth;
        uniforms.u_mouse.value.y = 1.0 - (event.clientY / window.innerHeight);
      }
    });
  };

  return (
    <>
      <canvas id="webgl-canvas" />
      <Script 
        src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"
        strategy="afterInteractive"
        onLoad={() => {
          initWebGLBackground();
        }}
      />
    </>
  );
}