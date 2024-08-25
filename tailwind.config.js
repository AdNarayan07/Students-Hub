/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'blue-1100': '#000619',
        'red-1100': '#100000',
    },
    screens: {
      '1/2xl': '1100px',
    },
    rotate: {
      '270': '270deg',
    },
    },
  },
  plugins: [],
};