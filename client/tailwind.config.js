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
      typography: (theme) => ({
        DEFAULT: {
          css: {
            color: theme('colors.gray.100'),
            a: { color: theme('colors.brand.400') },
            h1: { fontFamily: theme('fontFamily.display') },
            h2: { fontFamily: theme('fontFamily.display') },
            h3: { fontFamily: theme('fontFamily.display') },
          },
        },
      }),
    },
  },
  plugins: [],
};
