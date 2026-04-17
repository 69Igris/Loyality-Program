/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 20px 60px -25px rgba(59, 130, 246, 0.45)',
        card: '0 24px 60px -30px rgba(15, 23, 42, 0.9)',
      },
      backgroundImage: {
        'app-gradient':
          'radial-gradient(circle at 20% 20%, rgba(59, 130, 246, 0.25), transparent 38%), radial-gradient(circle at 80% 0%, rgba(147, 51, 234, 0.2), transparent 34%), linear-gradient(140deg, #020617 0%, #0b1120 48%, #111827 100%)',
      },
      keyframes: {
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        gradientShift: {
          '0%': { backgroundPosition: '0% 50%' },
          '100%': { backgroundPosition: '200% 50%' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.7s infinite',
        gradientShift: 'gradientShift 8s linear infinite',
      },
    },
  },
  plugins: [],
}

