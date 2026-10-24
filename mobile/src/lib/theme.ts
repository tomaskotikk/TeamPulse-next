import { createContext, useContext } from 'react'

// Same values the web derives in getThemeVars() for clubs with a black secondary
// colour and white accent (bg = secondary, surfaces lightened 8 % / 15 %, borders 20 %).
export const palette = {
  bg: '#000000',
  surface: '#141414',
  surface2: '#262626',
  border: '#333333',
  text: '#FFFFFF',
  muted: '#B3B3B3',
  dim: '#808080',
  yes: '#1F9D55',
  no: '#D64545',
  warning: '#F2A93B',
}

export const eventTypeColor: Record<string, string> = {
  training: '#FF5C66',
  match: '#16C3AD',
  meeting: '#8B95AB',
  event: '#7E7CFC',
}

export const eventTypeLabel: Record<string, string> = {
  training: 'Trénink',
  match: 'Zápas',
  meeting: 'Schůzka',
  event: 'Akce',
}

export type Theme = { accent: string; accentText: string; accentSoft: string }

function hexToRgb(hex: string) {
  const clean = hex.replace('#', '')
  if (clean.length !== 6) return { r: 232, g: 67, b: 10 }
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  }
}

/** Club primary color from the database drives the accent. */
export function themeFromClub(primary?: string | null): Theme {
  const accent = primary && /^#[0-9a-f]{6}$/i.test(primary) ? primary : '#FF3300'
  const { r, g, b } = hexToRgb(accent)
  const light = (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6
  return { accent, accentText: light ? '#0B0D10' : '#FFFFFF', accentSoft: `rgba(${r}, ${g}, ${b}, 0.16)` }
}

export const ThemeContext = createContext<Theme>(themeFromClub(null))
export const useTheme = () => useContext(ThemeContext)
