/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './views/**/*.ejs',
    './public/js/**/*.js'
  ],
  safelist: [
    'md:grid-cols-1',
    'md:grid-cols-2',
    'md:grid-cols-3'
  ],
  theme: {
    extend: {
      colors: {
        dark: { 900: '#1a1d23', 800: '#22262e', 700: '#2a2f38', 600: '#343842' },
        accent: { DEFAULT: '#199dff', light: '#47b4ff', dark: '#0c7cd5' }
        // A/B TEST niebieski (stara marka 2022). Teal byl: DEFAULT '#0d9488', light '#14b8a6', dark '#0f766e'
        // Poprzedni pomarańczowy backup: DEFAULT: '#ea580c', light: '#f97316', dark: '#c2410c'
      }
    }
  },
  plugins: []
}
