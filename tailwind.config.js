/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    // This is crucial: tell Tailwind where to scan your React files for class names
    "./src/**/*.{js,jsx,ts,tsx,css,json}",
    "./public/index.html",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}