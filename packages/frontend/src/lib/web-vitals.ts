'use client';

import { onCLS, onFCP, onINP, onLCP, onTTFB } from 'web-vitals';

type MetricHandler = (metric: { name: string; value: number; id: string }) => void;

const sendToAnalytics: MetricHandler = (metric) => {
  // Яндекс.Метрика
  if (typeof window !== 'undefined' && (window as any).ym) {
    (window as any).ym((window as any).__YM_ID__, 'params', {
      web_vitals: { [metric.name]: Math.round(metric.value) },
    });
  }

  // Console in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Web Vitals] ${metric.name}: ${Math.round(metric.value)}`);
  }
};

export function reportWebVitals() {
  onCLS(sendToAnalytics);
  onINP(sendToAnalytics);
  onLCP(sendToAnalytics);
  onFCP(sendToAnalytics);
  onTTFB(sendToAnalytics);
}
