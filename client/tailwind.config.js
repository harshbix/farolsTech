/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50:  '#f0f7ff',
          100: '#e0effe',
          200: '#b9dffd',
          300: '#7cc5fb',
          400: '#37a6f6',
          500: '#0d87e4',
          600: '#006ac0',
          700: '#00539b',
          800: '#04477f',
          900: '#0a3b69',
          950: '#072549',
        },
        surface: {
          DEFAULT: '#0f172a',
          raised:  '#1e293b',
          border:  '#334155',
          muted:   '#64748b',
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
