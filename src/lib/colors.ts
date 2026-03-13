/**
 * Port PHP club-colors.php logiky do TypeScript.
 * Generuje CSS proměnné pro barvy klubu.
 */

export interface ClubColors {
  primary: string
  secondary: string
  accent: string
  redText: string
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null
}

function isLightColor(hex: string): boolean {
  const rgb = hexToRgb(hex)
  if (!rgb) return false
  // Relativní luminance dle WCAG
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255
  return luminance > 0.5
}

function darkenColor(hex: string, amount: number): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return hex
  const r = Math.max(0, rgb.r - amount)
  const g = Math.max(0, rgb.g - amount)
  const b = Math.max(0, rgb.b - amount)
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

export function getClubColorsCSSVars(colors: ClubColors): string {
  const primary = colors.primary || '#E43432'
  const dark = darkenColor(primary, 30)
  const redText = isLightColor(primary) ? '#000000' : '#ffffff'

  return `
    --red: ${primary};
    --red-dark: ${dark};
    --red-text: ${redText};
    --primary: ${primary};
    --primary-dark: ${dark};
  `.trim()
}

export function getDefaultColors(): ClubColors {
  return {
    primary: '#E43432',
    secondary: '#1a1a1a',
    accent: '#E43432',
    redText: '#ffffff',
  }
}
