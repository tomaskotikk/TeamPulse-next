import { createAdminClient } from '@/lib/supabase/server'
import { readSessionFromCookies } from '@/lib/auth/session'

export type AppUser = {
  id: number
  first_name: string
  last_name: string
  email: string
  phone: string | null
  profile_picture: string | null
  role: string
  organization: string | null
  banned?: boolean
  banned_at?: string | null
  ban_reason?: string | null
  two_factor_enabled?: boolean | null
  created_at?: string
}

export type AppClub = {
  id: number
  owner_user_id: number
  approved: boolean
  rejected_at?: string | null
  rejection_reason?: string | null
  name: string
  sport: string
  city: string
  logo: string | null
  address?: string
  ico?: string
  dic?: string
  website?: string
  club_email?: string
  club_phone?: string
  primary_color?: string | null
  secondary_color?: string | null
  accent_color?: string | null
  ui_gradient_enabled?: boolean | null
  ui_gradient_strength?: number | null
  ui_gradient_soft_strength?: number | null
  ui_glow_strength?: number | null
  ui_backdrop_blur_strength?: number | null
  ui_motion_speed?: number | null
  dashboard_layout?: string | null
  created_at: string
}

const DEFAULT_COLORS = {
  primary: '#FF3300',
  secondary: '#000000',
  accent: '#FFFFFF',
}

const DEFAULT_EFFECTS = {
  gradientEnabled: true,
  gradientStrength: 58,
  softStrength: 42,
  glowStrength: 35,
  blurStrength: 8,
  motionSpeed: 100,
}

const ROLE_ORDER: Record<string, number> = {
  'manažer': 1,
  'trenér': 2,
  'hráč': 3,
  'rodič': 4,
}

function hexToRgb(hex: string) {
  const clean = hex.replace('#', '')
  if (clean.length !== 6) return { r: 0, g: 0, b: 0 }
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  }
}

function isLightColor(hex: string) {
  const { r, g, b } = hexToRgb(hex)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.5
}

function clamp(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)))
}

function lightenColor(hex: string, percent: number) {
  const { r, g, b } = hexToRgb(hex)
  const nr = clamp(r + (255 - r) * percent)
  const ng = clamp(g + (255 - g) * percent)
  const nb = clamp(b + (255 - b) * percent)
  return `#${nr.toString(16).padStart(2, '0')}${ng.toString(16).padStart(2, '0')}${nb.toString(16).padStart(2, '0')}`
}

function darkenColor(hex: string, percent: number) {
  const { r, g, b } = hexToRgb(hex)
  const nr = clamp(r * (1 - percent))
  const ng = clamp(g * (1 - percent))
  const nb = clamp(b * (1 - percent))
  return `#${nr.toString(16).padStart(2, '0')}${ng.toString(16).padStart(2, '0')}${nb.toString(16).padStart(2, '0')}`
}

function clampNumber(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function normalizeEffectNumber(value: unknown, fallback: number, min: number, max: number) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return clampNumber(parsed, min, max)
}

export async function getCurrentAppUser() {
  const session = await readSessionFromCookies()
  if (!session?.userId) return null

  const supabase = await createAdminClient()
  const { data } = await supabase
    .from('users')
    .select('id, first_name, last_name, email, phone, profile_picture, role, organization, banned, banned_at, ban_reason, two_factor_enabled, created_at')
    .eq('id', session.userId)
    .single()

  return (data as AppUser | null) ?? null
}

export async function getClubForUser(user: AppUser) {
  const supabase = await createAdminClient()

  if (user.role === 'manažer') {
    const { data } = await supabase
      .from('clubs')
      .select('id, owner_user_id, approved, rejected_at, rejection_reason, name, sport, city, logo, address, ico, dic, website, club_email, club_phone, primary_color, secondary_color, accent_color, ui_gradient_enabled, ui_gradient_strength, ui_gradient_soft_strength, ui_glow_strength, ui_backdrop_blur_strength, ui_motion_speed, dashboard_layout, created_at')
      .eq('owner_user_id', user.id)
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle()

    return (data as AppClub | null) ?? null
  }

  if (!user.organization) return null

  const { data } = await supabase
    .from('clubs')
    .select('id, owner_user_id, approved, rejected_at, rejection_reason, name, sport, city, logo, address, ico, dic, website, club_email, club_phone, primary_color, secondary_color, accent_color, ui_gradient_enabled, ui_gradient_strength, ui_gradient_soft_strength, ui_glow_strength, ui_backdrop_blur_strength, ui_motion_speed, dashboard_layout, created_at')
    .eq('name', user.organization)
    .limit(1)
    .maybeSingle()

  return (data as AppClub | null) ?? null
}

