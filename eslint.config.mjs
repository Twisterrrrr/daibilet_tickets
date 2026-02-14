import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  // Базовые правила JS
  eslint.configs.recommended,

  // TypeScript-правила (без type-aware — быстрее)
  ...tseslint.configs.recommended,

  // Prettier отключает конфликтующие правила форматирования
  prettier,

  // Глобальные настройки
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
    },
    rules: {
      // Разрешаем неиспользуемые переменные с _ (деструктуризация)
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
      // Предупреждение на any — бюджет: снижаем каждую неделю
      '@typescript-eslint/no-explicit-any': 'off',
      // Разрешаем require() в конфигах
      '@typescript-eslint/no-require-imports': 'off',
      // Пустые функции: warn (разрешаем колбэки, но не пустые catch)
      '@typescript-eslint/no-empty-function': ['error', {
        allow: ['constructors', 'decoratedFunctions'],
      }],
      // Пустые блоки запрещены (catch должен иметь хотя бы комментарий)
      'no-empty': ['error', { allowEmptyCatch: false }],
      'no-useless-catch': 'error',
    },
  },

  // Backend-контроллеры: строже — no-explicit-any как error для DTO-покрытых файлов
  {
    files: ['**/packages/backend/src/**/dto/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },

  // Тесты: разрешаем any (моки, стабы)
  {
    files: ['**/__tests__/**', '**/*.spec.ts', '**/*.test.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      'no-empty': 'off',
    },
  },

  // Игнорируемые файлы и папки
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/build/**',
      '**/*.js',
      '**/*.mjs',
      '**/*.cjs',
      '**/prisma/migrations/**',
    ],
  },
);
