import React from 'react';
import { ProfileSection } from '@/shared/types';
import { SECTION_LABELS, getScoreColor } from '@/shared/constants';

interface SectionCardProps {
  section: ProfileSection;
  index: number;
}

export function SectionCard({ section, index }: SectionCardProps) {
  const pct = Math.round((section.score / section.maxScore) * 100);
  const color = getScoreColor(pct);

  return (
    <div
      className="card animate-slide-up"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white"
            style={{ backgroundColor: color }}
          >
            {section.score}
          </div>
          <span className="text-sm font-semibold text-text-primary">
            {SECTION_LABELS[section.key] || section.name}
          </span>
        </div>
        <span className="text-2xs text-text-tertiary">
          / {section.maxScore}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-surface-3 rounded-full mb-3 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{
            width: `${pct}%`,
            backgroundColor: color,
          }}
        />
      </div>

      <p className="text-xs text-text-secondary mb-2">{section.feedback}</p>

      {section.suggestions.length > 0 && (
        <div className="space-y-1">
          {section.suggestions.map((s, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-text-tertiary">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="mt-0.5 flex-shrink-0">
                <path d="M2 6h8M6 2l4 4-4 4" stroke="#6366f1" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>{s}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
