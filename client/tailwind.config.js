/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Poppins', '-apple-system', 'BlinkMacSystemFont', 'SF Pro Text', 'Roboto', 'system-ui', 'sans-serif'],
        display: ['Poppins', '-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'Roboto', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50:  'rgb(var(--brand-50) / <alpha-value>)',
          100: 'rgb(var(--brand-100) / <alpha-value>)',
          200: 'rgb(var(--brand-200) / <alpha-value>)',
          300: 'rgb(var(--brand-300) / <alpha-value>)',
          400: 'rgb(var(--brand-400) / <alpha-value>)',
          500: 'rgb(var(--brand-500) / <alpha-value>)',
          600: 'rgb(var(--brand-600) / <alpha-value>)',
          700: 'rgb(var(--brand-700) / <alpha-value>)',
          800: 'rgb(var(--brand-800) / <alpha-value>)',
          900: 'rgb(var(--brand-900) / <alpha-value>)',
          950: 'rgb(var(--brand-950) / <alpha-value>)',
        },
        surface: {
          DEFAULT: 'rgb(var(--surface-bg) / <alpha-value>)',
          raised:  'rgb(var(--surface-raised) / <alpha-value>)',
          border:  'rgb(var(--surface-border) / <alpha-value>)',
          muted:   'rgb(var(--surface-muted) / <alpha-value>)',
        },
      },
      fontSize: {
        // Enhanced typography scale
        xs: ['12px', { lineHeight: '1.5rem' }],
        sm: ['14px', { lineHeight: '1.5rem' }],
        base: ['16px', { lineHeight: '1.5rem' }],
        lg: ['18px', { lineHeight: '1.75rem' }],
        xl: ['20px', { lineHeight: '1.75rem' }],
        '2xl': ['24px', { lineHeight: '2rem' }],
        '3xl': ['32px', { lineHeight: '2.25rem' }],
        '4xl': ['40px', { lineHeight: '2.75rem' }],
        '5xl': ['48px', { lineHeight: '3rem' }],
      },
      lineHeight: {
        tight: '1.2',
        snug: '1.4',
        normal: '1.6',
        relaxed: '1.8',
        loose: '2',
        prose: '1.75',
      },
      spacing: {
        // Consistent spacing scale
        xs: '4px',
        sm: '8px',
        md: '12px',
        base: '16px',
        lg: '24px',
        xl: '32px',
        '2xl': '48px',
        '3xl': '64px',
      },
      maxWidth: {
        prose: '65ch',
        content: '820px',
      },
      animation: {
        // Premium animations
        'fade-in': 'fadeIn 0.3s ease-in',
        'fade-out': 'fadeOut 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'slide-in': 'slideIn 0.3s ease-out',
        'bounce-spring': 'bounceSpring 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        fadeOut: {
          from: { opacity: '1' },
          to: { opacity: '0' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        slideIn: {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        bounceSpring: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.15)' },
        },
      },
      typography: (theme) => ({
        DEFAULT: {
          css: {
            color: theme('colors.gray.100'),
            a: { color: theme('colors.brand.400') },
            h1: { fontFamily: theme('fontFamily.display'), lineHeight: theme('lineHeight.tight') },
            h2: { fontFamily: theme('fontFamily.display'), lineHeight: theme('lineHeight.tight') },
            h3: { fontFamily: theme('fontFamily.display'), lineHeight: theme('lineHeight.tight') },
            h4: { fontFamily: theme('fontFamily.display'), lineHeight: theme('lineHeight.snug') },
          },
        },
      }),
    },
  },
  plugins: [],
};
