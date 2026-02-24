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
  const btnSize = size === 'sm' ? 'size-8' : 'size-10';

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={active ? 'Убрать из избранного' : 'Добавить в избранное'}
      className={`inline-btn flex min-w-0 shrink-0 items-center justify-center rounded-full transition-colors ${btnSize} ${
        active
          ? 'bg-rose-100 text-rose-600 hover:bg-rose-200'
          : 'bg-white/90 text-slate-400 hover:bg-white hover:text-rose-500'
      } shadow-sm backdrop-blur-sm ${className}`}
    >
      <Heart className={`${sizeClass} shrink-0 ${active ? 'fill-current' : ''}`} />
    </button>
  );
}
