const express = require('express');
const router = express.Router();
const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const { protect } = require('../middleware/auth.middleware');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dfqztov62',
    api_key: process.env.CLOUDINARY_API_KEY || '178619623668134',
    api_secret: process.env.CLOUDINARY_API_SECRET || 'gqF7D2hF27q7t4d5PZ1Gz_p2nWY'
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'connectblog',
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp', 'gif'],
    },
});

const upload = multer({ storage });

router.post('/', protect, upload.single('image'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No image provided' });
        }
        // Cloudinary returns the secure url in path/secure_url
        res.status(200).json({ url: req.file.path || req.file.secure_url });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ message: 'Failed to upload image' });
    }
});

module.exports = router;
