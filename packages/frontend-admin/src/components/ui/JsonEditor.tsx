import { useState, useEffect } from 'react';

interface JsonEditorProps {
  value: any;
  onChange: (value: any) => void;
  label?: string;
  schema?: string; // Описание формата для подсказки
  rows?: number;
}

export function JsonEditor({ value, onChange, label, schema, rows = 10 }: JsonEditorProps) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      setText(JSON.stringify(value, null, 2));
      setError('');
    } catch {
      setText(String(value));
    }
  }, [value]);

  const handleChange = (raw: string) => {
    setText(raw);
    try {
      const parsed = JSON.parse(raw);
      setError('');
      onChange(parsed);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handlePrettify = () => {
    try {
      const parsed = JSON.parse(text);
      setText(JSON.stringify(parsed, null, 2));
      setError('');
    } catch {
      // Не форматируем невалидный JSON
    }
  };

  return (
    <div className="space-y-1">
      {label && (
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700">{label}</label>
          <button
            type="button"
            onClick={handlePrettify}
            className="text-xs text-primary-600 hover:text-primary-700"
          >
            Форматировать
          </button>
        </div>
      )}
      {schema && (
        <p className="text-xs text-gray-400">{schema}</p>
      )}
      <textarea
        value={text}
        onChange={(e) => handleChange(e.target.value)}
        rows={rows}
        spellCheck={false}
        className={`w-full rounded-lg border px-3 py-2 font-mono text-xs leading-relaxed outline-none transition-colors ${
          error
            ? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-1 focus:ring-red-500'
            : 'border-gray-300 bg-gray-50 focus:border-primary-500 focus:ring-1 focus:ring-primary-500'
        }`}
      />
      {error && (
        <p className="text-xs text-red-500">JSON ошибка: {error}</p>
      )}
    </div>
  );
}
