import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'rgb(var(--color-primary) / <alpha-value>)',
          dark: 'rgb(var(--color-primary-dark) / <alpha-value>)',
          light: 'rgb(var(--color-primary-light) / <alpha-value>)',
        },
        church: {
          navy: 'rgb(var(--color-church-navy) / <alpha-value>)',
          blue: 'rgb(var(--color-church-blue) / <alpha-value>)',
          lightblue: 'rgb(var(--color-church-lightblue) / <alpha-value>)',
          border: 'rgb(var(--color-church-border) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;