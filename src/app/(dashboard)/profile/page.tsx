'use client'

import { useEffect, useRef, useState } from 'react'
import Cropper from 'cropperjs'
import DashboardLayout from '@/components/DashboardLayout'
import Topbar from '@/components/Topbar'
import Link from 'next/link'

type AppUser = {
  id: number
  first_name: string
  last_name: string
  email: string
  phone: string | null
  role: string
  organization: string | null
  profile_picture: string | null
}

export default function ProfilePage() {
  const [user, setUser] = useState<AppUser | null>(null)
  const [clubName, setClubName] = useState<string>('Bez klubu')
  const [clubLogo, setClubLogo] = useState<string | null>(null)
  const [themeVars, setThemeVars] = useState<Record<string, string>>({})
  const [loadingContext, setLoadingContext] = useState(true)

  const isManager = user?.role === 'manažer'
  const initials =
    (user?.first_name?.[0] ?? '').toUpperCase() +
    (user?.last_name?.[0] ?? '').toUpperCase()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [showCropModal, setShowCropModal] = useState(false)
  const [uploadingPicture, setUploadingPicture] = useState(false)
  const [cropImageSrc, setCropImageSrc] = useState<string>('')
  const [isUploadingCrop, setIsUploadingCrop] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const cropperRef = useRef<Cropper | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const objectUrlRef = useRef<string | null>(null)

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
        setClubName(data.club?.name ?? data.user.organization ?? 'Bez klubu')
        setClubLogo(data.club?.logo ?? null)
        setThemeVars(data.themeVars ?? {})
        setFirstName(data.user.first_name ?? '')
        setLastName(data.user.last_name ?? '')
        setPhone(data.user.phone ?? '')
      } catch {
        if (mounted) setErrorMsg('Nepodařilo se načíst profil.')
      } finally {
        if (mounted) setLoadingContext(false)
      }
    }

    loadContext()

    return () => {
      mounted = false
    }
  }, [])

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault()
    setSuccessMsg(null)
    setErrorMsg(null)
    if (!firstName || !lastName) {
      setErrorMsg('Jméno a příjmení jsou povinné.')
      return
    }

    const res = await fetch('/api/profile/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstName, lastName, phone }),
    })

    const data = await res.json()
    if (!res.ok) {
      setErrorMsg(data.error ?? 'Nepodařilo se uložit profil.')
      return
    }

    setUser((prev) =>
      prev
        ? { ...prev, first_name: firstName.trim(), last_name: lastName.trim(), phone: phone.trim() }
        : prev
    )
    setSuccessMsg('Profil byl úspěšně aktualizován.')
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    const form = e.currentTarget as HTMLFormElement
    const next = (form.elements.namedItem('new_password') as HTMLInputElement).value
    const confirm = (form.elements.namedItem('confirm_password') as HTMLInputElement).value

    setSuccessMsg(null)
    setErrorMsg(null)

    if (next.length < 6) { setErrorMsg('Nové heslo musí mít alespoň 6 znaků.'); return }
    if (next !== confirm) { setErrorMsg('Nová hesla se neshodují.'); return }
    // TODO: API call
    setSuccessMsg('Heslo bylo úspěšně změněno.')
    form.reset()
  }

  useEffect(() => {
    if (!showCropModal || !cropImageSrc || !imageRef.current) return

    const cropper = new Cropper(imageRef.current, {
      aspectRatio: 1,
      viewMode: 1,
      dragMode: 'move',
      autoCropArea: 0.8,
      restore: false,
      guides: true,
      center: true,
      highlight: false,
      cropBoxMovable: true,
      cropBoxResizable: true,
      toggleDragModeOnDblclick: false,
      responsive: true,
      background: true,
      minContainerWidth: 200,
      minContainerHeight: 200,
      ready() {
        setZoom(1)
        setRotation(0)
      },
    })

    cropperRef.current = cropper

    return () => {
      cropperRef.current?.destroy()
      cropperRef.current = null
    }
  }, [showCropModal, cropImageSrc])

  function closeCropModal() {
    if (isUploadingCrop) return
    cropperRef.current?.destroy()
    cropperRef.current = null
    setShowCropModal(false)
    setCropImageSrc('')
    setZoom(1)
    setRotation(0)

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  function onProfileFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!validTypes.includes(file.type.toLowerCase())) {
      setErrorMsg('Povolené jsou pouze obrázky (JPG, PNG, GIF, WEBP).')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Soubor je příliš velký (max 5MB).')
      return
    }

    setErrorMsg(null)
    setSuccessMsg(null)
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
    }
    const objectUrl = URL.createObjectURL(file)
    objectUrlRef.current = objectUrl
    setCropImageSrc(objectUrl)
    setShowCropModal(true)
  }

  async function uploadCroppedProfilePicture() {
    if (!cropperRef.current || !user || isUploadingCrop) return

    setIsUploadingCrop(true)
    setUploadingPicture(true)
    setErrorMsg(null)

    try {
      const canvas = cropperRef.current.getCroppedCanvas({
        width: 500,
        height: 500,
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high',
      })

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/jpeg', 0.9)
      })

      if (!blob) {
        throw new Error('Nepodařilo se připravit obrázek pro upload.')
      }

      const formData = new FormData()
      formData.append('profile_picture', blob, `user_${user.id}.jpg`)

      const res = await fetch('/api/profile/upload-picture', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error ?? 'Nahrávání selhalo.')
      }

      setUser((prev) => (prev ? { ...prev, profile_picture: data.fileName } : prev))
      setSuccessMsg('Profilový obrázek byl úspěšně nahrán.')
      closeCropModal()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Neznámá chyba'
      setErrorMsg(`Chyba při nahrávání: ${message}`)
    } finally {
      setIsUploadingCrop(false)
      setUploadingPicture(false)
    }
  }

  function handleCropAction(action: string) {
    const cropper = cropperRef.current
    if (!cropper) return

    switch (action) {
      case 'zoom-in':
        setZoom((prev) => {
          const next = Math.min(3, Number((prev + 0.1).toFixed(1)))
          cropper.zoomTo(next)
          return next
        })
        break
      case 'zoom-out':
        setZoom((prev) => {
          const next = Math.max(0.2, Number((prev - 0.1).toFixed(1)))
          cropper.zoomTo(next)
          return next
        })
        break
      case 'rotate-left':
        setRotation((prev) => {
          const next = prev - 90
          cropper.rotateTo(next)
          return next
        })
        break
      case 'rotate-right':
        setRotation((prev) => {
          const next = prev + 90
          cropper.rotateTo(next)
          return next
        })
        break
      case 'flip-horizontal': {
        const imageData = cropper.getImageData()
        cropper.scaleX(-(imageData.scaleX || 1))
        break
      }
      case 'flip-vertical': {
        const imageData = cropper.getImageData()
        cropper.scaleY(-(imageData.scaleY || 1))
        break
      }
      case 'reset':
        cropper.reset()
        setZoom(1)
        setRotation(0)
        break
      default:
        break
    }
  }

  const layoutUser = user ?? {
    id: 0,
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    role: '',
    organization: null,
    profile_picture: null,
  }

  return (
    <DashboardLayout user={layoutUser} isManager={isManager} themeVars={themeVars}>
      <Topbar title="Profil" backHref="/dashboard" backLabel="Zpět" />

      <div className="app-content">
        {loadingContext && (
          <div className="section" style={{ marginBottom: 16 }}>
            <div className="section-content">Načítání profilu…</div>
          </div>
        )}

        <div className="page-intro">
          <div className="page-intro-meta">Můj účet</div>
          <h2 className="content-title">Váš profil</h2>
          <p className="content-subtitle">Spravujte své osobní údaje a nastavení</p>
        </div>

        <div className="profile-mobile-hub">
          <div className="profile-mobile-hub-top">
            <div className="profile-mobile-hub-banner">
              <div className="profile-mobile-hub-banner-noise" aria-hidden="true" />
            </div>

            <div className="profile-mobile-hub-avatar-wrap">
              {layoutUser.profile_picture ? (
                <img src={`/uploads/profiles/${layoutUser.profile_picture}`} alt="Profil" className="profile-mobile-hub-avatar" />
              ) : (
                <div className="profile-mobile-hub-avatar-fallback">{initials || 'U'}</div>
              )}

              <button
                type="button"
                className="profile-mobile-hub-avatar-edit"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPicture}
                aria-label="Upravit profilový obrázek"
                title="Upravit profilový obrázek"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 20h9" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4 12.5-12.5z" />
                </svg>
              </button>
            </div>

            <div className="profile-mobile-hub-info">
              <div className="profile-mobile-hub-name">{layoutUser.first_name} {layoutUser.last_name}</div>
              <div className="profile-mobile-hub-meta">{layoutUser.role} • {clubName}</div>
            </div>
          </div>

          <div className="profile-mobile-shortcuts">
            <Link href="/dashboard" className="profile-mobile-shortcut-item">
              <span>Přehled klubu</span>
              <span aria-hidden="true">›</span>
            </Link>
            <Link href="/members" className="profile-mobile-shortcut-item">
              <span>Členové</span>
              <span aria-hidden="true">›</span>
            </Link>
            <Link href="/chat" className="profile-mobile-shortcut-item">
              <span>Klubová zeď</span>
              <span aria-hidden="true">›</span>
            </Link>
            <Link href="/notifications" className="profile-mobile-shortcut-item">
              <span>Inbox</span>
              <span aria-hidden="true">›</span>
            </Link>
            <Link href="/settings" className="profile-mobile-shortcut-item">
              <span>Nastavení aplikace</span>
              <span aria-hidden="true">›</span>
            </Link>
            {isManager && (
              <Link href="/invite" className="profile-mobile-shortcut-item">
                <span>Pozvat členy</span>
                <span aria-hidden="true">›</span>
              </Link>
            )}
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

        <section className="section profile-discord-card">
          <div className="profile-discord-banner">
            <div className="profile-discord-banner-noise" aria-hidden="true" />
            <div className="profile-discord-club-logo-wrap">
              {clubLogo ? (
                <img src={`/uploads/clubs/${clubLogo}`} alt={`Logo klubu ${clubName}`} className="profile-discord-club-logo" />
              ) : (
                <img src="/tp-logo.png" alt="TeamPulse" className="profile-discord-club-logo profile-discord-club-logo-fallback" />
              )}
            </div>
          </div>

          <div className="profile-discord-body">
            <div className="profile-discord-layout">
              <div className="profile-discord-left">
                <div className="profile-discord-avatar-wrap">
                  {layoutUser.profile_picture ? (
                    <img src={`/uploads/profiles/${layoutUser.profile_picture}`} alt="Profil" className="profile-discord-avatar" />
                  ) : (
                    <div className="profile-discord-avatar-fallback">{initials || 'U'}</div>
                  )}
                  <button
                    type="button"
                    className="profile-discord-avatar-edit"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingPicture}
                    aria-label="Upravit profilový obrázek"
                    title="Upravit profilový obrázek"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 20h9" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4 12.5-12.5z" />
                    </svg>
                  </button>
                </div>

                <div className="profile-discord-identity">
                  <div className="profile-discord-role">{layoutUser.role || 'Uživatel'}</div>
                  <h3 className="profile-discord-name">{layoutUser.first_name} {layoutUser.last_name}</h3>
                  <p className="profile-discord-club">{clubName}</p>
                </div>

                <div className="profile-discord-upload-row">
                  <input
                    type="file"
                    id="profilePictureInput"
                    ref={fileInputRef}
                    accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                    onChange={onProfileFileChange}
                    disabled={uploadingPicture}
                    style={{ display: 'none' }}
                  />
                  <button
                    type="button"
                    className="btn"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingPicture}
                  >
                    {uploadingPicture ? 'Nahrávám…' : 'Změnit profilovku'}
                  </button>
                  <div className="file-info">Max 5MB · JPG, PNG, GIF, WEBP</div>
                </div>
              </div>

              <div className="profile-discord-right">
                <div className="profile-discord-params-title">Parametry účtu</div>
                <div className="profile-discord-meta-grid">
                  <div className="profile-discord-meta-item">
                    <span>Stav účtu</span>
                    <strong>Aktivní</strong>
                  </div>
                  <div className="profile-discord-meta-item">
                    <span>Klub</span>
                    <strong>{clubName}</strong>
                  </div>
                  <div className="profile-discord-meta-item">
                    <span>E-mail</span>
                    <strong>{layoutUser.email}</strong>
                  </div>
                  <div className="profile-discord-meta-item">
                    <span>Telefon</span>
                    <strong>{layoutUser.phone || 'Nezadáno'}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="profile-desktop-layout profile-desktop-layout-single">
          <div className="profile-desktop-main">
            <div className="profile-main-grid profile-main-grid-wide">
              <div className="section profile-details-card">
                <div className="section-header">
                  <h3 className="section-title">Osobní údaje</h3>
                  <p className="section-description">Aktualizujte své základní informace</p>
                </div>
                <div className="section-content">
                  <form onSubmit={handleUpdateProfile} className="profile-details-form">
                    <div className="profile-form-row">
                      <div className="form-group profile-form-group-shell">
                        <label htmlFor="first_name" className="form-label">Jméno *</label>
                        <input
                          type="text"
                          id="first_name"
                          className="form-input"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          required
                        />
                      </div>
                      <div className="form-group profile-form-group-shell">
                        <label htmlFor="last_name" className="form-label">Příjmení *</label>
                        <input
                          type="text"
                          id="last_name"
                          className="form-input"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="profile-form-row">
                      <div className="form-group profile-form-group-shell profile-form-group-readonly">
                        <label className="form-label">E-mail</label>
                        <input
                          type="email"
                          className="form-input"
                          value={layoutUser.email}
                          disabled
                        />
                        <p className="form-help">E-mail nelze změnit</p>
                      </div>
                      <div className="form-group profile-form-group-shell">
                        <label htmlFor="phone" className="form-label">Telefon</label>
                        <input
                          type="tel"
                          id="phone"
                          className="form-input"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+420 777 123 456"
                        />
                      </div>
                    </div>

                    <div className="profile-form-actions">
                      <button type="submit" className="btn btn-primary">
                        Uložit změny
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              <div className="section profile-security-card">
                <div className="section-header">
                  <h3 className="section-title">Změna hesla</h3>
                  <p className="section-description">Aktualizujte své přihlašovací heslo</p>
                </div>
                <div className="section-content">
                  <form onSubmit={handleChangePassword} className="profile-security-form">
                    <div className="form-group profile-form-group-shell">
                      <label htmlFor="current_password" className="form-label">Současné heslo *</label>
                      <input type="password" id="current_password" name="current_password" className="form-input" required />
                    </div>
                    <div className="form-group profile-form-group-shell">
                      <label htmlFor="new_password" className="form-label">Nové heslo *</label>
                      <input
                        type="password"
                        id="new_password"
                        name="new_password"
                        className="form-input"
                        minLength={6}
                        required
                      />
                    </div>
                    <div className="form-group profile-form-group-shell">
                      <label htmlFor="confirm_password" className="form-label">Potvrdit nové heslo *</label>
                      <input type="password" id="confirm_password" name="confirm_password" className="form-input" required />
                    </div>

                    <div className="profile-password-hint">
                      Použijte alespoň 6 znaků, ideálně kombinaci písmen, číslic a speciálních znaků.
                    </div>

                    <div className="profile-form-actions">
                      <button type="submit" className="btn btn-primary">
                        Změnit heslo
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showCropModal && (
        <div className={`crop-modal ${showCropModal ? 'active' : ''}`} onClick={(e) => e.target === e.currentTarget && closeCropModal()}>
          <div className="crop-modal-content">
            <div className="crop-modal-header">
              <h3 className="crop-modal-title">Upravit obrázek</h3>
              <button className="crop-modal-close" type="button" aria-label="Zavřít" onClick={closeCropModal}>
                &times;
              </button>
            </div>

            <div className="crop-modal-body">
              <div className="crop-container">
                <img ref={imageRef} src={cropImageSrc} alt="Náhled" />
              </div>

              <div className="crop-controls">
                <button type="button" className="crop-btn" onClick={() => handleCropAction('zoom-in')} title="Přiblížit">+</button>
                <button type="button" className="crop-btn" onClick={() => handleCropAction('zoom-out')} title="Oddálit">-</button>
                <button type="button" className="crop-btn" onClick={() => handleCropAction('rotate-left')} title="Otočit vlevo">↺</button>
                <button type="button" className="crop-btn" onClick={() => handleCropAction('rotate-right')} title="Otočit vpravo">↻</button>
                <button type="button" className="crop-btn" onClick={() => handleCropAction('flip-horizontal')} title="Překlopit">⇋</button>
                <button type="button" className="crop-btn" onClick={() => handleCropAction('flip-vertical')} title="Překlopit svisle">⇅</button>
                <button type="button" className="crop-btn" onClick={() => handleCropAction('reset')} title="Reset">⟲</button>
              </div>

              <div style={{ display: 'grid', gap: 10, marginTop: 10 }}>
                <label style={{ display: 'grid', gap: 6, color: 'var(--text)', fontSize: 13 }}>
                  Přiblížení: {zoom.toFixed(1)}x
                  <input
                    type="range"
                    min={0.2}
                    max={3}
                    step={0.1}
                    value={zoom}
                    onChange={(e) => {
                      const cropper = cropperRef.current
                      if (!cropper) return
                      const next = Number(e.target.value)
                      setZoom(next)
                      cropper.zoomTo(next)
                    }}
                  />
                </label>
                <label style={{ display: 'grid', gap: 6, color: 'var(--text)', fontSize: 13 }}>
                  Rotace: {rotation}°
                  <input
                    type="range"
                    min={-180}
                    max={180}
                    step={1}
                    value={rotation}
                    onChange={(e) => {
                      const cropper = cropperRef.current
                      if (!cropper) return
                      const next = Number(e.target.value)
                      setRotation(next)
                      cropper.rotateTo(next)
                    }}
                  />
                </label>
              </div>
            </div>

            <div className="crop-modal-footer">
              <button type="button" className="btn-cancel" onClick={closeCropModal}>
                Zrušit
              </button>
              <button type="button" className="btn-save" onClick={uploadCroppedProfilePicture} disabled={isUploadingCrop}>
                {isUploadingCrop ? 'Nahrávám...' : 'Nahrát'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
