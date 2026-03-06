type PreviewBannerProps = {
  label?: string;
  expiresHint?: string;
  publicUrl?: string | null;
};

export function PreviewBanner({
  label = 'Черновик · предпросмотр',
  expiresHint = 'Ссылка действует 30 минут',
  publicUrl,
}: PreviewBannerProps) {
  return (
    <div className="pointer-events-auto fixed left-4 top-4 z-50 flex items-center gap-2 rounded-full bg-amber-500 px-3 py-1 text-xs font-medium text-white shadow-md">
      <span>
        {label}
        {expiresHint ? ` · ${expiresHint}` : null}
      </span>
      {publicUrl && (
        <a
          href={publicUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-semibold hover:bg-white/30"
        >
          Открыть публичную
        </a>
      )}
    </div>
  );
}

