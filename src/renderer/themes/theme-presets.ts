export interface ThemePreset {
  id: string
  name: string
  colors: {
    base: string
    surface: string
    elevated: string
    hover: string
    fg: string
    fgSecondary: string
    fgMuted: string
    fgDim: string
    fgDimmer: string
    border: string
    borderSubtle: string
    borderInput: string
    accent: string
    accentHover: string
    terminalBg: string
    terminalFg: string
  }
}

// --- Accent Color palette (Tailwind CSS v3 official) ---

export interface AccentColor {
  id: string
  name: string
  value: string       // 500 shade (main)
  hoverDark: string   // 400 shade (hover on dark bg)
  hoverLight: string  // 600 shade (hover on light bg)
}

export const ACCENT_COLORS: AccentColor[] = [
  { id: 'blue',    name: 'Blue',    value: '#3b82f6', hoverDark: '#60a5fa', hoverLight: '#2563eb' },
  { id: 'indigo',  name: 'Indigo',  value: '#6366f1', hoverDark: '#818cf8', hoverLight: '#4f46e5' },
  { id: 'violet',  name: 'Violet',  value: '#8b5cf6', hoverDark: '#a78bfa', hoverLight: '#7c3aed' },
  { id: 'pink',    name: 'Pink',    value: '#ec4899', hoverDark: '#f472b6', hoverLight: '#db2777' },
  { id: 'rose',    name: 'Rose',    value: '#f43f5e', hoverDark: '#fb7185', hoverLight: '#e11d48' },
  { id: 'orange',  name: 'Orange',  value: '#f97316', hoverDark: '#fb923c', hoverLight: '#ea580c' },
  { id: 'emerald', name: 'Emerald', value: '#10b981', hoverDark: '#34d399', hoverLight: '#059669' },
  { id: 'teal',    name: 'Teal',    value: '#14b8a6', hoverDark: '#2dd4bf', hoverLight: '#0d9488' },
  { id: 'cyan',    name: 'Cyan',    value: '#06b6d4', hoverDark: '#22d3ee', hoverLight: '#0891b2' },
  { id: 'sky',     name: 'Sky',     value: '#0ea5e9', hoverDark: '#38bdf8', hoverLight: '#0284c7' },
]

export function getAccentColor(id: string): AccentColor | undefined {
  return ACCENT_COLORS.find((a) => a.id === id)
}

// CSS variables use space-separated RGB: "R G B"
// Hex values used for preview cards and terminal colors

const defaultDark: ThemePreset = {
  id: 'default-dark',
  name: 'Default Dark',
  colors: {
    base: '#0a0a0a',
    surface: '#171717',
    elevated: '#262626',
    hover: '#404040',
    fg: '#ffffff',
    fgSecondary: '#d4d4d4',
    fgMuted: '#a3a3a3',
    fgDim: '#737373',
    fgDimmer: '#525252',
    border: '#404040',
    borderSubtle: '#262626',
    borderInput: '#525252',
    accent: '#2563eb',
    accentHover: '#3b82f6',
    terminalBg: '#1a1a1a',
    terminalFg: '#e0e0e0',
  },
}

const dracula: ThemePreset = {
  id: 'dracula',
  name: 'Dracula',
  colors: {
    base: '#191a21',
    surface: '#21222c',
    elevated: '#282a36',
    hover: '#44475a',
    fg: '#f8f8f2',
    fgSecondary: '#e0e0e0',
    fgMuted: '#b0b0b0',
    fgDim: '#6272a4',
    fgDimmer: '#4d5a80',
    border: '#44475a',
    borderSubtle: '#2c2d3a',
    borderInput: '#6272a4',
    accent: '#bd93f9',
    accentHover: '#caa5ff',
    terminalBg: '#282a36',
    terminalFg: '#f8f8f2',
  },
}

const nord: ThemePreset = {
  id: 'nord',
  name: 'Nord',
  colors: {
    base: '#242933',
    surface: '#2e3440',
    elevated: '#3b4252',
    hover: '#434c5e',
    fg: '#eceff4',
    fgSecondary: '#d8dee9',
    fgMuted: '#a5b1c2',
    fgDim: '#7b88a1',
    fgDimmer: '#616e88',
    border: '#434c5e',
    borderSubtle: '#3b4252',
    borderInput: '#4c566a',
    accent: '#88c0d0',
    accentHover: '#8fbcbb',
    terminalBg: '#2e3440',
    terminalFg: '#d8dee9',
  },
}

const solarizedDark: ThemePreset = {
  id: 'solarized-dark',
  name: 'Solarized Dark',
  colors: {
    base: '#001e26',
    surface: '#002b36',
    elevated: '#073642',
    hover: '#094352',
    fg: '#fdf6e3',
    fgSecondary: '#eee8d5',
    fgMuted: '#93a1a1',
    fgDim: '#657b83',
    fgDimmer: '#586e75',
    border: '#094352',
    borderSubtle: '#073642',
    borderInput: '#586e75',
    accent: '#268bd2',
    accentHover: '#2e9ee6',
    terminalBg: '#002b36',
    terminalFg: '#839496',
  },
}

const oneDark: ThemePreset = {
  id: 'one-dark',
  name: 'One Dark',
  colors: {
    base: '#1e2127',
    surface: '#282c34',
    elevated: '#2c313a',
    hover: '#3e4452',
    fg: '#e6e6e6',
    fgSecondary: '#abb2bf',
    fgMuted: '#848b98',
    fgDim: '#636d83',
    fgDimmer: '#4b5263',
    border: '#3e4452',
    borderSubtle: '#2c313a',
    borderInput: '#5c6370',
    accent: '#61afef',
    accentHover: '#74b9f0',
    terminalBg: '#282c34',
    terminalFg: '#abb2bf',
  },
}

const catppuccinMocha: ThemePreset = {
  id: 'catppuccin-mocha',
  name: 'Catppuccin Mocha',
  colors: {
    base: '#1e1e2e',
    surface: '#24243e',
    elevated: '#313244',
    hover: '#45475a',
    fg: '#cdd6f4',
    fgSecondary: '#bac2de',
    fgMuted: '#a6adc8',
    fgDim: '#7f849c',
    fgDimmer: '#585b70',
    border: '#45475a',
    borderSubtle: '#313244',
    borderInput: '#585b70',
    accent: '#89b4fa',
    accentHover: '#9cc3fb',
    terminalBg: '#1e1e2e',
    terminalFg: '#cdd6f4',
  },
}

export const THEME_PRESETS: ThemePreset[] = [
  defaultDark,
  dracula,
  nord,
  solarizedDark,
  oneDark,
  catppuccinMocha,
]

export function getThemePreset(id: string): ThemePreset {
  return THEME_PRESETS.find((t) => t.id === id) ?? defaultDark
}

/** Convert hex "#rrggbb" to space-separated RGB "r g b" */
export function hexToRgb(hex: string): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `${r} ${g} ${b}`
}
