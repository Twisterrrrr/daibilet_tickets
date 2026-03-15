import { useState, DragEvent, ChangeEvent } from 'react';

interface Props {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  helperText?: string;
}

export function ImageUploadInput({ label, value, onChange, placeholder, helperText }: Props) {
  const [uploading, setUploading] = useState(false);

  const uploadFile = async (file: File) => {
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      // Используем тот же базовый URL и авторизацию, что и остальные supplier-запросы.
      const res = await fetch('/api/v1/supplier/upload/image', {
        method: 'POST',
        body: formData,
        // Токен добавится через middleware proxy (Authorization у нас в api.ts),
        // здесь достаточно передать cookies.
        credentials: 'include',
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || `Upload failed: ${res.status}`);
      }

      const data = (await res.json()) as { url: string; thumbUrl?: string };
      if (data.url) {
        onChange(data.url);
      }
    } catch (e) {
      console.error('Supplier image upload failed', e);
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void uploadFile(file);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) void uploadFile(file);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div className="space-y-1 text-sm">
      <div className="font-medium text-slate-800">{label}</div>
      <div
        className="flex flex-col gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-xs text-slate-600"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <div className="flex items-center gap-2">
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder ?? 'https://...'}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-0"
          />
          <label className="inline-flex cursor-pointer items-center rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-100">
            {uploading ? 'Загрузка…' : 'Загрузить'}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
              disabled={uploading}
            />
          </label>
        </div>
        <div className="text-[11px] text-slate-500">
          Перетащите файл сюда или нажмите «Загрузить». Допустимы изображения до 5&nbsp;МБ.
          {helperText && <span className="ml-1">{helperText}</span>}
        </div>
      </div>
    </div>
  );
}

