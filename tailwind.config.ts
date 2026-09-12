import type { Config } from 'tailwindcss'

export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Roboto Flex"', '"Google Sans"', '"Google Sans Text"', 'Roboto', '-apple-system', 'sans-serif'],
        mono: ['"Roboto Mono"', 'monospace'],
      },
      colors: {
        tobo: {
          sky: {
            DEFAULT: '#9EB7E5',
            container: '#E6EFFD',
            dark: '#6A8DC9',
            text: '#1B315B'
          },
          lavender: {
            DEFAULT: '#D6C7E5',
            container: '#F3EEF9',
            dark: '#9F8CB8',
            text: '#3A284E'
          },
          mint: {
            DEFAULT: '#BCE7D0',
            container: '#EDF9F2',
            dark: '#76BFA0',
            text: '#16432B'
          },
          peach: {
            DEFAULT: '#FAD2B8',
            container: '#FDF2EB',
            dark: '#E09F7B',
            text: '#502914'
          }
        },
        primary: {
          DEFAULT: 'var(--color-primary, #9EB7E5)',
          container: 'var(--color-primary-container, #E6EFFD)',
          on: 'var(--color-on-primary, #1B315B)',
          onContainer: 'var(--color-on-primary-container, #0F1E38)'
        },
        secondary: {
          DEFAULT: 'var(--color-secondary, #D6C7E5)',
          container: 'var(--color-secondary-container, #F3EEF9)',
          on: 'var(--color-on-secondary, #3A284E)',
          onContainer: 'var(--color-on-secondary-container, #221233)'
        },
        tertiary: {
          DEFAULT: 'var(--color-tertiary, #BCE7D0)',
          container: 'var(--color-tertiary-container, #EDF9F2)',
          on: 'var(--color-on-tertiary, #16432B)',
          onContainer: 'var(--color-on-tertiary-container, #0B2416)'
        },
        surface: {
          DEFAULT: 'var(--color-surface, #F9F9FB)',
          dim: 'var(--color-surface-dim, #EDEDF2)',
          bright: 'var(--color-surface-bright, #FFFFFF)',
          lowest: 'var(--color-surface-lowest, #FFFFFF)',
          low: 'var(--color-surface-low, #F3F3F7)',
          container: 'var(--color-surface-container, #EDEDF2)',
          high: 'var(--color-surface-high, #E7E7ED)',
          highest: 'var(--color-surface-highest, #E1E1E8)',
          on: 'var(--color-on-surface, #1A1C1E)',
          onVariant: 'var(--color-on-surface-variant, #44474E)'
        },
        outline: {
          DEFAULT: 'var(--color-outline, #74777F)',
          variant: 'var(--color-outline-variant, #C4C7D0)'
        }
      },
      borderRadius: {
        'xs': '4px',
        'sm': '8px',
        'md': '12px',
        'lg': '16px',
        'xl': '20px',
        '2xl': '24px',
        '3xl': '28px',
        '4xl': '36px',
        'pill': '9999px'
      },
      boxShadow: {
        'elevation-1': '0 1px 3px 1px rgba(0, 0, 0, 0.07), 0 1px 2px 0 rgba(0, 0, 0, 0.04)',
        'elevation-2': '0 2px 6px 2px rgba(0, 0, 0, 0.07), 0 1px 2px 0 rgba(0, 0, 0, 0.03)',
        'elevation-3': '0 4px 12px 3px rgba(0, 0, 0, 0.08), 0 1px 3px 0 rgba(0, 0, 0, 0.04)',
        'elevation-4': '0 6px 18px 4px rgba(0, 0, 0, 0.1), 0 2px 4px 0 rgba(0, 0, 0, 0.05)',
        'floating-bar': '0 8px 30px -4px rgba(0, 0, 0, 0.08), 0 4px 12px -2px rgba(0, 0, 0, 0.04)',
        'floating-dock': '0 10px 35px -5px rgba(0, 0, 0, 0.12), 0 4px 12px -2px rgba(0, 0, 0, 0.05)'
      },
      transitionTimingFunction: {
        'spring-expressive': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'm3-emphasized': 'cubic-bezier(0.2, 0.0, 0, 1.0)',
        'm3-decelerate': 'cubic-bezier(0.05, 0.7, 0.1, 1.0)'
      }
    },
  },
  plugins: [],
} satisfies Config
