'use client'

import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import Topbar from '@/components/Topbar'
import {
  Building2,
  Eye,
  KeyRound,
  LayoutPanelTop,
  Mail,
  Palette,
  RotateCcw,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  UserRound,
  BadgeCheck,
} from 'lucide-react'

type AppUser = {
  id: number
  first_name: string
  last_name: string
  email: string
  role: string
  organization: string | null
  profile_picture: string | null
  two_factor_enabled: boolean
}

type ThemeEffects = {
  gradientEnabled: boolean
  gradientStrength: number
  softStrength: number
  glowStrength: number
  blurStrength: number
  motionSpeed: number
}

const DEFAULT_EFFECTS: ThemeEffects = {
  gradientEnabled: true,
  gradientStrength: 58,
  softStrength: 42,
  glowStrength: 35,
  blurStrength: 8,
  motionSpeed: 100,
}

function clampRange(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function parseBooleanVar(value: string | undefined, fallback: boolean) {
  if (!value) return fallback
  return value === '1' || value === 'true'
}

function parseNumberVar(value: string | undefined, fallback: number, min: number, max: number) {
  if (!value) return fallback
  const num = Number(value)
  if (!Number.isFinite(num)) return fallback
  return clampRange(num, min, max)
}

export default function SettingsPage() {
  const [user, setUser] = useState<AppUser | null>(null)
  const [themeVars, setThemeVars] = useState<Record<string, string>>({})
  const [loadingContext, setLoadingContext] = useState(true)

  const isManager = user?.role === 'manažer'

  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [twoFA, setTwoFA] = useState(false)
  const [savingEffects, setSavingEffects] = useState(false)

  const [primaryColor, setPrimaryColor] = useState('#FF3300')
  const [secondaryColor, setSecondaryColor] = useState('#000000')
  const [accentColor, setAccentColor] = useState('#FFFFFF')
  const [effects, setEffects] = useState<ThemeEffects>(DEFAULT_EFFECTS)

  useEffect(() => {
    let mounted = true

    async function loadContext() {
      try {
        const res = await fetch('/api/app/context', { cache: 'no-store' })
        if (!res.ok) {
          window.location.href = '/login'
          return
        }

        const data = await res.json()
        if (!mounted) return

        setUser(data.user)
        setThemeVars(data.themeVars ?? {})
        setTwoFA(Boolean(data.user?.two_factor_enabled))
        setPrimaryColor(data.club?.primary_color ?? '#FF3300')
        setSecondaryColor(data.club?.secondary_color ?? '#000000')
        setAccentColor(data.club?.accent_color ?? '#FFFFFF')

        const serverThemeVars = data.themeVars ?? {}
        const fromServer: ThemeEffects = {
          gradientEnabled: parseBooleanVar(serverThemeVars['--ui-gradient-enabled'], DEFAULT_EFFECTS.gradientEnabled),
          gradientStrength: parseNumberVar(serverThemeVars['--ui-gradient-strength'], DEFAULT_EFFECTS.gradientStrength, 0, 100),
          softStrength: parseNumberVar(serverThemeVars['--ui-gradient-soft-strength'], DEFAULT_EFFECTS.softStrength, 0, 100),
          glowStrength: parseNumberVar(serverThemeVars['--ui-glow-strength'], DEFAULT_EFFECTS.glowStrength, 0, 100),
          blurStrength: parseNumberVar(serverThemeVars['--ui-backdrop-blur-strength'], DEFAULT_EFFECTS.blurStrength, 0, 22),
          motionSpeed: parseNumberVar(serverThemeVars['--ui-motion-speed'], DEFAULT_EFFECTS.motionSpeed, 60, 170),
        }
        setEffects(fromServer)
      } catch {
        if (mounted) showError('Nepodařilo se načíst nastavení.')
      } finally {
        if (mounted) setLoadingContext(false)
      }
    }

    loadContext()

    return () => {
      mounted = false
    }
  }, [])

  function showSuccess(msg: string) {
    setSuccessMsg(msg)
    setErrorMsg(null)
    setTimeout(() => setSuccessMsg(null), 4000)
  }

  function showError(msg: string) {
    setErrorMsg(msg)
    setSuccessMsg(null)
  }

  async function handleToggle2FA() {
    const next = !twoFA

    const res = await fetch('/api/settings/two-factor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: next }),
    })

    const data = await res.json()
    if (!res.ok) {
      showError(data.error ?? 'Nepodařilo se změnit 2FA.')
      return
    }

    setTwoFA(next)
    setUser((prev) => (prev ? { ...prev, two_factor_enabled: next } : prev))
    showSuccess(next ? 'Dvoufázové ověření bylo zapnuto.' : 'Dvoufázové ověření bylo vypnuto.')
  }

  async function handleSaveColors(e: React.FormEvent) {
    e.preventDefault()

    const res = await fetch('/api/settings/colors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ primaryColor, secondaryColor, accentColor }),
    })

    const data = await res.json()
    if (!res.ok) {
      showError(data.error ?? 'Nepodařilo se uložit barvy klubu.')
      return
    }

    showSuccess('Barvy klubu byly úspěšně uloženy.')
    setThemeVars(data.themeVars ?? {})
  }

  function normalizeEffects(input: ThemeEffects): ThemeEffects {
    return {
      gradientEnabled: Boolean(input.gradientEnabled),
      gradientStrength: clampRange(Number(input.gradientStrength), 0, 100),
      softStrength: clampRange(Number(input.softStrength), 0, 100),
      glowStrength: clampRange(Number(input.glowStrength), 0, 100),
      blurStrength: clampRange(Number(input.blurStrength), 0, 22),
      motionSpeed: clampRange(Number(input.motionSpeed), 60, 170),
    }
  }

  async function persistEffects(nextEffects: ThemeEffects, successMsgText?: string) {
    setSavingEffects(true)

    const payload = normalizeEffects(nextEffects)
    const res = await fetch('/api/settings/effects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ effects: payload }),
    })

    const data = await res.json()
    setSavingEffects(false)

    if (!res.ok) {
      showError(data.error ?? 'Nepodařilo se uložit efekty vzhledu.')
      return false
    }

    setEffects(payload)
    setThemeVars(data.themeVars ?? {})
    if (successMsgText) showSuccess(successMsgText)
    return true
  }

  async function handleSaveEffects() {
    await persistEffects(effects, 'Efekty Gradient Studia byly uloženy pro celý klub.')
  }

  async function handleToggleGradient() {
    const next = {
      ...effects,
      gradientEnabled: !effects.gradientEnabled,
    }

    setEffects(next)
    await persistEffects(next, next.gradientEnabled ? 'Gradient byl zapnut pro celý klub.' : 'Gradient byl vypnut pro celý klub.')
  }

  function applyDefaultPalette() {
    setPrimaryColor('#FF3300')
    setSecondaryColor('#000000')
    setAccentColor('#FFFFFF')
  }

  function applyEffectsPreset(preset: 'cinema' | 'flat' | 'soft' | 'vivid') {
    if (preset === 'cinema') {
      setEffects({ gradientEnabled: true, gradientStrength: 74, softStrength: 38, glowStrength: 48, blurStrength: 10, motionSpeed: 90 })
      return
    }
    if (preset === 'flat') {
      setEffects({ gradientEnabled: false, gradientStrength: 0, softStrength: 0, glowStrength: 0, blurStrength: 0, motionSpeed: 100 })
      return
    }
    if (preset === 'soft') {
      setEffects({ gradientEnabled: true, gradientStrength: 36, softStrength: 28, glowStrength: 20, blurStrength: 6, motionSpeed: 110 })
      return
    }

    setEffects({ gradientEnabled: true, gradientStrength: 88, softStrength: 70, glowStrength: 62, blurStrength: 12, motionSpeed: 130 })
  }

  function resetEffectsToDefault() {
    setEffects(DEFAULT_EFFECTS)
  }

  const liveThemeVars = useMemo(() => {
    return {
      ...themeVars,
      '--ui-gradient-enabled': effects.gradientEnabled ? '1' : '0',
      '--ui-gradient-strength': String(effects.gradientEnabled ? effects.gradientStrength : 0),
      '--ui-gradient-soft-strength': String(effects.gradientEnabled ? effects.softStrength : 0),
      '--ui-glow-strength': String(effects.gradientEnabled ? effects.glowStrength : 0),
      '--ui-backdrop-blur-strength': String(effects.blurStrength),
      '--ui-motion-speed': String(effects.motionSpeed),
    }
  }, [effects, themeVars])

  const previewVars = useMemo(() => {
    const g = effects.gradientEnabled ? effects.gradientStrength : 0
    const s = effects.gradientEnabled ? effects.softStrength : 0
    const glow = effects.gradientEnabled ? effects.glowStrength : 0

    return {
      '--preview-primary': primaryColor,
      '--preview-secondary': secondaryColor,
      '--preview-accent': accentColor,
      '--preview-gradient-main': `${(g / 100) * 0.24}`,
      '--preview-gradient-soft': `${(s / 100) * 0.17}`,
      '--preview-glow': `${(glow / 100) * 0.5}`,
      '--preview-blur': `${effects.blurStrength}px`,
      '--preview-motion': `${(220 / effects.motionSpeed).toFixed(3)}s`,
    } as CSSProperties
  }, [accentColor, effects, primaryColor, secondaryColor])

  const layoutUser = user ?? {
    id: 0,
    first_name: '',
    last_name: '',
    email: '',
    role: '',
    organization: null,
    profile_picture: null,
    two_factor_enabled: false,
  }

  if (loadingContext) {
    return (
      <DashboardLayout user={layoutUser} isManager={isManager} themeVars={liveThemeVars}>
        <Topbar title="Nastavení" backHref="/dashboard" backLabel="Zpět" />
        <div className="app-content">
          <div className="section settings-loading-card">
            <div className="section-content settings-loading-content">
              <div className="settings-loading-icon">
                <Sparkles size={18} />
              </div>
              <div>Načítání nastavení…</div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout user={layoutUser} isManager={isManager} themeVars={liveThemeVars}>
      <Topbar title="Nastavení" backHref="/dashboard" backLabel="Zpět" />

      <div className="app-content">
        <div className="page-intro">
          <div className="page-intro-meta">Správa účtu a klubu</div>
          <h2 className="content-title">Nastavení</h2>
          <p className="content-subtitle">Spravujte nastavení účtu a aplikace</p>
        </div>

        <div className="settings-quick-strip">
          <div className="settings-quick-item">
            <ShieldCheck size={16} />
            <span>Bezpečnost účtu</span>
          </div>
          <div className="settings-quick-item">
            <Palette size={16} />
            <span>Barvy klubu</span>
          </div>
          <div className="settings-quick-item">
            <UserRound size={16} />
            <span>Účet a profil</span>
          </div>
        </div>

        {successMsg && (
          <div className="alert alert-success">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>{successMsg}</div>
          </div>
        )}
        {errorMsg && (
          <div className="alert alert-error">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>{errorMsg}</div>
          </div>
        )}

        {/* BEZPEČNOST */}
        <div className="section">
          <div className="section-header">
            <div className="section-title-with-icon">
              <span className="section-icon-badge">
                <ShieldCheck size={16} />
              </span>
              <div>
                <h3 className="section-title">Bezpečnost</h3>
                <p className="section-description">Nastavení přihlašování a ověření</p>
              </div>
            </div>
          </div>
          <div className="section-content">
            <div className="setting-row">
              <div className="setting-label">
                <div className="setting-label-title">
                  <KeyRound size={16} />
                  Dvoufázové ověření
                </div>
                <div className="setting-label-desc">
                  {twoFA ? 'Zapnuto – přihlášení vyžaduje zadání kódu z e-mailu' : 'Vypnuto – doporučujeme zapnout pro větší bezpečnost'}
                </div>
              </div>
              <button
                onClick={handleToggle2FA}
                className={`btn toggle-btn ${twoFA ? 'btn-secondary' : 'btn-primary'}`}
              >
                <ShieldCheck size={16} />
                {twoFA ? 'Vypnout' : 'Zapnout'}
              </button>
            </div>
          </div>
        </div>

        {/* BARVY KLUBU - jen pro manažery */}
        {isManager && (
          <div className="section">
            <div className="section-header">
              <div className="section-title-with-icon">
                <span className="section-icon-badge">
                  <Palette size={16} />
                </span>
                <div>
                  <h3 className="section-title">Barevné schéma</h3>
                  <p className="section-description">Vytvořte profesionální vzhled aplikace podle identity vašeho klubu</p>
                </div>
              </div>
            </div>
            <div className="section-content">
              <form onSubmit={handleSaveColors} className="theme-editor-form">
                <div className="theme-editor-top">
                  <p className="theme-editor-note">
                    <Sparkles size={15} />
                    Teď upravujete reálný vizuální engine aplikace, včetně gradientů, glow efektu i bluru panelů.
                  </p>
                  <div className="theme-editor-top-actions">
                    <button type="button" className="btn btn-secondary" onClick={applyDefaultPalette}>
                      <RotateCcw size={16} />
                      Výchozí barvy
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={resetEffectsToDefault}>
                      <RotateCcw size={16} />
                      Výchozí efekty
                    </button>
                  </div>
                </div>

                <div className="theme-color-grid">
                  <div className="theme-color-card">
                    <div className="theme-color-header">
                      <span className="theme-color-dot" style={{ background: primaryColor }} />
                      <div>
                        <label className="form-label">
                          <Palette size={14} />
                          Primární
                        </label>
                        <p className="theme-color-hint">Tlačítka, aktivní prvky, akcenty</p>
                      </div>
                    </div>
                    <div className="color-picker-group">
                      <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} />
                      <input
                        type="text"
                        className="form-input"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        placeholder="#FF3300"
                      />
                    </div>
                  </div>

                  <div className="theme-color-card">
                    <div className="theme-color-header">
                      <span className="theme-color-dot" style={{ background: secondaryColor }} />
                      <div>
                        <label className="form-label">
                          <Building2 size={14} />
                          Sekundární
                        </label>
                        <p className="theme-color-hint">Hlavní pozadí aplikace</p>
                      </div>
                    </div>
                    <div className="color-picker-group">
                      <input type="color" value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} />
                      <input
                        type="text"
                        className="form-input"
                        value={secondaryColor}
                        onChange={(e) => setSecondaryColor(e.target.value)}
                        placeholder="#000000"
                      />
                    </div>
                  </div>

                  <div className="theme-color-card">
                    <div className="theme-color-header">
                      <span className="theme-color-dot" style={{ background: accentColor }} />
                      <div>
                        <label className="form-label">
                          <Sparkles size={14} />
                          Doplňková
                        </label>
                        <p className="theme-color-hint">Text a kontrastní obsah</p>
                      </div>
                    </div>
                    <div className="color-picker-group">
                      <input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} />
                      <input
                        type="text"
                        className="form-input"
                        value={accentColor}
                        onChange={(e) => setAccentColor(e.target.value)}
                        placeholder="#FFFFFF"
                      />
                    </div>
                  </div>
                </div>

                <div className="theme-preview-modern" style={{ background: secondaryColor, color: accentColor }}>
                  <div className="theme-preview-bar" style={{ borderColor: `${accentColor}22` }}>
                    <div className="theme-preview-brand">TeamPulse</div>
                    <button type="button" className="theme-preview-cta" style={{ background: primaryColor, color: accentColor }}>
                      <Save size={14} />
                      Primární akce
                    </button>
                  </div>
                  <div className="theme-preview-content">
                    <div className="theme-preview-stat" style={{ borderColor: `${primaryColor}55` }}>
                      <div className="theme-preview-stat-label">AKTIVNÍ ČLENOVÉ</div>
                      <div className="theme-preview-stat-value" style={{ color: primaryColor }}>24</div>
                    </div>
                    <div className="theme-preview-user" style={{ borderColor: `${accentColor}22` }}>
                      <div className="theme-preview-avatar" style={{ background: primaryColor, color: accentColor }}>AB</div>
                      <div>
                        <div className="theme-preview-user-name">Anna Berková</div>
                        <div className="theme-preview-user-role">Manažerka klubu</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="theme-editor-actions">
                  <button type="submit" className="btn btn-primary">Uložit změny</button>
                </div>
              </form>
                <div className="theme-effects-studio">
                  <div className="theme-effects-head">
                    <div>
                      <h4>
                        <SlidersHorizontal size={16} />
                        Gradient Studio
                      </h4>
                      <p>Efekty se mění živě v celé aplikaci. Uložení je sdílené pro celý klub.</p>
                    </div>
                    <div className="theme-editor-top-actions">
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={handleSaveEffects}
                        disabled={savingEffects}
                      >
                        {savingEffects ? 'Ukládám...' : 'Uložit efekty'}
                      </button>
                      <button
                        type="button"
                        className={`btn ${effects.gradientEnabled ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={handleToggleGradient}
                        disabled={savingEffects}
                      >
                        {effects.gradientEnabled ? 'Gradient zapnutý' : 'Gradient vypnutý'}
                      </button>
                    </div>
                  </div>

                  <div className="theme-presets-row">
                    <button type="button" className="theme-preset-chip" onClick={() => applyEffectsPreset('cinema')}>Cinematic</button>
                    <button type="button" className="theme-preset-chip" onClick={() => applyEffectsPreset('soft')}>Soft UI</button>
                    <button type="button" className="theme-preset-chip" onClick={() => applyEffectsPreset('vivid')}>Vivid Neon</button>
                    <button type="button" className="theme-preset-chip" onClick={() => applyEffectsPreset('flat')}>Flat Clean</button>
                  </div>

                  <div className="theme-effects-grid">
                    <label className="theme-range-control">
                      <span>Intenzita hlavního gradientu</span>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={effects.gradientStrength}
                        onChange={(e) => setEffects((prev) => ({ ...prev, gradientStrength: Number(e.target.value) }))}
                      />
                      <strong>{effects.gradientStrength}%</strong>
                    </label>

                    <label className="theme-range-control">
                      <span>Jemná vrstva (soft gradient)</span>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={effects.softStrength}
                        onChange={(e) => setEffects((prev) => ({ ...prev, softStrength: Number(e.target.value) }))}
                      />
                      <strong>{effects.softStrength}%</strong>
                    </label>

                    <label className="theme-range-control">
                      <span>Glow síla panelů</span>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={effects.glowStrength}
                        onChange={(e) => setEffects((prev) => ({ ...prev, glowStrength: Number(e.target.value) }))}
                      />
                      <strong>{effects.glowStrength}%</strong>
                    </label>

                    <label className="theme-range-control">
                      <span>Rozostření skla (blur)</span>
                      <input
                        type="range"
                        min={0}
                        max={22}
                        value={effects.blurStrength}
                        onChange={(e) => setEffects((prev) => ({ ...prev, blurStrength: Number(e.target.value) }))}
                      />
                      <strong>{effects.blurStrength}px</strong>
                    </label>

                    <label className="theme-range-control">
                      <span>Rychlost animací UI</span>
                      <input
                        type="range"
                        min={60}
                        max={170}
                        value={effects.motionSpeed}
                        onChange={(e) => setEffects((prev) => ({ ...prev, motionSpeed: Number(e.target.value) }))}
                      />
                      <strong>{effects.motionSpeed}%</strong>
                    </label>
                  </div>

                  <div className="theme-preview-v2" style={previewVars}>
                    <div className="theme-preview-v2-topbar">
                      <div className="theme-preview-v2-brand">
                        <LayoutPanelTop size={14} /> TeamPulse
                      </div>
                      <div className="theme-preview-v2-pill-wrap">
                        <span className="theme-preview-v2-pill">RUGBY</span>
                        <span className="theme-preview-v2-pill">ZLIN</span>
                      </div>
                    </div>

                    <div className="theme-preview-v2-hero">
                      <h4>Vítejte zpět, Tomas. RC Zlín je připravený na další růst.</h4>
                      <p>Přehled výkonu, složení týmu a klíčových metrik na jednom místě. Dashboard je optimalizovaný pro rychlé rozhodování vedení moderního klubu.</p>
                      <div className="theme-preview-v2-hero-actions">
                        <button type="button">Pozvat nového člena</button>
                        <button type="button">Otevřít správu členů</button>
                        <button type="button">Týdenní report</button>
                      </div>
                    </div>

                    <div className="theme-preview-v2-grid">
                      <div className="theme-preview-v2-card theme-preview-v2-stats">
                        <div>
                          <span>AKTIVNÍ ČLENOVÉ</span>
                          <strong>24</strong>
                        </div>
                        <div>
                          <span>ZPRÁVY DNES</span>
                          <strong>18</strong>
                        </div>
                        <div>
                          <span>VYTÍŽENOST</span>
                          <strong>92%</strong>
                        </div>
                      </div>

                      <div className="theme-preview-v2-card theme-preview-v2-feed">
                        <div className="theme-preview-v2-feed-item">
                          <div className="theme-preview-v2-dot" />
                          <div>
                            <strong>Anna Berková</strong>
                            <small>Publikovala týdenní plán tréninků.</small>
                          </div>
                        </div>
                        <div className="theme-preview-v2-feed-item">
                          <div className="theme-preview-v2-dot" />
                          <div>
                            <strong>Petr Novák</strong>
                            <small>Potvrdil účast na zápase v pátek.</small>
                          </div>
                        </div>
                        <div className="theme-preview-v2-feed-item">
                          <div className="theme-preview-v2-dot" />
                          <div>
                            <strong>System</strong>
                            <small>Připomínka: vyprší členství 3 hráčům.</small>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="theme-preview-v2-footnote">
                      <Eye size={14} />
                      Náhled používá stejné proměnné jako aplikace: barvy, gradient sílu, glow, blur i tempo animací.
                    </div>
                  </div>
                </div>
              </div>
          </div>
        )}

        <div className="section">
          <div className="section-header">
            <div className="section-title-with-icon">
              <span className="section-icon-badge">
                <UserRound size={16} />
              </span>
              <div>
                <h3 className="section-title">Účet</h3>
                <p className="section-description">Přehled vašich základních údajů</p>
              </div>
            </div>
          </div>
          <div className="section-content">
            <div className="account-info-grid">
              <div className="account-info-item">
                <span className="data-label"><Mail size={14} /> E-mailová adresa</span>
                <span className="data-value">{user?.email ?? '–'}</span>
              </div>
              <div className="account-info-item">
                <span className="data-label"><BadgeCheck size={14} /> Role v klubu</span>
                <span className="data-value">{user?.role ?? '–'}</span>
              </div>
              <div className="account-info-item">
                <span className="data-label"><Building2 size={14} /> Váš klub</span>
                <span className="data-value">{user?.organization ?? '–'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
