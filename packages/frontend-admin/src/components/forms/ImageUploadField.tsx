import { useEffect, useRef, useState, DragEvent, ChangeEvent, MouseEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getToken } from '@/lib/auth';

export type ImageUploadFieldProps = {
  label?: string;
  value?: string | null;
  onChange: (value: string | null) => void;
  disabled?: boolean;
};

type UploadState = 'idle' | 'uploading' | 'error';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export function ImageUploadField({ label, value, onChange, disabled }: ImageUploadFieldProps) {
  const [urlInput, setUrlInput] = useState<string>(value ?? '');
  const [previewUrl, setPreviewUrl] = useState<string | null>(value ?? null);
  const [status, setStatus] = useState<UploadState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    setUrlInput(value ?? '');
    setPreviewUrl(value ?? null);
  }, [value]);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, []);

  const setLocalPreviewFromFile = (file: File) => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
    }
    const objectUrl = URL.createObjectURL(file);
    objectUrlRef.current = objectUrl;
    setPreviewUrl(objectUrl);
  };

  const validateFile = (file: File): string | null => {
    if (!file.type.startsWith('image/')) {
      return 'Поддерживаются только изображения';
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return 'Файл слишком большой (максимум 10 МБ)';
    }
    return null;
  };

  const uploadFile = async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      setStatus('error');
      return;
    }

    setError(null);
    setStatus('uploading');
    setLocalPreviewFromFile(file);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const token = getToken();
      const headers: Record<string, string> = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const res = await fetch('/api/v1/admin/upload/image', {
        method: 'POST',
        body: formData,
        headers,
        credentials: 'include',
      });

      if (!res.ok) {
        setStatus('error');
        setError('Не удалось загрузить изображение');
        return;
      }

      const data = (await res.json()) as { url?: string | null };
      if (!data.url) {
        setStatus('error');
        setError('Ответ сервера не содержит URL изображения');
        return;
      }

      setStatus('idle');
      setError(null);
      setUrlInput(data.url);
      setPreviewUrl(data.url);
      onChange(data.url);
    } catch {
      setStatus('error');
      setError('Не удалось загрузить изображение');
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void uploadFile(file);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (disabled) return;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      void uploadFile(file);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const applyUrl = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) {
      setError('Некорректный URL');
      setStatus('error');
      return;
    }

    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new Error('Некорректный URL');
      }
      setError(null);
      setStatus('idle');
      setPreviewUrl(trimmed);
      onChange(trimmed);
    } catch {
      setError('Некорректный URL');
      setStatus('error');
    }
  };

  const handleUrlKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      applyUrl();
    }
  };

  const handleClickDropzone = (e: MouseEvent<HTMLDivElement>) => {
    if (disabled) return;
    if (e.target instanceof HTMLButtonElement || e.target instanceof HTMLInputElement || e.target instanceof HTMLLabelElement) {
      return;
    }
    fileInputRef.current?.click();
  };

  const handleRemove = () => {
    setUrlInput('');
    setPreviewUrl(null);
    setError(null);
    setStatus('idle');
    onChange(null);
  };

  const isUploading = status === 'uploading';
  const hasPreview = Boolean(previewUrl);

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      <div
        className={[
          'flex flex-col gap-3 rounded-md border border-dashed bg-slate-50 p-3 text-xs text-slate-600 transition-colors',
          isDragOver ? 'border-primary bg-primary/5' : 'border-slate-300',
          disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer',
        ].join(' ')}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClickDropzone}
      >
        {/* Preview */}
        <div className="flex items-center gap-3">
          <div className="relative h-20 w-32 overflow-hidden rounded-md bg-slate-200">
            {hasPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl ?? undefined} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[11px] text-slate-500">
                Нет изображения
              </div>
            )}
          </div>
          <div className="flex flex-1 flex-col gap-2">
            <div className="flex items-center gap-2">
              <Input
                value={urlInput}
                onChange={(e) => {
                  setUrlInput(e.target.value);
                  if (error) setError(null);
                  if (status === 'error') setStatus('idle');
                }}
                onKeyDown={handleUrlKeyDown}
                placeholder="Вставьте URL изображения"
                disabled={disabled || isUploading}
              />
              <Button type="button" size="sm" variant="outline" onClick={applyUrl} disabled={disabled || isUploading}>
                Применить
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" disabled={disabled || isUploading} asChild>
                <label className="cursor-pointer">
                  {isUploading ? 'Загрузка…' : 'Выбрать файл'}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                    disabled={disabled}
                  />
                </label>
              </Button>
              {hasPreview && (
                <Button type="button" variant="ghost" size="sm" onClick={handleRemove} disabled={disabled || isUploading}>
                  Удалить
                </Button>
              )}
              <span className="text-[11px] text-slate-500">
                Перетащите изображение сюда или нажмите «Выбрать файл» (до 10&nbsp;МБ).
              </span>
            </div>
          </div>
        </div>
        {error && <div className="text-[11px] text-red-600">{error}</div>}
      </div>
    </div>
  );
}

