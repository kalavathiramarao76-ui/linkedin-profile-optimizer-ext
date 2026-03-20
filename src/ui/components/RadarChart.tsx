import React, { useEffect, useState } from 'react';
import { ProfileSection } from '@/shared/types';
import { SECTION_LABELS, getScoreColor } from '@/shared/constants';

interface RadarChartProps {
  sections: ProfileSection[];
  size?: number;
}

export function RadarChart({ sections, size = 220 }: RadarChartProps) {
  const [animated, setAnimated] = useState(false);
  const center = size / 2;
  const maxRadius = size / 2 - 30;
  const levels = 4;

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(t);
  }, []);

  const angleStep = (2 * Math.PI) / sections.length;

  const getPoint = (index: number, value: number) => {
    const angle = index * angleStep - Math.PI / 2;
    const r = (value / 100) * maxRadius;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  };

  const gridPolygons = Array.from({ length: levels }, (_, level) => {
    const r = ((level + 1) / levels) * maxRadius;
    const points = sections.map((_, i) => {
      const angle = i * angleStep - Math.PI / 2;
      return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
    }).join(' ');
    return <polygon key={level} points={points} className="radar-grid" />;
  });

  const axes = sections.map((_, i) => {
    const angle = i * angleStep - Math.PI / 2;
    const end = {
      x: center + maxRadius * Math.cos(angle),
      y: center + maxRadius * Math.sin(angle),
    };
    return <line key={i} x1={center} y1={center} x2={end.x} y2={end.y} className="radar-axis" />;
  });

  const dataPoints = sections.map((s, i) =>
    getPoint(i, animated ? (s.score / s.maxScore) * 100 : 0)
  );
  const dataPolygon = dataPoints.map(p => `${p.x},${p.y}`).join(' ');

  const labels = sections.map((s, i) => {
    const angle = i * angleStep - Math.PI / 2;
    const labelR = maxRadius + 18;
    const x = center + labelR * Math.cos(angle);
    const y = center + labelR * Math.sin(angle);
    return (
      <text key={i} x={x} y={y} className="radar-label" dominantBaseline="middle">
        {SECTION_LABELS[s.key] || s.name}
      </text>
    );
  });

  const dots = dataPoints.map((p, i) => (
    <circle key={i} cx={p.x} cy={p.y} r={3.5} fill="#6366f1" stroke="white" strokeWidth={1.5}
      style={{ transition: 'all 0.8s ease-out' }} />
  ));

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {gridPolygons}
      {axes}
      <polygon points={dataPolygon} className="radar-polygon" />
      {dots}
      {labels}
    </svg>
  );
}
