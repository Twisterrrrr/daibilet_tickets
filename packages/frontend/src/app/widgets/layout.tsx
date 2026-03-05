export const metadata = {
  title: 'Билеты — Дайбилет',
};

export default function WidgetsRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="dbw-root">{children}</div>
  );
}

