/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        shell: '#1d2d3e',
        brand: { 50: '#eef6ff', 100: '#d9eaff', 500: '#0a6ed1', 600: '#0858a8', 700: '#064582' },
      },
    },
  },
  plugins: [],
};
