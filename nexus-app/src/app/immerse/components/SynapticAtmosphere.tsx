import React, { useEffect, useRef, useState } from 'react';
import { SynapticAtmosphere as SynapticAtmosphereType, ThoughtThread as ThoughtThreadType } from '../types';
import { ThoughtThread } from './ThoughtThread';

interface SynapticAtmosphereProps {
  atmosphere: SynapticAtmosphereType;
  threads: ThoughtThreadType[];
  onThreadSelect: (thread: ThoughtThreadType) => void;
  onThreadWeave: (thread: ThoughtThreadType) => void;
  onAtmosphereShift: (focusPoint: { x: number; y: number; z: number }) => void;
  selectedThread: ThoughtThreadType | null;
  isBreathing: boolean;
}

export const SynapticAtmosphere: React.FC<SynapticAtmosphereProps> = ({
  atmosphere,
  threads,
  onThreadSelect,
  onThreadWeave,
  onAtmosphereShift,
  selectedThread,
  isBreathing,
}) => {
  const atmosphereRef = useRef<HTMLDivElement>(null);
  const [breathingIntensity, setBreathingIntensity] = useState(0);
  const [layerVisibility, setLayerVisibility] = useState<Record<string, number>>({});
  const [hoveredThread, setHoveredThread] = useState<ThoughtThreadType | null>(null);
  const [atmosphereField, setAtmosphereField] = useState({
    temperature: 0,
    turbulence: 0,
    flow: { x: 0, y: 0, z: 0 },
  });

  // Enhanced breathing cycle animation
  useEffect(() => {
    if (!isBreathing) return;

    const breathingInterval = setInterval(() => {
      const { phase, duration, intensity } = atmosphere.breathingCycle;
      const now = Date.now();
      const cycleProgress = (now % duration) / duration;
      
      let newIntensity = 0;
      let breathPhase = phase;
      
      // Enhanced breathing phases with smooth transitions
      if (cycleProgress < 0.3) {
        // Inhale phase (30% of cycle)
        breathPhase = 'inhale';
        const inhaleProgress = cycleProgress / 0.3;
        newIntensity = Math.sin(inhaleProgress * Math.PI * 0.5) * intensity;
      } else if (cycleProgress < 0.45) {
        // Hold phase (15% of cycle)
        breathPhase = 'hold';
        newIntensity = intensity * (0.9 + Math.sin(now * 0.01) * 0.1); // Slight variation
      } else if (cycleProgress < 0.85) {
        // Exhale phase (40% of cycle)
        breathPhase = 'exhale';
        const exhaleProgress = (cycleProgress - 0.45) / 0.4;
        newIntensity = Math.cos(exhaleProgress * Math.PI * 0.5) * intensity;
      } else {
        // Pause phase (15% of cycle)
        breathPhase = 'pause';
        const pauseProgress = (cycleProgress - 0.85) / 0.15;
        newIntensity = intensity * 0.2 * (1 - pauseProgress); // Fade to almost nothing
      }
      
      // Add subtle variation based on atmospheric turbulence
      const turbulenceEffect = atmosphereField.turbulence * 0.1 * Math.sin(now * 0.003);
      newIntensity = Math.max(0, Math.min(1, newIntensity + turbulenceEffect));
      
      setBreathingIntensity(newIntensity);
    }, 16); // ~60fps

    return () => clearInterval(breathingInterval);
  }, [isBreathing, atmosphere.breathingCycle, atmosphereField.turbulence]);

  // Initialize layer visibility
  useEffect(() => {
    const initialVisibility: Record<string, number> = {};
    atmosphere.layers.forEach(layer => {
      initialVisibility[layer.id] = layer.visibility;
    });
    setLayerVisibility(initialVisibility);
  }, [atmosphere.layers]);

  // Update emotional field based on threads
  useEffect(() => {
    if (threads.length === 0) return;

    const avgTemp = threads.reduce((sum, thread) => sum + thread.emotionalResonance.temperature, 0) / threads.length;
    const avgIntensity = threads.reduce((sum, thread) => sum + thread.emotionalResonance.intensity, 0) / threads.length;
    const turbulence = Math.min(1, threads.length / 10) * avgIntensity;

    setAtmosphereField({
      temperature: avgTemp,
      turbulence,
      flow: {
        x: Math.sin(Date.now() * 0.001) * turbulence,
        y: Math.cos(Date.now() * 0.001) * turbulence,
        z: Math.sin(Date.now() * 0.0005) * turbulence,
      },
    });
  }, [threads]);

  // Handle atmosphere interaction
  const handleAtmosphereClick = (e: React.MouseEvent) => {
    const rect = atmosphereRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const z = 0.5; // Default depth

    onAtmosphereShift({ x, y, z });
  };

  // Generate volumetric cloud particles
  const generateCloudParticles = (layer: any, threadCount: number) => {
    const particles = [];
    const particleCount = Math.min(200, 50 + threadCount * 10); // Increased particle count
    
    for (let i = 0; i < particleCount; i++) {
      const x = Math.random() * 100;
      const y = Math.random() * 100;
      const z = Math.random() * layer.depth; // Add depth dimension
      const size = 1 + Math.random() * 12; // Varied sizes for depth
      const opacity = (0.1 + Math.random() * 0.4) * layer.visibility;
      
      // Enhanced color system based on emotional temperature and cognitive activity
      const baseHue = layer.id === 'surface' ? 200 : 
                     layer.id === 'conscious' ? 250 : 
                     layer.id === 'subconscious' ? 300 : 350;
      const tempShift = (atmosphereField.temperature + 1) * 80; // -80 to +80 shift
      const hue = (baseHue + tempShift) % 360;
      const saturation = 40 + (atmosphereField.turbulence * 60); // 40-100% saturation
      const lightness = 50 + (layer.visibility * 30); // 50-80% lightness
      
      const speed = 0.2 + Math.random() * 2.0 + layer.depth; // Depth affects speed
      const direction = Math.random() * Math.PI * 2;
      const verticalSpeed = (Math.random() - 0.5) * 0.5; // Vertical movement
      
      // Neural connection probability - particles can form temporary connections
      const connectionProbability = atmosphereField.turbulence * 0.3;
      
      particles.push({
        id: i,
        x,
        y,
        z,
        size,
        opacity,
        color: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
        speed,
        direction,
        verticalSpeed,
        connectionProbability,
        life: 1.0, // Particle life for fade effects
        pulsePhase: Math.random() * Math.PI * 2, // For pulsing effect
        isCore: Math.random() < 0.1, // 10% chance to be a core particle (brighter)
        magneticField: layer.depth * 0.5, // Magnetic attraction to other particles
      });
    }
    
    return particles;
  };

  // Generate neural network connections between particles
  const generateNeuralConnections = (particles: any[]) => {
    const connections = [];
    const maxConnections = Math.min(50, particles.length / 4);
    
    for (let i = 0; i < maxConnections; i++) {
      const particleA = particles[Math.floor(Math.random() * particles.length)];
      const particleB = particles[Math.floor(Math.random() * particles.length)];
      
      if (particleA.id !== particleB.id) {
        const distance = Math.sqrt(
          Math.pow(particleA.x - particleB.x, 2) + 
          Math.pow(particleA.y - particleB.y, 2)
        );
        
        // Only connect particles that are close enough
        if (distance < 30 && Math.random() < particleA.connectionProbability) {
          connections.push({
            id: `conn-${particleA.id}-${particleB.id}`,
            from: particleA,
            to: particleB,
            strength: 1 - (distance / 30), // Closer = stronger
            pulseSpeed: 1 + Math.random() * 2,
            active: true,
          });
        }
      }
    }
    
    return connections;
  };

  // Calculate layer style based on depth and breathing
  const getLayerStyle = (layer: any) => {
    const baseOpacity = layer.visibility * (layerVisibility[layer.id] || 1);
    const breathingEffect = isBreathing ? breathingIntensity * 0.3 : 0;
    const depthScale = 0.8 + layer.depth * 0.4;
    
    return {
      opacity: Math.max(0, Math.min(1, baseOpacity + breathingEffect)),
      transform: `scale(${depthScale}) translateZ(${layer.depth * 100}px)`,
      filter: `blur(${layer.depth * 2}px)`,
    };
  };

  // Enhanced atmospheric background gradient
  const getAtmosphericBackground = () => {
    const temp = atmosphereField.temperature;
    const intensity = breathingIntensity;
    const turbulence = atmosphereField.turbulence;
    const focusX = atmosphere.focusPoint.x * 100;
    const focusY = atmosphere.focusPoint.y * 100;
    
    // Create multiple gradient layers for depth
    const baseGradient = temp > 0.3 ? 
      // Warm emotional atmosphere (creativity, excitement)
      `radial-gradient(ellipse at ${focusX}% ${focusY}%, 
        rgba(255, 120, 80, ${0.15 + intensity * 0.25}) 0%, 
        rgba(255, 180, 120, ${0.08 + intensity * 0.15}) 25%, 
        rgba(200, 100, 150, ${0.04 + intensity * 0.08}) 50%, 
        rgba(0, 0, 0, 0.85) 100%)` :
      temp < -0.3 ? 
      // Cool analytical atmosphere (logic, focus)
      `radial-gradient(ellipse at ${focusX}% ${focusY}%, 
        rgba(80, 180, 255, ${0.15 + intensity * 0.25}) 0%, 
        rgba(120, 200, 255, ${0.08 + intensity * 0.15}) 25%, 
        rgba(100, 150, 200, ${0.04 + intensity * 0.08}) 50%, 
        rgba(0, 0, 0, 0.85) 100%)` :
      // Neutral balanced atmosphere (contemplation, flow)
      `radial-gradient(ellipse at ${focusX}% ${focusY}%, 
        rgba(120, 255, 180, ${0.15 + intensity * 0.25}) 0%, 
        rgba(150, 255, 200, ${0.08 + intensity * 0.15}) 25%, 
        rgba(100, 200, 180, ${0.04 + intensity * 0.08}) 50%, 
        rgba(0, 0, 0, 0.85) 100%)`;
    
    // Add turbulence overlay for dynamic cognitive activity
    const turbulenceOverlay = turbulence > 0.3 ? 
      `, conic-gradient(from ${Date.now() * 0.01}deg at ${focusX}% ${focusY}%, 
        transparent 0deg, 
        rgba(255, 255, 255, ${turbulence * 0.05}) 90deg, 
        transparent 180deg, 
        rgba(255, 255, 255, ${turbulence * 0.03}) 270deg, 
        transparent 360deg)` : '';
    
    return baseGradient + turbulenceOverlay;
  };

  return (
    <div
      ref={atmosphereRef}
      className="synaptic-atmosphere"
      onClick={handleAtmosphereClick}
      style={{
        background: getAtmosphericBackground(),
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        perspective: '1000px',
      }}
    >
      {/* Atmospheric Layers */}
      {atmosphere.layers.map((layer, index) => (
        <div
          key={layer.id}
          className={`atmosphere-layer depth-${index}`}
          style={getLayerStyle(layer)}
        >
          {/* Volumetric Cloud Particles */}
          <div className="cloud-particles">
            {(() => {
              const particles = generateCloudParticles(layer, threads.length);
              const neuralConnections = generateNeuralConnections(particles);
              
              return (
                <>
                  {/* Neural Connections SVG Layer */}
                  <svg
                    className="neural-connections"
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      pointerEvents: 'none',
                      zIndex: 1,
                    }}
                  >
                    {neuralConnections.map(connection => (
                      <line
                        key={connection.id}
                        x1={`${connection.from.x}%`}
                        y1={`${connection.from.y}%`}
                        x2={`${connection.to.x}%`}
                        y2={`${connection.to.y}%`}
                        stroke={connection.from.color}
                        strokeWidth={connection.strength * 2}
                        opacity={connection.strength * 0.6 * breathingIntensity}
                        className="neural-connection"
                        style={{
                          filter: 'blur(0.5px)',
                          animation: `neuralPulse ${connection.pulseSpeed}s infinite ease-in-out`,
                        }}
                      />
                    ))}
                  </svg>
                  
                  {/* Enhanced Particles */}
                  {particles.map(particle => (
                    <div
                      key={particle.id}
                      className={`cloud-particle ${particle.isCore ? 'core-particle' : ''}`}
                      style={{
                        position: 'absolute',
                        left: `${particle.x}%`,
                        top: `${particle.y}%`,
                        width: `${particle.size}px`,
                        height: `${particle.size}px`,
                        backgroundColor: particle.color,
                        opacity: particle.opacity * particle.life,
                        borderRadius: '50%',
                        filter: particle.isCore ? 'blur(0.5px) brightness(1.5)' : 'blur(1px)',
                        boxShadow: particle.isCore ? `0 0 ${particle.size * 2}px ${particle.color}` : 'none',
                        transform: `translateZ(${particle.z * 100}px) scale(${1 + Math.sin(Date.now() * 0.001 + particle.pulsePhase) * 0.1})`,
                        animation: `particleFloat ${8 + particle.speed}s infinite ease-in-out, 
                                   breathingParticle ${atmosphere.breathingCycle.duration / 1000}s infinite ease-in-out`,
                        animationDelay: `${particle.id * 0.1}s, ${particle.pulsePhase}s`,
                      }}
                    />
                  ))}
                </>
              );
            })()}
          </div>

          {/* Thought Threads in Layer */}
          <div className="layer-threads">
            {threads
              .filter(thread => {
                // Distribute threads across layers based on their depth
                const threadLayer = Math.floor(thread.position.z * atmosphere.layers.length);
                return threadLayer === index;
              })
              .map(thread => (
                <div
                  key={thread.id}
                  className="thread-container"
                  style={{
                    position: 'absolute',
                    left: `${thread.position.x * 100}%`,
                    top: `${thread.position.y * 100}%`,
                    transform: `translate(-50%, -50%)`,
                    zIndex: Math.floor((1 - thread.position.z) * 100),
                  }}
                >
                  <ThoughtThread
                    thread={thread}
                    isSelected={selectedThread?.id === thread.id}
                    onSelect={onThreadSelect}
                    onWeave={onThreadWeave}
                    onHover={setHoveredThread}
                    isDragging={false}
                  />
                </div>
              ))}
          </div>

          {/* Emotional Field Visualization */}
          <div className="emotional-field">
            <div
              className="field-gradient"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: `conic-gradient(from ${atmosphereField.flow.x * 360}deg, 
                  rgba(255, 100, 100, ${layer.emotionalField.temperature * 0.1}) 0deg, 
                  rgba(100, 255, 100, ${layer.emotionalField.turbulence * 0.1}) 120deg, 
                  rgba(100, 100, 255, ${(1 - layer.emotionalField.temperature) * 0.1}) 240deg)`,
                opacity: layer.visibility * 0.5,
                mixBlendMode: 'overlay',
              }}
            />
          </div>
        </div>
      ))}

      {/* Enhanced Breathing Visualization */}
      {isBreathing && (
        <div className="breathing-visualization">
          {/* Central Breathing Orb */}
          <div
            className="breath-orb"
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: `translate(-50%, -50%) scale(${0.8 + breathingIntensity * 0.7})`,
              width: '80px',
              height: '80px',
              background: `radial-gradient(circle, 
                rgba(100, 255, 200, ${0.3 + breathingIntensity * 0.4}) 0%, 
                rgba(50, 200, 255, ${0.2 + breathingIntensity * 0.3}) 40%, 
                transparent 70%)`,
              borderRadius: '50%',
              opacity: 0.7 + breathingIntensity * 0.3,
              filter: 'blur(2px)',
              animation: `breathOrb ${atmosphere.breathingCycle.duration / 1000}s infinite ease-in-out`,
            }}
          />
          
          {/* Breathing Rings */}
          {[0, 1, 2].map(ring => (
            <div
              key={ring}
              className="breath-ring"
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: `translate(-50%, -50%) scale(${1 + breathingIntensity * (0.3 + ring * 0.2)})`,
                width: `${120 + ring * 40}px`,
                height: `${120 + ring * 40}px`,
                border: `${2 - ring * 0.5}px solid rgba(255, 255, 255, ${0.2 - ring * 0.05})`,
                borderRadius: '50%',
                opacity: (breathingIntensity * (1 - ring * 0.2)),
                animation: `breathRing ${atmosphere.breathingCycle.duration / 1000}s infinite ease-in-out`,
                animationDelay: `${ring * 0.2}s`,
              }}
            />
          ))}
          
          {/* Breathing Phase Indicator */}
          <div className="breath-phase-indicator">
            <div className="breath-phase-text">
              {atmosphere.breathingCycle.phase.toUpperCase()}
            </div>
            <div className="breath-intensity-bar">
              <div 
                className="breath-intensity-fill"
                style={{
                  width: `${breathingIntensity * 100}%`,
                  background: `linear-gradient(90deg, 
                    rgba(100, 255, 200, 0.8) 0%, 
                    rgba(50, 200, 255, 0.8) 100%)`,
                }}
              />
            </div>
          </div>
          
          {/* Atmosphere Pulse Field */}
          <div
            className="atmosphere-pulse"
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '100%',
              height: '100%',
              background: `radial-gradient(circle at center, 
                transparent 0%, 
                rgba(100, 255, 150, ${breathingIntensity * 0.1}) 50%, 
                transparent 100%)`,
              opacity: breathingIntensity,
              animation: `atmospherePulse ${atmosphere.breathingCycle.duration / 1000}s infinite ease-in-out`,
              pointerEvents: 'none',
            }}
          />
        </div>
      )}

      {/* Enhanced Focus Point Visualization */}
      <div className="focus-point-system">
        {/* Central Focus Orb */}
        <div
          className="focus-point"
          style={{
            position: 'absolute',
            left: `${atmosphere.focusPoint.x * 100}%`,
            top: `${atmosphere.focusPoint.y * 100}%`,
            transform: 'translate(-50%, -50%)',
            width: '24px',
            height: '24px',
            background: `radial-gradient(circle, 
              rgba(255, 255, 255, ${0.9 + breathingIntensity * 0.1}) 0%, 
              rgba(100, 255, 200, ${0.6 + breathingIntensity * 0.4}) 40%, 
              rgba(255, 255, 255, 0) 100%)`,
            borderRadius: '50%',
            pointerEvents: 'none',
            animation: 'focusPulse 3s ease-in-out infinite',
            filter: 'blur(1px)',
            boxShadow: `0 0 ${20 + breathingIntensity * 20}px rgba(100, 255, 200, ${0.6 + breathingIntensity * 0.4})`,
          }}
        />
        
        {/* Focus Field Rings */}
        {[0, 1, 2, 3].map(ring => (
          <div
            key={ring}
            className="focus-field-ring"
            style={{
              position: 'absolute',
              left: `${atmosphere.focusPoint.x * 100}%`,
              top: `${atmosphere.focusPoint.y * 100}%`,
              transform: 'translate(-50%, -50%)',
              width: `${40 + ring * 30}px`,
              height: `${40 + ring * 30}px`,
              border: `1px solid rgba(255, 255, 255, ${0.2 - ring * 0.04})`,
              borderRadius: '50%',
              pointerEvents: 'none',
              opacity: breathingIntensity * (1 - ring * 0.2),
              animation: `focusFieldPulse ${3 + ring * 0.5}s ease-in-out infinite`,
              animationDelay: `${ring * 0.3}s`,
            }}
          />
        ))}
        
        {/* Cognitive Attention Rays */}
        <svg
          className="attention-rays"
          style={{
            position: 'absolute',
            left: `${atmosphere.focusPoint.x * 100}%`,
            top: `${atmosphere.focusPoint.y * 100}%`,
            transform: 'translate(-50%, -50%)',
            width: '200px',
            height: '200px',
            pointerEvents: 'none',
            opacity: breathingIntensity * 0.7,
          }}
        >
          {[0, 45, 90, 135, 180, 225, 270, 315].map(angle => (
            <line
              key={angle}
              x1="100"
              y1="100"
              x2={100 + Math.cos(angle * Math.PI / 180) * 80}
              y2={100 + Math.sin(angle * Math.PI / 180) * 80}
              stroke="rgba(255, 255, 255, 0.3)"
              strokeWidth="1"
              opacity={breathingIntensity}
              className="attention-ray"
              style={{
                animation: `attentionRay ${2 + angle / 100}s ease-in-out infinite`,
                animationDelay: `${angle / 100}s`,
              }}
            />
          ))}
        </svg>
      </div>

      {/* Synaptic Connections Network */}
      <svg
        className="connection-network"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      >
        {threads.map(thread =>
          thread.connections.map(connection => {
            const fromThread = threads.find(t => t.id === connection.from);
            const toThread = threads.find(t => t.id === connection.to);
            if (!fromThread || !toThread) return null;

            return (
              <line
                key={connection.id}
                x1={`${fromThread.position.x * 100}%`}
                y1={`${fromThread.position.y * 100}%`}
                x2={`${toThread.position.x * 100}%`}
                y2={`${toThread.position.y * 100}%`}
                stroke={connection.visualStyle.color}
                strokeWidth={connection.visualStyle.thickness}
                strokeDasharray={connection.visualStyle.pattern === 'dashed' ? '5,5' : 'none'}
                opacity={connection.strength * 0.7}
                className={`connection-line ${connection.pulseActive ? 'pulsing' : ''}`}
              />
            );
          })
        )}
      </svg>

      <style jsx>{`
        .synaptic-atmosphere {
          transition: background 0.5s ease;
        }

        .atmosphere-layer {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          transition: all 0.3s ease;
          pointer-events: none;
        }

        .layer-threads {
          pointer-events: all;
        }

        .breathing-visualization {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 5;
        }

        .breath-phase-indicator {
          position: absolute;
          top: 20px;
          right: 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          background: rgba(0, 0, 0, 0.3);
          padding: 12px;
          border-radius: 8px;
          backdrop-filter: blur(10px);
        }

        .breath-phase-text {
          color: rgba(255, 255, 255, 0.9);
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 1px;
        }

        .breath-intensity-bar {
          width: 60px;
          height: 4px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 2px;
          overflow: hidden;
        }

        .breath-intensity-fill {
          height: 100%;
          transition: width 0.3s ease;
          border-radius: 2px;
        }

        .core-particle {
          animation: coreParticlePulse 2s infinite ease-in-out !important;
        }

        .neural-connection {
          stroke-linecap: round;
          stroke-dasharray: 5, 10;
          stroke-dashoffset: 0;
        }

        .connection-line.pulsing {
          animation: connectionPulse 2s ease-in-out infinite;
        }

        /* Enhanced Animations */
        @keyframes particleFloat {
          0%, 100% { 
            transform: translateY(0) rotate(0deg) scale(1); 
            opacity: 1;
          }
          25% { 
            transform: translateY(-15px) rotate(90deg) scale(1.1); 
            opacity: 0.8;
          }
          50% { 
            transform: translateY(-10px) rotate(180deg) scale(0.9); 
            opacity: 1;
          }
          75% { 
            transform: translateY(5px) rotate(270deg) scale(1.05); 
            opacity: 0.9;
          }
        }

        @keyframes breathingParticle {
          0%, 100% { 
            transform: scale(1); 
            filter: brightness(1);
          }
          50% { 
            transform: scale(1.2); 
            filter: brightness(1.3);
          }
        }

        @keyframes breathOrb {
          0%, 100% { 
            transform: translate(-50%, -50%) scale(0.8); 
            opacity: 0.7;
          }
          50% { 
            transform: translate(-50%, -50%) scale(1.2); 
            opacity: 1;
          }
        }

        @keyframes breathRing {
          0%, 100% { 
            transform: translate(-50%, -50%) scale(1); 
            opacity: 0;
          }
          50% { 
            transform: translate(-50%, -50%) scale(1.5); 
            opacity: 1;
          }
        }

        @keyframes atmospherePulse {
          0%, 100% { 
            opacity: 0.3; 
            transform: translate(-50%, -50%) scale(0.8);
          }
          50% { 
            opacity: 0.8; 
            transform: translate(-50%, -50%) scale(1.2);
          }
        }

        @keyframes neuralPulse {
          0%, 100% { 
            opacity: 0.2; 
            stroke-dashoffset: 15;
          }
          50% { 
            opacity: 0.8; 
            stroke-dashoffset: 0;
          }
        }

        @keyframes coreParticlePulse {
          0%, 100% { 
            transform: scale(1); 
            filter: brightness(1.5) blur(0.5px);
            box-shadow: 0 0 10px currentColor;
          }
          50% { 
            transform: scale(1.4); 
            filter: brightness(2) blur(1px);
            box-shadow: 0 0 20px currentColor;
          }
        }

        @keyframes focusPulse {
          0%, 100% { 
            opacity: 0.8; 
            transform: translate(-50%, -50%) scale(1); 
          }
          50% { 
            opacity: 1; 
            transform: translate(-50%, -50%) scale(1.3); 
          }
        }

        @keyframes connectionPulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }

        @keyframes focusFieldPulse {
          0%, 100% { 
            transform: translate(-50%, -50%) scale(1); 
            opacity: 0.2;
          }
          50% { 
            transform: translate(-50%, -50%) scale(1.1); 
            opacity: 0.6;
          }
        }

        @keyframes attentionRay {
          0%, 100% { 
            opacity: 0.1; 
            stroke-width: 0.5;
          }
          50% { 
            opacity: 0.8; 
            stroke-width: 2;
          }
        }

        .depth-0 { z-index: 30; }
        .depth-1 { z-index: 20; }
        .depth-2 { z-index: 10; }
        .depth-3 { z-index: 5; }
      `}</style>
    </div>
  );
}; 