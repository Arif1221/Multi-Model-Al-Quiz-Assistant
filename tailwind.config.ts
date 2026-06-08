import type { Config } from 'tailwindcss';

export default {
  darkMode: 'class',
  content: ['./index.html', './sidepanel.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif']
      },
      colors: {
        pilot: {
          ink: '#111827',
          line: '#d8dee9',
          panel: '#f8fafc',
          blue: '#2563eb',
          mint: '#0f766e',
          amber: '#b45309',
          rose: '#be123c'
        }
      }
    }
  },
  plugins: []
} satisfies Config;
