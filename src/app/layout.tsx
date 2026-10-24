import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import '@/styles/theme.css';
import '@/styles/map.css';
import '@/styles/pages.css';

export const metadata: Metadata = {
  title: 'Chasse au Trésor – ENSET Mohammedia',
  icons: { icon: '/favicon.svg' },
};

export const viewport: Viewport = { themeColor: '#0B2233', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <div id="root">{children}</div>
      </body>
    </html>
  );
}
