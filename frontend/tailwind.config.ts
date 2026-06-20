import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#5B7FA6',
          dark: '#3d5c7d',
          light: '#EAF0F7',
        },
        church: {
          navy: '#1A1A1A',
          blue: '#5B7FA6',
          lightblue: '#EAF0F7',
          border: '#D1D9E0',
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
