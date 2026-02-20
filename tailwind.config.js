/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        base: 'rgb(var(--color-base) / <alpha-value>)',
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        elevated: 'rgb(var(--color-elevated) / <alpha-value>)',
        hover: 'rgb(var(--color-hover) / <alpha-value>)',
        fg: {
          DEFAULT: 'rgb(var(--color-fg) / <alpha-value>)',
          secondary: 'rgb(var(--color-fg-secondary) / <alpha-value>)',
          muted: 'rgb(var(--color-fg-muted) / <alpha-value>)',
          dim: 'rgb(var(--color-fg-dim) / <alpha-value>)',
          dimmer: 'rgb(var(--color-fg-dimmer) / <alpha-value>)',
        },
        'border-default': 'rgb(var(--color-border) / <alpha-value>)',
        'border-subtle': 'rgb(var(--color-border-subtle) / <alpha-value>)',
        'border-input': 'rgb(var(--color-border-input) / <alpha-value>)',
        primary: {
          DEFAULT: 'rgb(var(--color-accent) / <alpha-value>)',
          hover: 'rgb(var(--color-accent-hover) / <alpha-value>)',
        },
        secondary: {
          DEFAULT: 'rgb(var(--color-hover) / <alpha-value>)',
          hover: 'rgb(var(--color-fg-dimmer) / <alpha-value>)',
        },
      },
    }
  },
  plugins: []
}
