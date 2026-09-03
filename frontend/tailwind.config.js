/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#A100FF',
          dark: '#7500BD',
          light: '#C44DFF',
          subtle: '#F5E6FF',
        },
      },
    },
  },
  plugins: [],
}
