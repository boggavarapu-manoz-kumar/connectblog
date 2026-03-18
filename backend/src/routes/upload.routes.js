const express = require('express');
const router = express.Router();
const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const { protect } = require('../middleware/auth.middleware');
const { Readable } = require('stream');

// ─── Cloudinary Config ────────────────────────────────────────────────────────
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dfqztov62',
    api_key: process.env.CLOUDINARY_API_KEY || '178619623668134',
    api_secret: process.env.CLOUDINARY_API_SECRET || 'gqF7D2hF27q7t4d5PZ1Gz_p2nWY'
});

// ─── Multer — memory storage (no disk write, no temp files) ───────────────────
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB hard cap
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error('Only image files are allowed'), false);
        }
        cb(null, true);
    }
});

// ─── Helper: Upload buffer to Cloudinary via a stream ────────────────────────
// No temp file is written — buffer is piped directly to Cloudinary.
// This is the fastest possible approach: no disk I/O, no file re-read.
const uploadToCloudinary = (buffer, mimetype) => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: 'connectblog',
                resource_type: 'image',
                // Cloudinary performs automatic quality optimisation + format selection
                transformation: [
                    { quality: 'auto:good' },  // Smart quality — human-eye optimal
                    { fetch_format: 'auto' },   // WebP/AVIF where browser supports
                    { width: 1200, height: 1200, crop: 'limit' } // Cap at 1200px (no upscale)
                ]
            },
            (error, result) => {
                if (error) return reject(error);
                resolve(result);
            }
        );

        // Pipe the in-memory buffer into the upload stream using Node built-in
        Readable.from(buffer).pipe(uploadStream);
    });
};

// ─── POST /api/upload ──────────────────────────────────────────────────────────
// Protected — only logged-in users can upload
router.post('/', protect, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No image provided' });
        }

        // Upload to Cloudinary — fast CDN, automatic optimisation, no 3rd-party downtime
        const result = await uploadToCloudinary(req.file.buffer, req.file.mimetype);

        // Return the CDN-optimised URL
        return res.status(200).json({
            url: result.secure_url,        // HTTPS CDN URL
            publicId: result.public_id,          // For future deletion if needed
            width: result.width,
            height: result.height,
            format: result.format,
            bytes: result.bytes
        });

    } catch (error) {
        console.error('[Upload Error]', error.message);
        res.status(500).json({ message: 'Image upload failed. Please try again.' });
    }
});

module.exports = router;
