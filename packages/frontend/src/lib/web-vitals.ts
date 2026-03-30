'use client';

import { onCLS, onFCP, onINP, onLCP, onTTFB } from 'web-vitals';

type MetricHandler = (metric: { name: string; value: number; id: string }) => void;

const sendToAnalytics: MetricHandler = (metric) => {
  // Яндекс.Метрика: ym(counterId, action, params)
  if (typeof window !== 'undefined' && window.ym && window.__YM_ID__ !== undefined) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window.ym as (id: number, action: string, params?: any) => void)(window.__YM_ID__, 'params', {
      web_vitals: { [metric.name]: Math.round(metric.value) },
    });
  }

  // Только при явном флаге — иначе засоряет консоль и даёт лишние stack trace в DevTools
  if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_DEBUG_WEB_VITALS === '1') {
    // eslint-disable-next-line no-console
    console.debug(`[Web Vitals] ${metric.name}: ${Math.round(metric.value)}`);
  }
};

export function reportWebVitals() {
  onCLS(sendToAnalytics);
  onINP(sendToAnalytics);
  onLCP(sendToAnalytics);
  onFCP(sendToAnalytics);
  onTTFB(sendToAnalytics);
}
