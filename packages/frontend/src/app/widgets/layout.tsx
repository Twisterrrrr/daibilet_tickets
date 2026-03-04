export const metadata = {
  title: 'Билеты — Дайбилет',
};

export default function WidgetsRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <head>
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="width=device-width,initial-scale=1,viewport-fit=cover"
        />
        <style
          // Лёгкая оболочка под iframe, без общего хедера/футера
          dangerouslySetInnerHTML={{
            __html: `
              :root { color-scheme: light dark; }
              body {
                margin: 0; padding: 0;
                font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
                background: #ffffff; color: #111827;
              }
              .dbw-root { padding: 12px 16px 16px; }
              @media (min-width: 640px) { .dbw-root { padding: 16px 20px 20px; } }
            `,
          }}
        />
      </head>
      <body>
        <div className="dbw-root">{children}</div>
      </body>
    </html>
  );
}