export async function getMembersForClub(clubName: string) {
  const supabase = await createAdminClient()
  const { data } = await supabase
    .from('users')
    .select('id, first_name, last_name, email, phone, profile_picture, role, organization, created_at')
    .eq('organization', clubName)

  const members = ((data ?? []) as AppUser[]).sort((a, b) => {
    const roleDiff = (ROLE_ORDER[a.role] ?? 99) - (ROLE_ORDER[b.role] ?? 99)
    if (roleDiff !== 0) return roleDiff
    return (a.first_name ?? '').localeCompare(b.first_name ?? '', 'cs')
  })

  return members
}

export function getThemeVars(club: AppClub | null) {
  const primary = club?.primary_color || DEFAULT_COLORS.primary
  const secondary = club?.secondary_color || DEFAULT_COLORS.secondary
  const accent = club?.accent_color || DEFAULT_COLORS.accent

  const primaryLight = lightenColor(primary, 0.2)
  const primaryText = isLightColor(primary) ? '#000000' : '#FFFFFF'
  const primaryRgb = hexToRgb(primary)

  const isSecondaryLight = isLightColor(secondary)
  const bg = secondary
  const bgElevated = isSecondaryLight ? darkenColor(secondary, 0.05) : lightenColor(secondary, 0.08)
  const bgSurface = isSecondaryLight ? darkenColor(secondary, 0.1) : lightenColor(secondary, 0.15)
  const border = isSecondaryLight ? darkenColor(secondary, 0.2) : lightenColor(secondary, 0.2)
  const borderLight = isSecondaryLight ? darkenColor(secondary, 0.1) : lightenColor(secondary, 0.1)

  const textBase = isSecondaryLight
    ? (isLightColor(accent) ? darkenColor(accent, 0.8) : accent)
    : (isLightColor(accent) ? accent : lightenColor(accent, 0.8))

  const textDim = isSecondaryLight ? lightenColor(textBase, 0.3) : darkenColor(textBase, 0.3)
  const textDimmer = isSecondaryLight ? lightenColor(textBase, 0.5) : darkenColor(textBase, 0.5)

  const surface = bgElevated
  const surfaceAlt = bgSurface
  const surfaceTint = isSecondaryLight ? darkenColor(surface, 0.04) : lightenColor(surface, 0.04)
  const primaryHover = darkenColor(primary, 0.12)
  const primaryMuted = isSecondaryLight
    ? `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, 0.18)`
    : `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, 0.16)`

  const gradientEnabled = club?.ui_gradient_enabled ?? DEFAULT_EFFECTS.gradientEnabled
  const gradientStrength = normalizeEffectNumber(club?.ui_gradient_strength, DEFAULT_EFFECTS.gradientStrength, 0, 100)
  const softStrength = normalizeEffectNumber(club?.ui_gradient_soft_strength, DEFAULT_EFFECTS.softStrength, 0, 100)
  const glowStrength = normalizeEffectNumber(club?.ui_glow_strength, DEFAULT_EFFECTS.glowStrength, 0, 100)
  const blurStrength = normalizeEffectNumber(club?.ui_backdrop_blur_strength, DEFAULT_EFFECTS.blurStrength, 0, 22)
  const motionSpeed = normalizeEffectNumber(club?.ui_motion_speed, DEFAULT_EFFECTS.motionSpeed, 60, 170)

  return {
    '--color-primary': primary,
    '--color-primary-hover': primaryHover,
    '--color-primary-muted': primaryMuted,
    '--color-surface': surface,
    '--color-surface-alt': surfaceAlt,
    '--color-surface-tint': surfaceTint,
    '--color-border': border,
    '--color-text': textBase,
    '--color-text-muted': textDim,
    '--color-text-dim': textDimmer,
    '--color-success': '#10b981',
    '--color-warning': '#f59e0b',
    '--color-error': '#ef4444',
    '--color-primary-rgb': `${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}`,

    '--ui-gradient-enabled': gradientEnabled ? '1' : '0',
    '--ui-gradient-strength': String(gradientStrength),
    '--ui-gradient-soft-strength': String(softStrength),
    '--ui-glow-strength': String(glowStrength),
    '--ui-backdrop-blur-strength': String(blurStrength),
    '--ui-motion-speed': String(motionSpeed),

    // Backward-compatible aliases used in legacy classes/components.
    '--red': primary,
    '--red-dark': primaryHover,
    '--red-light': primaryLight,
    '--red-rgb': `${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}`,
    '--red-text': primaryText,
    '--bg': bg,
    '--bg-elevated': surface,
    '--bg-surface': surfaceAlt,
    '--border': border,
    '--border-light': borderLight,
    '--text': textBase,
    '--text-dim': textDim,
    '--text-dimmer': textDimmer,
  } as Record<string, string>
}
