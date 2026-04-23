/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './src/app/**/*.{js,jsx,ts,tsx}',
    './src/components/**/*.{js,jsx,ts,tsx}',
    './src/lib/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: 'hsl(var(--bg))',
        surface: 'hsl(var(--surface))',
        panel: 'hsl(var(--panel))',
        border: 'hsl(var(--border))',
        text: 'hsl(var(--text))',
        muted: 'hsl(var(--muted))',
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        brand: {
          50: '#eef6ff',
          100: '#d7eaff',
          200: '#add4ff',
          300: '#7db7ff',
          400: '#5292ff',
          500: '#2457f5',
          600: '#1740d1',
          700: '#1733a8',
          800: '#172f84',
          900: '#162b68',
        },
      },
      boxShadow: {
        soft: '0 16px 48px rgba(3, 7, 18, 0.24)',
        panel: '0 18px 60px rgba(9, 16, 31, 0.35)',
      },
      backgroundImage: {
        'axis-radial': 'radial-gradient(circle at top, rgba(36,87,245,0.22), transparent 55%)',
        'axis-grid': 'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
      },
      backgroundSize: {
        grid: '44px 44px',
      },
      borderRadius: {
        xl2: '1.25rem',
        xl3: '1.5rem',
      },
    },
  },
  plugins: [],
};
