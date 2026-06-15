/** @type {import('tailwindcss').Config} */
import daisyui from 'daisyui';

export default {
  content: ['./src/**/*.{astro,html,js,jsx,ts,tsx,md,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      maxWidth: {
        content: '1400px',
      },
    },
  },
  plugins: [daisyui],
  daisyui: {
    // Tema oscuro cinematográfico por defecto (inspiración EPIX PLAY) + tema claro alterno.
    themes: [
      {
        daherdark: {
          'color-scheme': 'dark',
          primary: '#e11d48', // rojo cinematográfico
          'primary-content': '#ffffff',
          secondary: '#f59e0b',
          accent: '#22d3ee',
          neutral: '#1c2230',
          'neutral-content': '#cbd5e1',
          'base-100': '#0b0f17',
          'base-200': '#111827',
          'base-300': '#1c2230',
          'base-content': '#e5e7eb',
          info: '#38bdf8',
          success: '#22c55e',
          warning: '#f59e0b',
          error: '#ef4444',
          '--rounded-box': '0.75rem',
          '--rounded-btn': '0.5rem',
        },
      },
      {
        daherlight: {
          'color-scheme': 'light',
          primary: '#e11d48',
          'primary-content': '#ffffff',
          secondary: '#d97706',
          accent: '#0891b2',
          neutral: '#e5e7eb',
          'neutral-content': '#1f2937',
          'base-100': '#ffffff',
          'base-200': '#f3f4f6',
          'base-300': '#e5e7eb',
          'base-content': '#111827',
          info: '#0ea5e9',
          success: '#16a34a',
          warning: '#d97706',
          error: '#dc2626',
        },
      },
    ],
    darkTheme: 'daherdark',
    logs: false,
  },
};
