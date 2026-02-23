/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './views/**/*.ejs',
    './public/js/**/*.js'
  ],
  theme: {
    extend: {
      colors: {
        dark: { 900: '#1a1d23', 800: '#22262e', 700: '#2a2f38', 600: '#343842' },
        accent: { DEFAULT: '#ea580c', light: '#f97316', dark: '#c2410c' }
      }
    }
  },
  plugins: []
}
