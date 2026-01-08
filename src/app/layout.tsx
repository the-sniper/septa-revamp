import type { Metadata, Viewport } from 'next';
import { BottomNav, PageContainer } from '@/components/Navigation';
import './globals.css';

export const metadata: Metadata = {
  title: 'SEPTA Transit',
  description: 'Real-time transit information for Philadelphia',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'SEPTA',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#0a0f1a',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <PageContainer>
          {children}
        </PageContainer>
        <BottomNav />
      </body>
    </html>
  );
}
