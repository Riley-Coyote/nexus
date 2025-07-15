import React, { useState, useEffect, useRef } from 'react';
import { ThoughtThread as ThoughtThreadType, CognitiveGene } from '../types';

interface ThoughtThreadProps {
  thread: ThoughtThreadType;
  isSelected: boolean;
  onSelect: (thread: ThoughtThreadType) => void;
  onWeave: (thread: ThoughtThreadType) => void;
  onHover: (thread: ThoughtThreadType | null) => void;
  isDragging: boolean;
  dragPosition?: { x: number; y: number };
}

export const ThoughtThread: React.FC<ThoughtThreadProps> = ({
  thread,
  isSelected,
  onSelect,
  onWeave,
  onHover,
  isDragging,
  dragPosition,
}) => {
  const [pulsePhase, setPulsePhase] = useState(0);
  const [isDragHover, setIsDragHover] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);

  // Animate pulse based on thread's emotional resonance
  useEffect(() => {
    const interval = setInterval(() => {
      setPulsePhase(prev => (prev + 1) % 100);
    }, 60000 / thread.emotionalResonance.pulseRate); // Convert BPM to milliseconds

    return () => clearInterval(interval);
  }, [thread.emotionalResonance.pulseRate]);

  // Calculate emotional color based on temperature and intensity
  const getEmotionalColor = () => {
    const { temperature, intensity } = thread.emotionalResonance;
    
    if (temperature > 0.5) {
      // Warm colors (red-orange-yellow)
      const warmth = Math.min(1, temperature * 2);
      return {
        primary: `hsl(${20 + warmth * 40}, ${60 + intensity * 40}%, ${50 + intensity * 30}%)`,
        secondary: `hsl(${20 + warmth * 40}, ${40 + intensity * 20}%, ${30 + intensity * 20}%)`,
        pulse: `hsl(${20 + warmth * 40}, ${80 + intensity * 20}%, ${70 + intensity * 20}%)`,
      };
    } else if (temperature < -0.5) {
      // Cool colors (blue-cyan-purple)
      const coolness = Math.min(1, Math.abs(temperature) * 2);
      return {
        primary: `hsl(${200 + coolness * 60}, ${60 + intensity * 40}%, ${50 + intensity * 30}%)`,
        secondary: `hsl(${200 + coolness * 60}, ${40 + intensity * 20}%, ${30 + intensity * 20}%)`,
        pulse: `hsl(${200 + coolness * 60}, ${80 + intensity * 20}%, ${70 + intensity * 20}%)`,
      };
    } else {
      // Neutral colors (green-teal)
      return {
        primary: `hsl(${160 + temperature * 40}, ${50 + intensity * 40}%, ${45 + intensity * 25}%)`,
        secondary: `hsl(${160 + temperature * 40}, ${30 + intensity * 20}%, ${25 + intensity * 15}%)`,
        pulse: `hsl(${160 + temperature * 40}, ${70 + intensity * 20}%, ${65 + intensity * 20}%)`,
      };
    }
  };

  const colors = getEmotionalColor();

  // Calculate genetic marker visualization
  const getGeneticVisualization = (gene: CognitiveGene) => {
    const typeColors = {
      conceptual: '#4F46E5', // Indigo
      emotional: '#EC4899', // Pink
      logical: '#10B981', // Green
      creative: '#F59E0B', // Amber
    };

    return {
      color: typeColors[gene.type],
      size: Math.max(4, gene.strength * 12),
      opacity: 0.6 + gene.strength * 0.4,
    };
  };

  // Handle thread weaving
  const handleWeave = () => {
    if (thread.weavability > 0.3) {
      onWeave(thread);
    }
  };

  // Calculate thread style based on type
  const getThreadStyle = () => {
    const baseStyle = {
      background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
      border: `1px solid ${colors.primary}`,
      boxShadow: isSelected 
        ? `0 0 20px ${colors.pulse}, 0 4px 20px rgba(0,0,0,0.3)` 
        : `0 2px 10px rgba(0,0,0,0.2)`,
      opacity: isDragging ? 0.8 : 1,
      transform: isDragging && dragPosition 
        ? `translate(${dragPosition.x}px, ${dragPosition.y}px) scale(1.05)` 
        : isSelected ? 'scale(1.02)' : 'scale(1)',
    };

    if (thread.type === 'foundation') {
      return {
        ...baseStyle,
        borderWidth: '2px',
        fontWeight: 600,
      };
    } else if (thread.type === 'suggestion') {
      return {
        ...baseStyle,
        borderStyle: 'dashed',
        opacity: (baseStyle.opacity as number) * 0.8,
      };
    } else if (thread.type === 'hybrid') {
      return {
        ...baseStyle,
        background: `linear-gradient(45deg, ${colors.primary}, ${colors.secondary}, ${colors.primary})`,
        backgroundSize: '200% 200%',
        animation: 'hybridShimmer 3s ease-in-out infinite',
      };
    }

    return baseStyle;
  };

  return (
    <div
      ref={threadRef}
      className={`thought-thread ${thread.type} ${isSelected ? 'selected' : ''}`}
      style={getThreadStyle()}
      onClick={() => onSelect(thread)}
      onMouseEnter={() => onHover(thread)}
      onMouseLeave={() => onHover(null)}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragHover(true);
      }}
      onDragLeave={() => setIsDragHover(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragHover(false);
        handleWeave();
      }}
    >
      {/* Pulse Animation */}
      <div 
        className="pulse-ring"
        style={{
          position: 'absolute',
          top: '-2px',
          left: '-2px',
          right: '-2px',
          bottom: '-2px',
          border: `2px solid ${colors.pulse}`,
          borderRadius: 'inherit',
          opacity: Math.sin(pulsePhase * 0.1) * 0.5 + 0.5,
          animation: `pulse ${60000 / thread.emotionalResonance.pulseRate}ms infinite`,
        }}
      />

      {/* Thread Content */}
      <div className="thread-content">
        {/* Genetic Markers */}
        <div className="genetic-markers">
          {thread.geneticMarkers.slice(0, 3).map((gene, index) => {
            const viz = getGeneticVisualization(gene);
            return (
              <div
                key={gene.id}
                className="genetic-marker"
                style={{
                  width: viz.size,
                  height: viz.size,
                  backgroundColor: viz.color,
                  opacity: viz.opacity,
                  borderRadius: '50%',
                  display: 'inline-block',
                  marginRight: '4px',
                }}
                title={`${gene.type}: ${gene.pattern} (${(gene.strength * 100).toFixed(0)}%)`}
              />
            );
          })}
          {thread.geneticMarkers.length > 3 && (
            <span className="more-genes">+{thread.geneticMarkers.length - 3}</span>
          )}
        </div>

        {/* Thread Text */}
        <div className="thread-text">
          {thread.content}
        </div>

        {/* Weavability Indicator */}
        <div className="weavability-indicator">
          <div 
            className="weavability-bar"
            style={{
              width: `${thread.weavability * 100}%`,
              backgroundColor: thread.weavability > 0.7 ? '#10B981' : 
                             thread.weavability > 0.3 ? '#F59E0B' : '#EF4444',
            }}
          />
        </div>

        {/* Thread Type Badge */}
        <div className={`thread-type-badge ${thread.type}`}>
          {thread.type === 'foundation' && '🧠'}
          {thread.type === 'suggestion' && '💡'}
          {thread.type === 'hybrid' && '🧬'}
        </div>
      </div>

      {/* Synaptic Connections Visualization */}
      <div className="synaptic-connections">
        {thread.connections.map(connection => (
          <div
            key={connection.id}
            className={`connection-line ${connection.type}`}
            style={{
              opacity: connection.strength,
              strokeWidth: connection.visualStyle.thickness,
              stroke: connection.visualStyle.color,
              strokeDasharray: connection.visualStyle.pattern === 'dashed' ? '5,5' : 'none',
            }}
          />
        ))}
      </div>

      {/* Drag Hover Effect */}
      {isDragHover && (
        <div className="drag-hover-effect">
          <div className="weaving-preview">
            Ready to weave thoughts...
          </div>
        </div>
      )}

      <style jsx>{`
        .thought-thread {
          position: relative;
          padding: 16px;
          margin: 8px;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          min-height: 80px;
          display: flex;
          flex-direction: column;
          backdrop-filter: blur(10px);
          overflow: hidden;
        }

        .thought-thread:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0,0,0,0.3);
        }

        .thought-thread.selected {
          box-shadow: 0 0 30px currentColor;
        }

        .genetic-markers {
          display: flex;
          align-items: center;
          margin-bottom: 8px;
          opacity: 0.8;
        }

        .more-genes {
          font-size: 12px;
          color: rgba(255,255,255,0.7);
          margin-left: 4px;
        }

        .thread-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          z-index: 1;
          position: relative;
        }

        .thread-text {
          flex: 1;
          color: rgba(255,255,255,0.9);
          line-height: 1.5;
          margin: 8px 0;
        }

        .weavability-indicator {
          margin-top: 8px;
          height: 3px;
          background: rgba(255,255,255,0.2);
          border-radius: 2px;
          overflow: hidden;
        }

        .weavability-bar {
          height: 100%;
          transition: width 0.3s ease;
          border-radius: 2px;
        }

        .thread-type-badge {
          position: absolute;
          top: 8px;
          right: 8px;
          font-size: 16px;
          opacity: 0.7;
        }

        .drag-hover-effect {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(255,255,255,0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: inherit;
          backdrop-filter: blur(5px);
        }

        .weaving-preview {
          color: rgba(255,255,255,0.9);
          font-weight: 500;
          text-align: center;
        }

        @keyframes pulse {
          0% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.05); }
          100% { opacity: 0.5; transform: scale(1); }
        }

        @keyframes hybridShimmer {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        .foundation {
          border-left: 4px solid #4F46E5;
        }

        .suggestion {
          border-left: 4px solid #10B981;
        }

        .hybrid {
          border-left: 4px solid #F59E0B;
        }
      `}</style>
    </div>
  );
}; 