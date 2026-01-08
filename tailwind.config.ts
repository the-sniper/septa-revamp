import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        'background-elevated': 'var(--background-elevated)',
        'background-subtle': 'var(--background-subtle)',
        foreground: 'var(--foreground)',
        'foreground-muted': 'var(--foreground-muted)',
        'foreground-subtle': 'var(--foreground-subtle)',
        border: 'var(--border)',
        'border-strong': 'var(--border-strong)',
        'septa-blue': 'var(--septa-blue)',
        'septa-blue-light': 'var(--septa-blue-light)',
        'septa-blue-dark': 'var(--septa-blue-dark)',
        'septa-gold': 'var(--septa-gold)',
        'septa-gold-light': 'var(--septa-gold-light)',
        'septa-gold-dark': 'var(--septa-gold-dark)',
        'live-green': 'var(--live-green)',
        'live-green-bg': 'var(--live-green-bg)',
        'estimated-amber': 'var(--estimated-amber)',
        'estimated-amber-bg': 'var(--estimated-amber-bg)',
        'no-data-gray': 'var(--no-data-gray)',
        'no-data-gray-bg': 'var(--no-data-gray-bg)',
        'alert-red': 'var(--alert-red)',
        'alert-red-bg': 'var(--alert-red-bg)',
      },
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
      },
    },
  },
  plugins: [],
};

export default config;

