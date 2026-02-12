/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    './index.html'
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      colors: {
        // Dark Navy Blue Theme
        navy: {
          50: '#F0F9FF',
          100: '#E0F2FE',
          200: '#BAE6FD',
          300: '#7DD3FC',
          400: '#38BDF8',
          500: '#0EA5E9', // Sky Blue
          600: '#0284C7', // Dark Sky
          700: '#0369A1', // Navy Blue
          800: '#075985', // Dark Navy
          900: '#0C4A6E', // Deep Navy
          950: '#082F49', // Very Deep Navy
          DEFAULT: '#0369A1', // Navy Blue as default
        },
        // Keep emerald for backward compatibility (map to blue)
        emerald: {
          50: '#F0F9FF',
          100: '#E0F2FE',
          200: '#BAE6FD',
          300: '#7DD3FC',
          400: '#38BDF8',
          500: '#0EA5E9',
          600: '#0284C7', // Dark Sky
          700: '#0369A1', // Navy Blue
          800: '#075985', // Dark Navy
          900: '#0C4A6E', // Deep Navy
          DEFAULT: '#0369A1', // Navy Blue as default
        },
        // Keep charcoal for text
        charcoal: {
          DEFAULT: '#1F2937', // Gray-800
          light: '#374151', // Gray-700
        },
        // Crimson for errors/warnings
        crimson: {
          DEFAULT: '#DC2626',
          light: '#EF4444',
        },
        // Aliases for backward compatibility
        'deep-blue': '#0369A1', // Navy Blue
        'navy-blue': '#075985', // Dark Navy
        'sky-blue': '#0EA5E9', // Sky Blue
      },
      animation: {
        'spin': 'spin 1s linear infinite',
        'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.3s ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }
      }
    },
  },
  plugins: [],
}