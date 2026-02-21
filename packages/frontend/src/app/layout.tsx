import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { CartProvider } from '@/lib/cart';
import { UserAuthProvider } from '@/hooks/useUserAuth';
import { SupportWidget } from '@/components/ui/SupportWidget';
import { WebVitalsReporter } from '@/components/WebVitalsReporter';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ScrollProgress } from '@/components/ui/ScrollProgress';

export const metadata: Metadata = {
  title: {
    default: 'Дайбилет — экскурсии, музеи и мероприятия по городам России',
    template: '%s | Дайбилет',
  },
  description:
    'Билеты на экскурсии, музеи и мероприятия по городам России. Экскурсии, музеи, концерты и шоу — всё в одном месте.',
  metadataBase: new URL(process.env.APP_URL || 'https://daibilet.ru'),
  openGraph: {
    type: 'website',
    locale: 'ru_RU',
    siteName: 'Дайбилет',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body className="flex min-h-screen flex-col">
        <ScrollProgress />
        <WebVitalsReporter />
        <CartProvider>
        <UserAuthProvider>
        <Header />
        <main className="flex-1">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
        <Footer />
        <SupportWidget />
        </UserAuthProvider>
        </CartProvider>

        {/* Ticketscloud — скрипт виджета покупки билетов */}
        <Script
          src="https://ticketscloud.com/static/scripts/widget/tcwidget.js"
          strategy="beforeInteractive"
        />

        {/* Teplohod.info — скрипт виджета покупки билетов */}
        <Script
          src="https://api.teplohod.info/v1/widget/widget.js"
          strategy="lazyOnload"
        />

        {/* Яндекс Метрика */}
        {process.env.NEXT_PUBLIC_YM_ID && (
          <>
            <Script id="yandex-metrika" strategy="afterInteractive">
              {`
                (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
                m[i].l=1*new Date();
                for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
                k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
                (window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");

                ym(${process.env.NEXT_PUBLIC_YM_ID}, "init", {
                  clickmap:true,
                  trackLinks:true,
                  accurateTrackBounce:true,
                  webvisor:true,
                  ecommerce:"dataLayer"
                });
              `}
            </Script>
            <noscript>
              <div>
                <img
                  src={`https://mc.yandex.ru/watch/${process.env.NEXT_PUBLIC_YM_ID}`}
                  style={{ position: 'absolute', left: '-9999px' }}
                  alt=""
                />
              </div>
            </noscript>
          </>
        )}
      </body>
    </html>
  );
}
