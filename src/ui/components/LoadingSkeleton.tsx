import React from 'react';

interface LoadingSkeletonProps {
  lines?: number;
  className?: string;
}

export function LoadingSkeleton({ lines = 4, className = '' }: LoadingSkeletonProps) {
  return (
    <div className={`flex flex-col gap-3 py-2 ${className}`}>
      {Array.from({ length: lines }, (_, i) => (
        <div
          key={i}
          className="skeleton-line"
          style={{
            width: `${70 + Math.random() * 30}%`,
            animationDelay: `${i * 100}ms`,
          }}
        />
      ))}
    </div>
  );
}

export function ScoreSkeleton() {
  return (
    <div className="flex flex-col items-center gap-3 py-4">
      <div className="w-[140px] h-[140px] rounded-full skeleton-line" />
      <div className="skeleton-line w-24 h-4" />
    </div>
  );
}

export function SectionSkeleton() {
  return (
    <div className="card animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <div className="skeleton-line w-24 h-4" />
        <div className="skeleton-line w-12 h-4" />
      </div>
      <LoadingSkeleton lines={2} />
    </div>
  );
}
