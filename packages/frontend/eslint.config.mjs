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
    plugins: { '@next/next': nextPlugin },
    settings: { next: { rootDir: '.' } },
    rules: { ...nextPlugin.configs.recommended.rules },
  },
];
