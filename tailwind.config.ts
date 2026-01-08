import type { Config } from 'tailwindcss';

export default {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Core backgrounds
        bg: {
          primary: 'var(--bg-primary)',
          secondary: 'var(--bg-secondary)',
          tertiary: 'var(--bg-tertiary)',
          elevated: 'var(--bg-elevated)',
          highlight: 'var(--bg-highlight)',
        },
        // Text
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
        },
        // Brand
        septa: {
          blue: 'var(--septa-blue)',
          'blue-bright': 'var(--septa-blue-bright)',
          gold: 'var(--septa-gold)',
          'gold-bright': 'var(--septa-gold-bright)',
        },
        // Transit modes
        mode: {
          bus: 'var(--mode-bus)',
          trolley: 'var(--mode-trolley)',
          'subway-mfl': 'var(--mode-subway-mfl)',
          'subway-bsl': 'var(--mode-subway-bsl)',
          rail: 'var(--mode-rail)',
          nhsl: 'var(--mode-nhsl)',
        },
        // Status
        live: 'var(--live)',
        arriving: 'var(--arriving)',
        urgent: 'var(--urgent)',
        delayed: 'var(--delayed)',
        // Borders
        border: {
          subtle: 'var(--border-subtle)',
          DEFAULT: 'var(--border-default)',
          strong: 'var(--border-strong)',
        },
      },
      fontFamily: {
        sans: ['Satoshi', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['Space Mono', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        'countdown-lg': ['3rem', { lineHeight: '1', fontWeight: '700' }],
        'countdown-md': ['2rem', { lineHeight: '1', fontWeight: '700' }],
        'countdown-sm': ['1.5rem', { lineHeight: '1', fontWeight: '700' }],
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '24px',
      },
      boxShadow: {
        glow: 'var(--shadow-glow)',
        card: 'var(--shadow-card)',
        'glow-live': '0 0 20px var(--live-glow)',
        'glow-urgent': '0 0 20px var(--urgent-glow)',
      },
      animation: {
        'pulse-live': 'pulse-live 2s ease-in-out infinite',
        'pulse-urgent': 'pulse-urgent 1s ease-in-out infinite',
        'slide-up': 'slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'fade-in': 'fade-in 0.3s ease-out forwards',
        'scale-in': 'scale-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        glow: 'glow-pulse 2s ease-in-out infinite',
        shimmer: 'shimmer 1.5s ease-in-out infinite',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(ellipse at top, var(--bg-secondary), var(--bg-primary))',
        'gradient-mesh': `
          radial-gradient(at 40% 20%, rgba(59, 130, 246, 0.1) 0px, transparent 50%),
          radial-gradient(at 80% 0%, rgba(168, 85, 247, 0.1) 0px, transparent 50%),
          radial-gradient(at 0% 50%, rgba(34, 197, 94, 0.05) 0px, transparent 50%),
          var(--bg-primary)
        `,
      },
      spacing: {
        'safe-bottom': 'env(safe-area-inset-bottom, 0px)',
        'safe-top': 'env(safe-area-inset-top, 0px)',
      },
    },
  },
  plugins: [],
} satisfies Config;
