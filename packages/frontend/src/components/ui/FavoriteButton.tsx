'use client';

import { Heart } from 'lucide-react';

import { useFavorites } from '@/hooks/useFavorites';

interface FavoriteButtonProps {
  slug: string;
  className?: string;
  size?: 'sm' | 'md';
}

export function FavoriteButton({ slug, className = '', size = 'md' }: FavoriteButtonProps) {
  const { isFavorite, toggle, mounted } = useFavorites();
  const active = mounted && isFavorite(slug);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggle(slug);
  };

  if (!mounted) return null;

  const sizeClass = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';
  const btnSize = size === 'sm' ? 'h-8 w-8' : 'h-10 w-10';

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={active ? 'Убрать из избранного' : 'Добавить в избранное'}
      className={`flex aspect-square items-center justify-center rounded-full transition-colors ${btnSize} shrink-0 min-w-0 ${
        active
          ? 'bg-rose-100 text-rose-600 hover:bg-rose-200'
          : 'bg-white/90 text-slate-400 hover:bg-white hover:text-rose-500'
      } shadow-sm backdrop-blur-sm ${className}`}
    >
      <Heart className={`${sizeClass} ${active ? 'fill-current' : ''}`} />
    </button>
  );
}
