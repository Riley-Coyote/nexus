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

  // Breathing cycle animation
  useEffect(() => {
    if (!isBreathing) return;

    const breathingInterval = setInterval(() => {
      const { phase, duration, intensity } = atmosphere.breathingCycle;
      const cycleProgress = (Date.now() % duration) / duration;
      
      let newIntensity = 0;
      switch (phase) {
        case 'inhale':
          newIntensity = Math.sin(cycleProgress * Math.PI) * intensity;
          break;
        case 'hold':
          newIntensity = intensity;
          break;
        case 'exhale':
          newIntensity = Math.cos(cycleProgress * Math.PI) * intensity;
          break;
        case 'pause':
          newIntensity = 0;
          break;
      }
      
      setBreathingIntensity(newIntensity);
    }, 16); // ~60fps

    return () => clearInterval(breathingInterval);
  }, [isBreathing, atmosphere.breathingCycle]);

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
    const particleCount = Math.min(50, threadCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
      const x = Math.random() * 100;
      const y = Math.random() * 100;
      const size = 2 + Math.random() * 8;
      const opacity = 0.1 + Math.random() * 0.3;
      const hue = 200 + (atmosphereField.temperature + 1) * 60; // Blue to orange based on temperature
      const speed = 0.5 + Math.random() * 1.5;
      
      particles.push({
        id: i,
        x,
        y,
        size,
        opacity: opacity * layer.visibility,
        color: `hsl(${hue}, 60%, 70%)`,
        speed,
        direction: Math.random() * Math.PI * 2,
      });
    }
    
    return particles;
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

  // Get atmospheric background gradient
  const getAtmosphericBackground = () => {
    const temp = atmosphereField.temperature;
    const intensity = breathingIntensity;
    
    if (temp > 0.3) {
      // Warm atmosphere
      return `radial-gradient(circle at ${atmosphere.focusPoint.x * 100}% ${atmosphere.focusPoint.y * 100}%, 
        rgba(255, 100, 50, ${0.1 + intensity * 0.2}) 0%, 
        rgba(255, 150, 100, ${0.05 + intensity * 0.1}) 30%, 
        rgba(0, 0, 0, 0.8) 100%)`;
    } else if (temp < -0.3) {
      // Cool atmosphere
      return `radial-gradient(circle at ${atmosphere.focusPoint.x * 100}% ${atmosphere.focusPoint.y * 100}%, 
        rgba(50, 150, 255, ${0.1 + intensity * 0.2}) 0%, 
        rgba(100, 200, 255, ${0.05 + intensity * 0.1}) 30%, 
        rgba(0, 0, 0, 0.8) 100%)`;
    } else {
      // Neutral atmosphere
      return `radial-gradient(circle at ${atmosphere.focusPoint.x * 100}% ${atmosphere.focusPoint.y * 100}%, 
        rgba(100, 255, 150, ${0.1 + intensity * 0.2}) 0%, 
        rgba(150, 255, 200, ${0.05 + intensity * 0.1}) 30%, 
        rgba(0, 0, 0, 0.8) 100%)`;
    }
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
            {generateCloudParticles(layer, threads.length).map(particle => (
              <div
                key={particle.id}
                className="cloud-particle"
                style={{
                  position: 'absolute',
                  left: `${particle.x}%`,
                  top: `${particle.y}%`,
                  width: `${particle.size}px`,
                  height: `${particle.size}px`,
                  backgroundColor: particle.color,
                  opacity: particle.opacity,
                  borderRadius: '50%',
                  filter: 'blur(1px)',
                  animationName: 'float',
                  animationDuration: `${10 + particle.speed}s`,
                  animationIterationCount: 'infinite',
                  animationTimingFunction: 'linear',
                  animationDelay: `${particle.id * 0.5}s`,
                }}
              />
            ))}
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

      {/* Breathing Indicator */}
      {isBreathing && (
        <div className="breathing-indicator">
          <div
            className="breath-ring"
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: `translate(-50%, -50%) scale(${1 + breathingIntensity * 0.5})`,
              width: '100px',
              height: '100px',
              border: '2px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '50%',
              opacity: breathingIntensity,
            }}
          />
          <div className="breath-phase">
            {atmosphere.breathingCycle.phase.toUpperCase()}
          </div>
        </div>
      )}

      {/* Focus Point Indicator */}
      <div
        className="focus-point"
        style={{
          position: 'absolute',
          left: `${atmosphere.focusPoint.x * 100}%`,
          top: `${atmosphere.focusPoint.y * 100}%`,
          transform: 'translate(-50%, -50%)',
          width: '20px',
          height: '20px',
          background: 'radial-gradient(circle, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0) 100%)',
          borderRadius: '50%',
          pointerEvents: 'none',
          animation: 'focusPulse 2s ease-in-out infinite',
        }}
      />

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

        .breathing-indicator {
          position: absolute;
          top: 20px;
          right: 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
        }

        .breath-phase {
          color: rgba(255, 255, 255, 0.7);
          font-size: 12px;
          font-weight: 500;
        }

        .connection-line.pulsing {
          animation: connectionPulse 2s ease-in-out infinite;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          33% { transform: translateY(-20px) rotate(120deg); }
          66% { transform: translateY(10px) rotate(240deg); }
        }

        @keyframes focusPulse {
          0%, 100% { opacity: 0.8; transform: translate(-50%, -50%) scale(1); }
          50% { opacity: 1; transform: translate(-50%, -50%) scale(1.2); }
        }

        @keyframes connectionPulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }

        .depth-0 { z-index: 30; }
        .depth-1 { z-index: 20; }
        .depth-2 { z-index: 10; }
        .depth-3 { z-index: 5; }
      `}</style>
    </div>
  );
}; 