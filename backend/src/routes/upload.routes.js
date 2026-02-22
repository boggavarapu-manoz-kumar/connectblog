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

        // 🚀 High-Performance Cloud Proxy Algorithm
        // Native streaming from memory buffer to freeimage.host API
        const formData = new FormData();
        formData.append('key', '6d207e02198a847aa98d0a2a901485a5');
        formData.append('action', 'upload');
        formData.append('format', 'json');

        // Prepare the file for the request
        const fileContent = new Blob([req.file.buffer], { type: req.file.mimetype });
        formData.append('source', fileContent, req.file.originalname);

        const response = await fetch('https://freeimage.host/api/1/upload', {
            method: 'POST',
            body: formData,
            // Keep connection alive for speed
            headers: {
                'Connection': 'keep-alive'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('3rd Party API Error:', errorText);
            return res.status(502).json({ message: 'Upstream image service failed' });
        }

        const data = await response.json();

        if (data && data.image && data.image.url) {
            return res.status(200).json({ url: data.image.url });
        } else {
            throw new Error('Invalid response format from image host');
        }

    } catch (error) {
        console.error('Critical Upload Lag-Fix Failure:', error);
        res.status(500).json({ message: 'Image processing failed on the server clusters.' });
    }
});

module.exports = router;
