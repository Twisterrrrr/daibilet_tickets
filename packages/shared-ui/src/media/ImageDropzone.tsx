import { useId } from 'react';
import { useDropzone } from 'react-dropzone';

export type ImageDropzoneProps = {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
  maxSizeBytes?: number;
  accept?: Record<string, string[]>;
  className?: string;
  label?: string;
  hint?: string;
  error?: string | null;
};

const DEFAULT_ACCEPT: Record<string, string[]> = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'image/avif': ['.avif'],
  'image/gif': ['.gif'],
};

export function ImageDropzone({
  onFiles,
  disabled,
  maxSizeBytes = 10 * 1024 * 1024,
  accept = DEFAULT_ACCEPT,
  className = '',
  label = 'Перетащите файлы сюда',
  hint,
  error,
}: ImageDropzoneProps) {
  const inputId = useId();
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (accepted) => {
      if (accepted.length) onFiles(accepted);
    },
    accept,
    maxSize: maxSizeBytes,
    disabled,
    multiple: true,
    noClick: disabled,
    noKeyboard: disabled,
  });

  return (
    <div className={`space-y-1 ${className}`}>
      <div
        {...getRootProps()}
        className={[
          'rounded-lg border border-dashed px-4 py-6 text-center text-xs transition-colors',
          isDragActive ? 'border-slate-900 bg-slate-100' : 'border-slate-300 bg-slate-50',
          disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:border-slate-500',
        ].join(' ')}
      >
        <input {...getInputProps()} id={inputId} />
        <div className="text-sm font-medium text-slate-900">{label}</div>
        <div className="mt-1 text-slate-500">или нажмите, чтобы выбрать файлы</div>
        {hint && <div className="mt-2 text-[11px] text-slate-500">{hint}</div>}
      </div>
      {error && <div className="text-[11px] text-red-600">{error}</div>}
    </div>
  );
}
