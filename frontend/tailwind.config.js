/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        gh: {
          bg: '#0d1117',
          card: '#161b22',
          border: '#30363d',
          border2: '#21262d',
          text: '#c9d1d9',
          bright: '#f0f6fc',
          muted: '#8b949e',
          dim: '#484f58',
          accent: '#58a6ff',
        },
      },
    },
  },
  plugins: [],
}
