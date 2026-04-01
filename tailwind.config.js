/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#ECFDF5',
          100: '#D1FAE5',
          400: '#34D399',
          500: '#10B981',
          600: '#059669',
        },
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.6s ease-out forwards',
        'slide-up': 'slideUp 0.6s ease-out forwards',
        'slide-right': 'slideRight 0.4s ease-out forwards',
        'slide-down': 'slideDown 0.5s ease-out forwards',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'spin-slow': 'spin 8s linear infinite',
        'bounce-subtle': 'bounceSubtle 2s ease-in-out infinite',
        'scale-in': 'scaleIn 0.5s ease-out forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideRight: {
          '0%': { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(16,185,129,0.2), 0 0 20px rgba(16,185,129,0.1)' },
          '100%': { boxShadow: '0 0 20px rgba(16,185,129,0.4), 0 0 40px rgba(16,185,129,0.2)' },
        },
        bounceSubtle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
};
