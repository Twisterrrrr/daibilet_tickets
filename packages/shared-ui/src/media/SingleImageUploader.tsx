import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';

import type { MediaImageUploadResult } from '@daibilet/shared';

export type SingleImageUploaderProps = {
  label?: string;
  value: string;
  onChange: (url: string) => void;
  uploadOne: (file: File) => Promise<MediaImageUploadResult>;
  disabled?: boolean;
  maxSizeBytes?: number;
  hint?: string;
};

export function SingleImageUploader({
  label = 'Обложка',
  value,
  onChange,
  uploadOne,
  disabled,
  maxSizeBytes = 10 * 1024 * 1024,
  hint,
}: SingleImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    async (files: File[]) => {
      const file = files[0];
      if (!file || disabled) return;
      setError(null);
      setUploading(true);
      try {
        const r = await uploadOne(file);
        onChange(r.url);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Ошибка загрузки');
      } finally {
        setUploading(false);
      }
    },
    [disabled, onChange, uploadOne],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
      'image/avif': ['.avif'],
      'image/gif': ['.gif'],
    },
    maxSize: maxSizeBytes,
    multiple: false,
    disabled: disabled || uploading,
  });

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-slate-900">{label}</div>
      <div
        {...getRootProps()}
        className={[
          'flex flex-col gap-3 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-3 sm:flex-row sm:items-center',
          isDragActive ? 'border-slate-900 bg-slate-50' : '',
          disabled || uploading ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
        ].join(' ')}
      >
        <input {...getInputProps()} />
        <div className="h-20 w-32 shrink-0 overflow-hidden rounded-lg bg-slate-200">
          {value ? (
            <img src={value} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[11px] text-slate-500">Нет фото</div>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-1 text-xs text-slate-600">
          <div>{uploading ? 'Загрузка…' : 'Перетащите файл или нажмите для выбора'}</div>
          {hint && <div className="text-[11px] text-slate-500">{hint}</div>}
      {value && !uploading && (
        <button
          type="button"
          className="text-[11px] text-slate-500 underline"
          onClick={(e) => {
            e.stopPropagation();
            onChange('');
          }}
          disabled={disabled}
        >
          Удалить
        </button>
      )}
        </div>
      </div>
      {error && <div className="text-[11px] text-red-600">{error}</div>}
    </div>
  );
}
