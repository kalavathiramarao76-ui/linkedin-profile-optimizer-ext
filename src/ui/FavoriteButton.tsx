import React, { useState, useEffect, useCallback } from 'react';
import { toggleFavorite, isFavorited, FavoriteType } from '@/shared/favorites';

interface FavoriteButtonProps {
  type: FavoriteType;
  content: string;
  label?: string;
  score?: number;
  className?: string;
  onToggle?: (added: boolean, count: number) => void;
}

export function FavoriteButton({ type, content, label, score, className = '', onToggle }: FavoriteButtonProps) {
  const [favorited, setFavorited] = useState(false);
  const [bouncing, setBouncing] = useState(false);

  useEffect(() => {
    isFavorited(type, content).then(setFavorited);
  }, [type, content]);

  const handleToggle = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    setBouncing(true);
    const result = await toggleFavorite({ type, content, label, score });
    setFavorited(result.added);
    onToggle?.(result.added, result.count);
    setTimeout(() => setBouncing(false), 500);
  }, [type, content, label, score, onToggle]);

  return (
    <button
      onClick={handleToggle}
      className={`favorite-btn ${favorited ? 'favorite-btn-active' : ''} ${bouncing ? 'favorite-btn-bounce' : ''} ${className}`}
      title={favorited ? 'Remove from favorites' : 'Add to favorites'}
      aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill={favorited ? '#f59e0b' : 'none'}
        stroke={favorited ? '#f59e0b' : 'currentColor'}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 2L15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2z" />
      </svg>
    </button>
  );
}
