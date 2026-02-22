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

// Configure Multer to save locally first
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../../uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, 'file-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

router.post('/', protect, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No image provided' });
        }

        const localFilePath = req.file.path;

        // Return the locally stored file URL instantly for super fast uploads
        const localURL = `http://localhost:5000/uploads/${req.file.filename}`;
        return res.status(200).json({ url: localURL });

    } catch (error) {
        console.error('Core upload error:', error);
        res.status(500).json({ message: 'Failed to upload image' });
    }
});

module.exports = router;
