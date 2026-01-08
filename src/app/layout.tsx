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
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f8fafc' },
    { media: '(prefers-color-scheme: dark)', color: '#0c1222' },
  ],
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
