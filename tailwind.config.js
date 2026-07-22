/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/renderer/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sora: ['"Sora"', 'sans-serif'],
        serif: ['"Fraunces"', 'Georgia', 'serif'],
        sans: ['"Sora"', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Existing Editorial Atelier palette (preserved for the chat app)
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        // Landing page — SENTINEL theme tokens
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--background))',
          foreground: 'hsl(var(--foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--background))',
          foreground: 'hsl(var(--foreground))',
        },
        // Custom landing tokens
        'nav-button': 'hsl(var(--nav-button))',
        'hero-bg': 'hsl(var(--hero-bg))',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
                'fade-up': {
                  // Optimised: opacity + transform only (no filter:blur,
                  // which forces an expensive off-screen compositing pass
                  // and is the single biggest source of jank on entry).
                  '0%': { opacity: '0', transform: 'translateY(12px)' },
                  '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                'fade-in': {
                  '0%': { opacity: '0' },
                  '100%': { opacity: '1' },
                },
                'accordion-down': {
                  from: { height: '0' },
                  to: { height: 'var(--radix-accordion-content-height)' },
                },
                'accordion-up': {
                  from: { height: 'var(--radix-accordion-content-height)' },
                  to: { height: '0' },
                },
              },
              animation: {
                'fade-up': 'fade-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) both',
                'fade-in': 'fade-in 0.5s ease-out both',
                'accordion-down': 'accordion-down 0.2s ease-out',
                'accordion-up': 'accordion-up 0.2s ease-out',
              },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
