import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'BIST RADAR STUDIO',
  description: 'BIST100 Piyasa Takip ve İçerik Üretim Paneli — Bilgilendirme amaçlıdır',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" style={{ height: '100%' }}>
      <body style={{ height: '100%', margin: 0 }}>{children}</body>
    </html>
  );
}
