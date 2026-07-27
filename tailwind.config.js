/** @type {import('tailwindcss').Config} */
// NB: estes tokens servem APENAS à UI do app (Tailwind). Os slides que viram
// PNG NÃO usam Tailwind — usam objetos de estilo inline em src/templates.
// Ver §4-A do prompt de construção.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#050505',
        paper: '#F0EDE6',
        amber: '#FD8902',
        'amber-hi': '#FEB90E',
        'amber-deep': '#F67104',
        'amber-burnt': '#A85000',
        grey: '#8C877E',
        'grey-dark': '#4E4941',
      },
      fontFamily: {
        display: ['"Playfair Display"', 'serif'],
        util: ['Jost', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
