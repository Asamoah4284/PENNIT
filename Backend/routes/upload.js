import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import { v2 as cloudinary } from 'cloudinary'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const uploadsDir = path.join(__dirname, '../uploads')

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

// Configure Cloudinary from environment (Backend .env)
const hasCloudinary =
  !!process.env.CLOUDINARY_CLOUD_NAME &&
  !!process.env.CLOUDINARY_API_KEY &&
  !!process.env.CLOUDINARY_API_SECRET

if (hasCloudinary) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  })
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg'
    const safeExt = ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext.toLowerCase()) ? ext : '.jpg'
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}${safeExt}`
    cb(null, name)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = /^image\/(jpeg|jpg|png|gif|webp)$/i.test(file.mimetype)
    if (allowed) cb(null, true)
    else cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed.'))
  },
})

const router = Router()

/** POST /api/upload - Upload a single image (e.g. thumbnail). Returns { url }. */
router.post(
  '/',
  (req, res, next) => {
    upload.single('file')(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'Image must be 5MB or smaller.' })
        }
        return res.status(400).json({ error: err.message || 'Upload failed' })
      }
      next()
    })
  },
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' })
      }

      const localPath = req.file.path

      // If Cloudinary is configured, upload there and return the remote URL
      if (hasCloudinary) {
        try {
          const result = await cloudinary.uploader.upload(localPath, {
            folder: 'pennit/thumbnails',
            resource_type: 'image',
          })
          // Clean up local temp file
          fs.unlink(localPath, () => {})
          return res.json({ url: result.secure_url })
        } catch (err) {
          console.error('[PENNIT] Cloudinary upload failed:', err?.message || err)
          // Fall back to serving from local uploads if Cloudinary fails
          const fallbackUrl = `/uploads/${req.file.filename}`
          return res.status(200).json({ url: fallbackUrl })
        }
      }

      // If Cloudinary is not configured, serve from local uploads directory
      const url = `/uploads/${req.file.filename}`
      return res.json({ url })
    } catch (err) {
      console.error('Upload error:', err)
      return res.status(500).json({ error: 'Upload failed' })
    }
  }
)

export default router
