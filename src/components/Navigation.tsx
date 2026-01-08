'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, MapPin, Route, Bell, Heart } from 'lucide-react';

const navItems = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/nearby', label: 'Nearby', icon: MapPin },
  { href: '/routes', label: 'Routes', icon: Route },
  { href: '/alerts', label: 'Alerts', icon: Bell },
  { href: '/favorites', label: 'Saved', icon: Heart },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background-elevated border-t border-border safe-area-bottom">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-around">
          {navItems.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== '/' && pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex flex-col items-center justify-center
                  py-2 px-4 min-w-[64px]
                  transition-colors
                  ${isActive 
                    ? 'text-septa-gold' 
                    : 'text-foreground-subtle hover:text-foreground'
                  }
                `}
              >
                <Icon className={`w-6 h-6 ${isActive ? 'stroke-[2.5]' : ''}`} />
                <span className="text-xs mt-1 font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

export function Header({ title, showBack = false }: { title?: string; showBack?: boolean }) {
  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
        {showBack ? (
          <Link
            href="/"
            className="flex items-center gap-2 text-foreground-muted hover:text-foreground transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            <span className="text-sm">Back</span>
          </Link>
        ) : (
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-septa-blue flex items-center justify-center">
              <span className="text-septa-gold font-bold text-sm">S</span>
            </div>
            <span className="font-bold text-foreground">SEPTA</span>
          </Link>
        )}
        {title && (
          <h1 className="font-semibold text-foreground absolute left-1/2 -translate-x-1/2">
            {title}
          </h1>
        )}
        <div className="w-16" /> {/* Spacer for centering */}
      </div>
    </header>
  );
}

export function PageContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background pb-20">
      {children}
    </div>
  );
}

