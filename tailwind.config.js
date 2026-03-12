/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  // Safelist classes used in dynamic/conditional className (e.g. template literals).
  // Production purge can miss these; including them prevents styling break on deploy (e.g. Hostinger).
  safelist: [
    { pattern: /^text-(red|green|blue|gray|pink|orange)-(400|500|600|700)$/ },
    { pattern: /^bg-(red|green|blue|gray|pink|purple|yellow)-(50|100|500)$/ },
    { pattern: /^border-(red|green|blue|gray|pink)-(50|100|200|500)$/ },
    'left-1', 'left-7',
    'ring-2', 'ring-offset-1', 'ring-black',
    'blur-sm', 'pointer-events-none',
    'border-green-500', 'border-gray-300', 'hover:border-pink-500',
    'opacity-50', 'cursor-not-allowed', 'hover:opacity-90',
  ],
  theme: {
    extend: {
      colors: {
        primary: {"50":"#fdf4ff","100":"#fae8ff","200":"#f5d0fe","300":"#f0abfc","400":"#e879f9","500":"#d946ef","600":"#c026d3","700":"#a21caf","800":"#86198f","900":"#701a75","950":"#4a044e"}
      },
      fontFamily: {
        'body': [
          'Slabo 27px',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'Noto Sans',
          'sans-serif',
        ],
        'sans': [
          'Slabo 27px',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'Noto Sans',
          'sans-serif',
        ]
      }
    }
  },
  plugins: [],
  darkMode: 'class',
};
