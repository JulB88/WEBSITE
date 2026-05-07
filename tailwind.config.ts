import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#fff0f2',
          100: '#ffd6dc',
          200: '#ffadb9',
          300: '#ff7a8d',
          400: '#ff3d58',
          500: '#e51937',
          600: '#cc1430',
          700: '#a50e26',
          800: '#7e0a1d',
          900: '#590714',
          950: '#360309',
        },
        navy: {
          DEFAULT: '#1f2232',
          light:   '#2a2f45',
          dark:    '#13161f',
        },
      },
      fontFamily: {
        sans: ['Montserrat', 'sans-serif'],
      },
      borderRadius: {
        none: '0',
      },
    },
  },
  plugins: [],
}

export default config
