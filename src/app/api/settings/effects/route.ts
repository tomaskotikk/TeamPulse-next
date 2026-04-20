import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getClubForUser, getCurrentAppUser, getThemeVars } from '@/lib/app-context'

type ThemeEffectsPayload = {
  gradientEnabled: boolean
  gradientStrength: number
  softStrength: number
  glowStrength: number
  blurStrength: number
  motionSpeed: number
}

function clampRange(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function normalizeEffects(raw: unknown): ThemeEffectsPayload | null {
  if (!raw || typeof raw !== 'object') return null

  const payload = raw as Partial<ThemeEffectsPayload>

  if (typeof payload.gradientEnabled !== 'boolean') return null

  const gradientStrength = clampRange(Number(payload.gradientStrength), 0, 100)
  const softStrength = clampRange(Number(payload.softStrength), 0, 100)
  const glowStrength = clampRange(Number(payload.glowStrength), 0, 100)
  const blurStrength = clampRange(Number(payload.blurStrength), 0, 22)
  const motionSpeed = clampRange(Number(payload.motionSpeed), 60, 170)

  if (![gradientStrength, softStrength, glowStrength, blurStrength, motionSpeed].every((value) => Number.isFinite(value))) {
    return null
  }

  return {
    gradientEnabled: payload.gradientEnabled,
    gradientStrength,
    softStrength,
    glowStrength,
    blurStrength,
    motionSpeed,
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentAppUser()
    if (!user) return NextResponse.json({ error: 'Neautorizováno.' }, { status: 401 })
    if (user.role !== 'manažer') {
      return NextResponse.json({ error: 'Pouze manažer může měnit efekty vzhledu.' }, { status: 403 })
    }

    const payload = await request.json().catch(() => ({}))
    const effects = normalizeEffects(payload.effects)
    if (!effects) {
      return NextResponse.json({ error: 'Neplatný formát efektů vzhledu.' }, { status: 400 })
    }

    const club = await getClubForUser(user)
    if (!club) return NextResponse.json({ error: 'Klub nebyl nalezen.' }, { status: 404 })

    const supabase = await createAdminClient()
    const { error } = await supabase
      .from('clubs')
      .update({
        ui_gradient_enabled: effects.gradientEnabled,
        ui_gradient_strength: effects.gradientStrength,
        ui_gradient_soft_strength: effects.softStrength,
        ui_glow_strength: effects.glowStrength,
        ui_backdrop_blur_strength: effects.blurStrength,
        ui_motion_speed: effects.motionSpeed,
      })
      .eq('id', club.id)

    if (error) {
      return NextResponse.json({ error: 'Nepodařilo se uložit efekty vzhledu.' }, { status: 500 })
    }

    const themeVars = getThemeVars({
      ...club,
      ui_gradient_enabled: effects.gradientEnabled,
      ui_gradient_strength: effects.gradientStrength,
      ui_gradient_soft_strength: effects.softStrength,
      ui_glow_strength: effects.glowStrength,
      ui_backdrop_blur_strength: effects.blurStrength,
      ui_motion_speed: effects.motionSpeed,
    })

    return NextResponse.json({ success: true, effects, themeVars })
  } catch (err) {
    console.error('Theme effects settings error:', err)
    return NextResponse.json({ error: 'Nastala chyba serveru.' }, { status: 500 })
  }
}
