import { useState, useCallback } from 'react'
import Cropper from 'react-easy-crop'

/** Load an image from URL and return the HTMLImageElement */
function createImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', reject)
    image.src = url
  })
}

/**
 * Produce a cropped image blob from imageSrc and crop area in pixels.
 * @param {string} imageSrc - Object URL or data URL of the image
 * @param {{ x: number, y: number, width: number, height: number }} pixelCrop - Crop area in image pixels
 * @returns {Promise<Blob>}
 */
export async function getCroppedImg(imageSrc, pixelCrop) {
  const image = await createImage(imageSrc)
  const crop = pixelCrop || {
    x: 0,
    y: 0,
    width: image.naturalWidth,
    height: image.naturalHeight,
  }
  const canvas = document.createElement('canvas')
  canvas.width = crop.width
  canvas.height = crop.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas not supported')
  ctx.drawImage(
    image,
    crop.x, crop.y, crop.width, crop.height, // source rect
    0, 0, crop.width, crop.height             // dest rect
  )
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Canvas toBlob failed'))),
      'image/jpeg',
      0.92
    )
  })
}

const THUMBNAIL_ASPECT = 16 / 9

/**
 * Modal that shows the full image and lets the user crop it.
 * onComplete(blob) is called with the cropped image blob; onCancel() when user cancels.
 */
export default function ImageCropModal({ imageSrc, onComplete, onCancel }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)
  const [applying, setApplying] = useState(false)

  const onCropComplete = useCallback((_croppedArea, croppedAreaPx) => {
    setCroppedAreaPixels(croppedAreaPx)
  }, [])

  const handleApply = async () => {
    if (!imageSrc) return
    setApplying(true)
    try {
      const blob = await getCroppedImg(imageSrc, croppedAreaPixels)
      onComplete(blob)
    } catch (err) {
      console.error('Crop failed:', err)
    } finally {
      setApplying(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-stone-900/95"
      role="dialog"
      aria-modal="true"
      aria-label="Crop thumbnail"
    >
      <div className="flex-none flex items-center justify-between px-4 py-3 border-b border-stone-700">
        <h2 className="text-lg font-semibold text-white">Crop thumbnail</h2>
        <button
          type="button"
          onClick={onCancel}
          className="p-2 rounded-lg text-stone-400 hover:text-white hover:bg-stone-700"
          aria-label="Close"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 0 1 1.06 0L12 10.94l5.47-5.47a.75.75 0 1 1 1.06 1.06L13.06 12l5.47 5.47a.75.75 0 1 1-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 0 1-1.06-1.06L10.94 12 5.47 6.53Z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
      <div className="flex-1 min-h-[40vh] relative">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={THUMBNAIL_ASPECT}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
          className="cropper-container"
        />
      </div>
      <div className="flex-none border-t border-stone-700 bg-stone-900">
        <div className="flex flex-col items-center gap-3 py-4 px-4">
          <label className="text-stone-400 text-sm">Zoom</label>
          <input
            type="range"
            min={1}
            max={3}
            step={0.1}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full max-w-xs accent-yellow-400"
          />
        </div>
        {/* Prominent bottom action bar - always visible */}
        <div className="flex items-center justify-end gap-3 px-4 py-4 bg-white border-t-2 border-stone-200">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 rounded-lg text-stone-600 hover:text-stone-900 hover:bg-stone-100 text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={applying}
            className="px-5 py-2.5 rounded-lg bg-stone-900 text-white text-sm font-semibold hover:bg-stone-800 disabled:opacity-50 transition-colors shadow-sm"
          >
            {applying ? 'Saving…' : 'Save crop & continue'}
          </button>
        </div>
      </div>
    </div>
  )
}
