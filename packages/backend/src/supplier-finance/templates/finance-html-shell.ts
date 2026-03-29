import { FINANCE_PRINT_CSS } from './finance-print-styles';

/** Вставляет единые print-стили перед </head>. */
export function injectPrintCss(html: string): string {
  const tag = `<style id="finance-print-global">${FINANCE_PRINT_CSS}</style>`;
  if (html.includes('</head>')) {
    return html.replace('</head>', `${tag}</head>`);
  }
  return `<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"/>${tag}</head><body>${html}</body></html>`;
}
