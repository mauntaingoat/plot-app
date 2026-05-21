/** @type {import('tailwindcss').Config} */
module.exports = {
  // NativeWind v4 — must include nativewind preset.
  content: ['./App.tsx', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Reelst palette — mirrors src/index.css :root tokens on the web app.
        // Keep these in sync if the web palette ever shifts.
        ivory: '#FFF8F1',
        cream: '#FCEFE1',
        pearl: '#F2E5D5',
        ink: '#0A0E17',
        smoke: '#5C6373',
        ash: '#9AA0AC',
        tangerine: '#D94A1F',
        'tangerine-soft': '#FF6B3D',
        'sold-green': '#16A34A',
        'live-red': '#DC2626',
        'border-light': '#E8DDC8',
      },
      fontFamily: {
        humanist: ['Inter-Variable'],
        serif: ['DM-Serif-Display'],
      },
    },
  },
  plugins: [],
}
