/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Themeable — resolve from CSS vars so every brand/primary utility follows
        // the active theme (with opacity support via <alpha-value>).
        primary: {
          DEFAULT: 'rgb(var(--c-primary-rgb) / <alpha-value>)',
          light: 'rgb(var(--c-primary-light-rgb) / <alpha-value>)',
          dark: 'rgb(var(--c-primary-dark-rgb) / <alpha-value>)',
        },
        brand: {
          bg: 'rgb(var(--c-bg-rgb) / <alpha-value>)',
          surface: 'rgb(var(--c-surface-rgb) / <alpha-value>)',
          border: 'rgb(var(--c-border-rgb) / <alpha-value>)',
          text: 'rgb(var(--c-text-rgb) / <alpha-value>)',
          muted: 'rgb(var(--c-muted-rgb) / <alpha-value>)',
          sidebar: '#0F0E2E',
          'sidebar-hover': '#1A1854',
          'sidebar-accent': '#818CF8',
        },
        emerald: { 50: '#ECFDF5', 100: '#D1FAE5', 500: '#10B981', 600: '#059669' },
        violet: { 50: '#F5F3FF', 100: '#EDE9FE', 500: '#8B5CF6', 600: '#7C3AED' },
        sky: { 50: '#F0F9FF', 100: '#E0F2FE', 500: '#0EA5E9', 600: '#0284C7' },
        amber: { 50: '#FFFBEB', 100: '#FEF3C7', 500: '#F59E0B', 600: '#D97706' },
        rose: { 50: '#FFF1F2', 100: '#FFE4E6', 500: '#F43F5E', 600: '#E11D48' },
        indigo: { 50: '#EEF2FF', 100: '#E0E7FF', 500: '#6366F1', 600: '#4F46E5', 700: '#4338CA' },
      },
      fontFamily: {
        heading: ['var(--font-heading)', 'Poppins', 'system-ui', 'sans-serif'],
        body: ['var(--font-body)', 'Poppins', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.05), 0 4px 12px rgba(0,0,0,0.04)',
        stat: '0 2px 8px rgba(0,0,0,0.06)',
        'primary-glow': '0 4px 14px rgba(79,70,229,0.25)',
      },
    },
  },
  plugins: [],
};
