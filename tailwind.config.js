export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: { arabic: ['Tajawal', 'sans-serif'] },
      colors: {
        sand: { 50:'#faf8f4', 100:'#f2ede3', 200:'#e4d9c7', 300:'#d0bc9a', 400:'#b89870', 500:'#a07d54', 600:'#8a6645', 700:'#6e4f36', 800:'#5a4030', 900:'#4a3528' },
        slate: { 900:'#0f1117', 800:'#1a1d27', 700:'#242836', 600:'#2e3344' }
      }
    }
  },
  plugins: []
}
