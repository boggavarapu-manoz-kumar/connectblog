const express = require('express');
const router = express.Router();
const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const { protect } = require('../middleware/auth.middleware');
const fs = require('fs');
const path = require('path');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dfqztov62',
    api_key: process.env.CLOUDINARY_API_KEY || '178619623668134',
    api_secret: process.env.CLOUDINARY_API_SECRET || 'gqF7D2hF27q7t4d5PZ1Gz_p2nWY'
});

const storage = multer.memoryStorage();

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

router.post('/', protect, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No image provided' });
        }

        // Convert raw image buffer into a lightweight base64 string
        const base64Image = req.file.buffer.toString('base64');

        // Construct payload for FreeImage.host blazing fast API
        const formData = new URLSearchParams();
        formData.append('key', '6d207e02198a847aa98d0a2a901485a5'); // Public free API key
        formData.append('action', 'upload');
        formData.append('source', base64Image);
        formData.append('format', 'json');

        // Upload to a true 3rd-party reliable image hosting server
        const response = await fetch('https://freeimage.host/api/1/upload', {
            method: 'POST',
            body: formData,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        const data = await response.json();

        if (data.status_code !== 200) {
            throw new Error(data?.error?.message || "Failed to upload to 3rd-party node");
        }

        // Return the successfully hosted remote third-party URL link
        return res.status(200).json({ url: data.image.url });

    } catch (error) {
        console.error('Core upload error:', error);
        res.status(500).json({ message: 'Failed to upload image' });
    }
});

module.exports = router;
