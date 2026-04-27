/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['"Instrument Serif"', 'ui-serif', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        paper: {
          DEFAULT: '#F5F1EA',
          soft: '#EFEAE0',
          card: '#FFFFFF',
        },
        ink: {
          DEFAULT: '#15171A',
          80: '#2A2D31',
          60: '#5A5E66',
          40: '#8A8E96',
          20: '#C5C7CC',
          10: '#E5E0D5',
        },
        navy: {
          DEFAULT: '#1F3A5F',
          deep: '#152A47',
          soft: '#3A5778',
        },
        moss: {
          DEFAULT: '#2E5A3F',
          soft: '#4A7359',
          mist: '#E3ECDF',
        },
        clay: {
          DEFAULT: '#B7472A',
          soft: '#D86A4F',
          mist: '#F2DDD2',
        },
        ochre: {
          DEFAULT: '#C28A2C',
          mist: '#F1E3C2',
        },
        brass: {
          DEFAULT: '#A88B5F',
          deep: '#8A7048',
          soft: '#C4A881',
          mist: '#EFE7D7',
        },
      },
      letterSpacing: {
        editorial: '-0.02em',
        widelabel: '0.14em',
      },
      borderRadius: {
        sm2: '4px',
      },
      boxShadow: {
        page: '0 1px 0 0 rgba(21,23,26,0.04), 0 12px 40px -24px rgba(21,23,26,0.18)',
        line: 'inset 0 -1px 0 0 #E5E0D5',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        skeleton: {
          '0%': { backgroundPosition: '-220% 0' },
          '100%': { backgroundPosition: '220% 0' },
        },
      },
      animation: {
        fadeUp: 'fadeUp 0.45s ease-out both',
        skeleton: 'skeleton 1.6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
