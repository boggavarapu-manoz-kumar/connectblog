const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect } = require('../middleware/auth.middleware');
const sharp = require('sharp'); // Added for high-speed compression

// We use memoryStorage so the file is NEVER saved to the local disk
const storage = multer.memoryStorage();

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit for general uploads
});

router.post('/', protect, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No image provided' });
        }

        // --- BLAZING FAST OPTIMIZATION PIPELINE ---
        // Drastically reduces buffer size before making the external HTTP call to Catbox
        // A 5MB photo compresses to ~100-200kb instantly.
        const optimizedBuffer = await sharp(req.file.buffer)
            .resize({ width: 1080, withoutEnlargement: true }) // Typical highest mobile width need
            .webp({ quality: 80 }) // Next-Gen format, superior to JPEG
            .toBuffer();

        // Dynamically build a form payload directly from the compressed memory buffer
        const formData = new FormData();
        formData.append('reqtype', 'fileupload');

        // Convert optimized Buffer to Blob
        const blob = new Blob([optimizedBuffer], { type: 'image/webp' });

        // Pass the highly-optimized image securely to Catbox
        formData.append('fileToUpload', blob, 'optimized_image.webp');

        // Upload to catbox.moe (100% Free, Permanent, No Account Needed, No Local Storage)
        const response = await fetch('https://catbox.moe/user/api.php', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`Cloud Storage responded with status: ${response.status}`);
        }

        const uploadedUrl = await response.text();

        // Validate URL format returned
        if (!uploadedUrl.startsWith('http')) {
            throw new Error("Invalid URL returned from Cloud Provider");
        }

        // Return the permanent, remote link to the frontend (which is then saved to DB)
        res.status(200).json({ url: uploadedUrl });

    } catch (error) {
        console.error('Remote Upload Error:', error);
        res.status(500).json({ message: 'Failed to upload image to third-party permanent storage' });
    }
});

module.exports = router;
