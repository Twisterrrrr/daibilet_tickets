import rootConfig from '../../eslint.config.mjs';
import nextPlugin from '@next/eslint-plugin-next';

/**
 * ESLint config для packages/frontend.
 * files включает .mjs — иначе Next.js при calculateConfigForFile(eslint.config.mjs)
 * не находит плагин и выдаёт "The Next.js plugin was not detected".
 * @see https://github.com/vercel/next.js/issues/73655
 */
export default [
  ...rootConfig,
  {
    files: ['**/*.{js,jsx,ts,tsx,mjs}'],
    // Next.js "next lint" детектит плагин не только по rules, но и по ключу плагина.
    // Для flat-config добавляем алиас `next`, сохраняя канонический `@next/next`.
    plugins: { '@next/next': nextPlugin, next: nextPlugin },
    settings: { next: { rootDir: '.' } },
    rules: { ...nextPlugin.configs.recommended.rules },
  },
];
