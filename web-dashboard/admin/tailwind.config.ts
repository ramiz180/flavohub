import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#FF6B00',
          secondary: '#121826',
          accent: '#00C47A',
          background: '#F8FAFC',
        },
        sidebar: '#121826',
      },
      boxShadow: {
        premium: '0 4px 20px -2px rgba(0,0,0,0.05)',
        'premium-hover': '0 10px 30px -4px rgba(0,0,0,0.1)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
  safelist: [
    'lg:pl-[280px]',
    'lg:pl-[68px]',
  ],
};

export default config;
