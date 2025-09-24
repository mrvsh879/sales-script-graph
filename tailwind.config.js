// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // можно убрать, если не нужен тёмный режим по классу
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // тут можно настраивать цвета/шрифты/тени под твой футуристичный UI
    },
  },
  plugins: [],
};
