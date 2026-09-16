import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        dt: {
          bg: '#0e0e14',
          surface: '#1a1a26',
          card: '#20202e',
          border: '#2e2e42',
          blue: '#1496ff',
          'blue-dim': '#0d6bbf',
          green: '#4dab9a',
          amber: '#e8a317',
          red: '#f55656',
          muted: '#8a8aaa',
          text: '#e0e0f0',
        },
      },
    },
  },
  plugins: [],
}

export default config
