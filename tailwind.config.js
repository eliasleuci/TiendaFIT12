/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#EFE8D8',
        moss: {
          50: '#EEF1EA',
          100: '#D6DECB',
          400: '#5B6E4E',
          600: '#3A4A34',
          700: '#2C3928',
          900: '#1D251A',
        },
        paprika: {
          500: '#A8492D',
          600: '#8E3B23',
        },
        turmeric: {
          400: '#D69A2D',
          500: '#C0871F',
        },
        ink: '#2A2620',
      },
      fontFamily: {
        display: ['"Fraunces"', 'serif'],
        body: ['"Work Sans"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}

