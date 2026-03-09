'use client';

/**
 * Безопасный рендер SVG из админки.
 * SVG уже санитизирован на backend; здесь просто вставляем в div с dangerouslySetInnerHTML.
 * Добавляем классы для размера.
 */
interface PromoSvgIconProps {
  svg: string;
  className?: string;
}

export function PromoSvgIcon({ svg, className = 'h-8 w-8' }: PromoSvgIconProps) {
  if (!svg || typeof svg !== 'string') return null;
  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: svg }}
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    />
  );
}
