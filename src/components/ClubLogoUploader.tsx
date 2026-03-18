'use client'

import { useEffect, useRef, useState } from 'react'
import Cropper from 'cropperjs'

type ClubLogoUploaderProps = {
  initialLogo: string | null
  isManager: boolean
}

export default function ClubLogoUploader({ initialLogo, isManager }: ClubLogoUploaderProps) {
  const [logoFileName, setLogoFileName] = useState<string | null>(initialLogo)
  const [showCropModal, setShowCropModal] = useState(false)
  const [cropImageSrc, setCropImageSrc] = useState('')
  const [uploading, setUploading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)

  const imageRef = useRef<HTMLImageElement | null>(null)
  const cropperRef = useRef<Cropper | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const objectUrlRef = useRef<string | null>(null)

  useEffect(() => {
    if (!showCropModal || !cropImageSrc || !imageRef.current) return

    const cropper = new Cropper(imageRef.current, {
      aspectRatio: 1,
      viewMode: 1,
      dragMode: 'move',
      autoCropArea: 0.9,
      restore: false,
      guides: true,
      center: true,
      highlight: true,
      cropBoxMovable: true,
      cropBoxResizable: true,
      toggleDragModeOnDblclick: false,
      responsive: true,
      background: true,
      minContainerWidth: 220,
      minContainerHeight: 220,
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

  function resetModalState() {
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

  function closeCropModal() {
    if (uploading) return
    resetModalState()
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
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

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
    }

    setErrorMsg(null)
    setSuccessMsg(null)

    const objectUrl = URL.createObjectURL(file)
    objectUrlRef.current = objectUrl
    setCropImageSrc(objectUrl)
    setShowCropModal(true)
  }

  function setZoomLevel(nextZoom: number) {
    const cropper = cropperRef.current
    if (!cropper) return

    setZoom(nextZoom)
    cropper.zoomTo(nextZoom)
  }

  function setRotationDeg(nextRotation: number) {
    const cropper = cropperRef.current
    if (!cropper) return

    setRotation(nextRotation)
    cropper.rotateTo(nextRotation)
  }

  function flipHorizontal() {
    const cropper = cropperRef.current
    if (!cropper) return

    const imageData = cropper.getImageData()
    cropper.scaleX(-(imageData.scaleX || 1))
  }

  function flipVertical() {
    const cropper = cropperRef.current
    if (!cropper) return

    const imageData = cropper.getImageData()
    cropper.scaleY(-(imageData.scaleY || 1))
  }

  function resetAdjustments() {
    const cropper = cropperRef.current
    if (!cropper) return

    cropper.reset()
    setZoom(1)
    setRotation(0)
  }

  async function uploadCroppedLogo() {
    const cropper = cropperRef.current
    if (!cropper || uploading) return

    setUploading(true)
    setErrorMsg(null)

    try {
      const canvas = cropper.getCroppedCanvas({
        width: 700,
        height: 700,
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high',
      })

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/jpeg', 0.9)
      })

      if (!blob) {
        throw new Error('Nepodařilo se připravit logo pro upload.')
      }

      const formData = new FormData()
      formData.append('club_logo', blob, `club_logo_${Date.now()}.jpg`)

      const res = await fetch('/api/club/upload-logo', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error ?? 'Nahrávání loga selhalo.')
      }

      setLogoFileName(data.fileName)
      setSuccessMsg('Logo klubu bylo úspěšně aktualizováno.')
      resetModalState()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Neznámá chyba'
      setErrorMsg(`Chyba při nahrávání loga: ${message}`)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="profile-picture-section">
      <div className="profile-picture-preview">
        {logoFileName ? (
          <img src={`/uploads/clubs/${logoFileName}`} alt="Logo klubu" />
        ) : (
          <div className="profile-picture-placeholder">
            <svg style={{ width: 60, height: 60 }} viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
        )}
      </div>

      {isManager && (
        <div className="profile-picture-upload">
          <div className="file-input-wrapper">
            <input
              type="file"
              id="clubLogoInput"
              ref={fileInputRef}
              accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
              onChange={onFileChange}
              disabled={uploading}
            />
            <label htmlFor="clubLogoInput" className="file-input-label">
              <svg style={{ width: 16, height: 16 }} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {uploading ? 'Nahrávám…' : 'Vybrat logo'}
            </label>
          </div>
          <div className="file-info">Max 5MB · JPG, PNG, GIF, WEBP</div>
          <div className="file-info">Tažením obrázek posuňte. Rámeček lze měnit i otáčet.</div>
          {successMsg && <div className="alert alert-success" style={{ marginTop: 10 }}>{successMsg}</div>}
          {errorMsg && <div className="alert alert-error" style={{ marginTop: 10 }}>{errorMsg}</div>}
        </div>
      )}

      {showCropModal && (
        <div className="crop-modal active" onClick={(e) => e.target === e.currentTarget && closeCropModal()}>
          <div className="crop-modal-content">
            <div className="crop-modal-header">
              <h3 className="crop-modal-title">Upravit logo klubu</h3>
              <button className="crop-modal-close" type="button" aria-label="Zavřít" onClick={closeCropModal}>
                &times;
              </button>
            </div>

            <div className="crop-modal-body">
              <div className="crop-container">
                <img ref={imageRef} src={cropImageSrc} alt="Náhled loga" />
              </div>

              <div className="crop-controls" style={{ marginBottom: 10 }}>
                <button type="button" className="crop-btn" onClick={() => setZoomLevel(Math.min(3, zoom + 0.1))} title="Přiblížit">+</button>
                <button type="button" className="crop-btn" onClick={() => setZoomLevel(Math.max(0.2, zoom - 0.1))} title="Oddálit">-</button>
                <button type="button" className="crop-btn" onClick={() => setRotationDeg(rotation - 90)} title="Otočit vlevo">↺</button>
                <button type="button" className="crop-btn" onClick={() => setRotationDeg(rotation + 90)} title="Otočit vpravo">↻</button>
                <button type="button" className="crop-btn" onClick={flipHorizontal} title="Překlopit vodorovně">⇋</button>
                <button type="button" className="crop-btn" onClick={flipVertical} title="Překlopit svisle">⇅</button>
                <button type="button" className="crop-btn" onClick={resetAdjustments} title="Reset">⟲</button>
              </div>

              <div style={{ display: 'grid', gap: 10 }}>
                <label style={{ display: 'grid', gap: 6, color: 'var(--text)', fontSize: 13 }}>
                  Přiblížení: {zoom.toFixed(1)}x
                  <input
                    type="range"
                    min={0.2}
                    max={3}
                    step={0.1}
                    value={zoom}
                    onChange={(e) => setZoomLevel(Number(e.target.value))}
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
                    onChange={(e) => setRotationDeg(Number(e.target.value))}
                  />
                </label>
              </div>
            </div>

            <div className="crop-modal-footer">
              <button type="button" className="btn-cancel" onClick={closeCropModal}>
                Zrušit
              </button>
              <button type="button" className="btn-save" onClick={uploadCroppedLogo} disabled={uploading}>
                {uploading ? 'Nahrávám...' : 'Uložit logo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
