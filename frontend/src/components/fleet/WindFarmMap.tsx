import React, { useState, useRef } from 'react';
import { useNavigate } from '@tanstack/react-router';
import type { TurbineMetrics } from '../../types';
import { TURBINE_POSITIONS, getTurbineRiskColor } from '../../lib/mockData';
import TurbinePopupCard from './TurbinePopupCard';

interface WindFarmMapProps {
  turbines: TurbineMetrics[];
}

export default function WindFarmMap({ turbines }: WindFarmMapProps) {
  const [hoveredTurbine, setHoveredTurbine] = useState<TurbineMetrics | null>(null);
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = (turbine: TurbineMetrics, svgX: number, svgY: number) => {
    setHoveredTurbine(turbine);
    setHoverPos({ x: svgX, y: svgY });
  };

  const handleClick = (turbine: TurbineMetrics) => {
    navigate({ to: '/turbine/$id', params: { id: turbine.id } });
  };

  return (
    <div
      ref={containerRef}
      className="relative rounded-xl overflow-hidden"
      style={{
        backgroundImage: 'url(/assets/generated/wind-farm-hero.dim_1600x900.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        minHeight: '480px',
        border: '1px solid var(--color-border)',
      }}
    >
      {/* Dark overlay */}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: 'rgba(30, 30, 30, 0.65)' }}
      />

      {/* Header */}
      <div className="absolute top-4 left-4 z-10">
        <h3 className="font-montserrat font-700 text-sm text-white">Wind Farm Layout</h3>
        <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.6)' }}>5 turbines • Click to inspect</p>
      </div>

      {/* Legend */}
      <div
        className="absolute top-4 right-4 z-10 rounded-lg p-3 flex flex-col gap-1.5"
        style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
      >
        {[
          { color: '#D50000', label: 'Critical' },
          { color: '#FF9100', label: 'Warning' },
          { color: '#00C853', label: 'Healthy' },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="text-xs text-white">{item.label}</span>
          </div>
        ))}
      </div>

      {/* SVG Map */}
      <svg
        viewBox="0 0 660 540"
        className="absolute inset-0 w-full h-full"
        style={{ zIndex: 5 }}
      >
        {/* Grid lines */}
        {[80, 200, 320, 440, 560].map(x => (
          <line key={`vl-${x}`} x1={x} y1={60} x2={x} y2={490} stroke="rgba(255,255,255,0.05)" strokeWidth="1" strokeDasharray="4,4" />
        ))}
        {[80, 180, 280, 380, 460].map(y => (
          <line key={`hl-${y}`} x1={60} y1={y} x2={600} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="1" strokeDasharray="4,4" />
        ))}

        {turbines.map(turbine => {
          const pos = TURBINE_POSITIONS[turbine.id];
          if (!pos) return null;
          const color = getTurbineRiskColor(turbine.riskLevel);
          const isCritical = turbine.riskLevel === 'critical';
          const isWarning = turbine.riskLevel === 'warning';
          const radius = 14 + (turbine.healthScore / 100) * 4;

          return (
            <g
              key={turbine.id}
              style={{ cursor: 'pointer' }}
              onClick={() => handleClick(turbine)}
              onMouseEnter={() => handleMouseEnter(turbine, pos.x, pos.y)}
              onMouseLeave={() => setHoveredTurbine(null)}
            >
              {/* Pulse ring for critical */}
              {isCritical && (
                <circle
                  cx={pos.x} cy={pos.y} r={radius + 8}
                  fill="none" stroke={color} strokeWidth="1.5" opacity="0.4"
                  style={{ animation: 'pulse-red 2s infinite' }}
                />
              )}
              {isWarning && (
                <circle
                  cx={pos.x} cy={pos.y} r={radius + 6}
                  fill="none" stroke={color} strokeWidth="1" opacity="0.3"
                />
              )}
              {/* Main circle */}
              <circle
                cx={pos.x} cy={pos.y} r={radius}
                fill={`${color}30`}
                stroke={color}
                strokeWidth="2"
              />
              {/* Inner dot */}
              <circle cx={pos.x} cy={pos.y} r={5} fill={color} />
              {/* Turbine ID label */}
              <text
                x={pos.x} y={pos.y + radius + 14}
                textAnchor="middle"
                fill="rgba(255,255,255,0.8)"
                fontSize="9"
                fontFamily="JetBrains Mono"
              >
                {turbine.id}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Popup */}
      {hoveredTurbine && containerRef.current && (
        <TurbinePopupCard
          turbine={hoveredTurbine}
          x={hoverPos.x * (containerRef.current.offsetWidth / 660)}
          y={hoverPos.y * (containerRef.current.offsetHeight / 540)}
          containerWidth={containerRef.current.offsetWidth}
          containerHeight={containerRef.current.offsetHeight}
        />
      )}
    </div>
  );
}
