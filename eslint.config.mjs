import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  // Базовые правила JS
  eslint.configs.recommended,

  // TypeScript-правила (без type-aware — быстрее)
  ...tseslint.configs.recommended,

  // Prettier отключает конфликтующие правила форматирования
  prettier,

  // Глобальные настройки
  {
    plugins: {
      'simple-import-sort': simpleImportSort,
      'react-hooks': reactHooks,
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
    },
    rules: {
      // Разрешаем неиспользуемые переменные с _ (деструктуризация)
      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
        ignoreRestSiblings: true,
      }],
      // Предупреждение на any — никаких новых any (постепенно заменять)
      '@typescript-eslint/no-explicit-any': 'warn',
      // Разрешаем require() в конфигах
      '@typescript-eslint/no-require-imports': 'off',
      // Пустые функции: warn (разрешаем колбэки, но не пустые catch)
      '@typescript-eslint/no-empty-function': ['error', {
        allow: ['constructors', 'decoratedFunctions'],
      }],
      // Пустые блоки запрещены (catch должен иметь хотя бы комментарий)
      'no-empty': ['error', { allowEmptyCatch: false }],
      'no-useless-catch': 'error',
      // Запрет console.* в production-коде (использовать NestJS Logger)
      'no-console': ['error', { allow: ['warn'] }],
      // Сортировка импортов (единая политика)
      'simple-import-sort/imports': 'warn',
      'simple-import-sort/exports': 'warn',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'no-misleading-character-class': 'warn',
      'no-useless-escape': 'warn',
      'no-constant-condition': 'warn',
      '@typescript-eslint/no-namespace': 'warn',
      '@typescript-eslint/triple-slash-reference': 'warn',
    },
  },

  // Backend DTO: no-explicit-any — пока warn (привести к типам в отдельной задаче)
  {
    files: ['**/packages/backend/src/**/dto/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },

  // Тесты: разрешаем any, console (моки, стабы, отладка)
  {
    files: ['**/__tests__/**', '**/*.spec.ts', '**/*.test.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      'no-empty': 'off',
      'no-console': 'off',
    },
  },

  // Seed/migration/CLI скрипты: разрешаем console (CLI output)
  {
    files: [
      '**/prisma/*.ts',
      '**/prisma/**/seed*.ts',
      '**/scripts/**/*.ts',
      '**/__mocks__/**',
      '**/seed/**',
    ],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },

  // Backend src (вне prisma/scripts): console — warn (постепенно заменить на Logger)
  {
    files: ['**/packages/backend/src/**/*.ts'],
    rules: {
      'no-console': 'warn',
    },
  },

  // Frontend + admin + supplier: console допускается (web-vitals, dev) — постепенно убирать
  {
    files: [
      '**/packages/frontend/**/*.{ts,tsx}',
      '**/packages/frontend-admin/**/*.{ts,tsx}',
      '**/packages/frontend-supplier/**/*.{ts,tsx}',
    ],
    rules: {
      'no-console': 'warn',
      'no-empty': 'warn',
      '@typescript-eslint/no-empty-function': ['warn', { allow: ['arrowFunctions'] }],
      '@typescript-eslint/triple-slash-reference': 'off',
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
