import { useState, DragEvent, ChangeEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getToken } from '@/lib/auth';

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  helperText?: string;
};

export function ImageUploadInput({ label, value, onChange, placeholder, helperText }: Props) {
  const [uploading, setUploading] = useState(false);

  const uploadFile = async (file: File) => {
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const token = getToken();
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch('/api/v1/admin/upload/image', {
        method: 'POST',
        body: formData,
        headers,
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
      // eslint-disable-next-line no-console
      console.error('Image upload failed', e);
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
    <div className="space-y-2">
      <Label>{label}</Label>
      <div
        className="flex flex-col gap-2 rounded-md border border-dashed border-slate-300 bg-slate-50 p-3 text-xs text-slate-600"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <div className="flex items-center gap-2">
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder ?? 'https://...'}
          />
          <Button type="button" variant="outline" size="sm" disabled={uploading} asChild>
            <label className="cursor-pointer">
              {uploading ? 'Загрузка…' : 'Загрузить'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>
          </Button>
        </div>
        <div className="text-[11px] text-slate-500">
          Перетащите файл сюда или нажмите «Загрузить». Допустимы изображения до 5&nbsp;МБ.
          {helperText && <span className="ml-1">{helperText}</span>}
        </div>
      </div>
    </div>
  );
}

