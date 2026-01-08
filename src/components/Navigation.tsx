'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Navigation, Route, Bell, Heart, ChevronLeft } from 'lucide-react';

const navItems = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/trip', label: 'Trip', icon: Navigation },
  { href: '/routes', label: 'Routes', icon: Route },
  { href: '/alerts', label: 'Alerts', icon: Bell },
  { href: '/favorites', label: 'Saved', icon: Heart },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-border-subtle safe-bottom">
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
                  py-3 px-4 min-w-[64px]
                  transition-all duration-200
                  ${isActive 
                    ? 'text-septa-gold' 
                    : 'text-text-muted hover:text-text-secondary'
                  }
                `}
              >
                <Icon 
                  className={`w-6 h-6 transition-transform ${isActive ? 'scale-110' : ''}`} 
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <span className={`text-xs mt-1 ${isActive ? 'font-semibold' : 'font-medium'}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

export function Header({ 
  title, 
  showBack = false,
  rightAction,
}: { 
  title?: string; 
  showBack?: boolean;
  rightAction?: React.ReactNode;
}) {
  const router = useRouter();

  return (
    <header className="sticky top-0 z-40 glass border-b border-border-subtle">
      <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
        {showBack ? (
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1 text-text-secondary hover:text-text-primary transition-colors -ml-2 p-2 rounded-lg hover:bg-bg-tertiary"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Back</span>
          </button>
        ) : (
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-septa-blue flex items-center justify-center">
              <span className="text-septa-gold font-bold text-sm">S</span>
            </div>
          </Link>
        )}
        
        {title && (
          <h1 className="font-semibold text-text-primary absolute left-1/2 -translate-x-1/2">
            {title}
          </h1>
        )}
        
        {rightAction || <div className="w-16" />}
      </div>
    </header>
  );
}

export function PageContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg-primary pb-20">
      {children}
    </div>
  );
}

// Floating Action Button for key actions
export function FAB({ 
  onClick, 
  icon: Icon, 
  label,
  variant = 'primary' 
}: { 
  onClick: () => void; 
  icon: React.ComponentType<{ className?: string }>; 
  label: string;
  variant?: 'primary' | 'secondary';
}) {
  return (
    <button
      onClick={onClick}
      className={`
        fixed bottom-24 right-4 z-40
        flex items-center gap-2 px-5 py-3 rounded-full
        font-semibold shadow-lg
        transition-all duration-200 hover:scale-105 active:scale-95
        ${variant === 'primary' 
          ? 'bg-septa-blue text-white hover:bg-septa-blue-bright' 
          : 'bg-bg-elevated text-text-primary border border-border hover:bg-bg-highlight'
        }
      `}
      aria-label={label}
    >
      <Icon className="w-5 h-5" />
      <span>{label}</span>
    </button>
  );
}
