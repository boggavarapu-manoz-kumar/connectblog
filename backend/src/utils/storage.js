const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Saves a buffer to the local uploads directory.
 * @param {Buffer} buffer - The file buffer
 * @param {string} originalName - Original filename to get extension
 * @returns {Promise<string>} - The relative path to the saved file
 */
const saveToLocal = async (buffer, originalName) => {
    const uploadsDir = path.join(__dirname, '../../uploads');
    
    // Ensure directory exists
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const ext = path.extname(originalName) || '.jpg';
    const fileName = `${crypto.randomUUID()}${ext}`;
    const filePath = path.join(uploadsDir, fileName);


    return new Promise((resolve, reject) => {
        fs.writeFile(filePath, buffer, (err) => {
            if (err) return reject(err);
            resolve(`/uploads/${fileName}`);
        });
    });
};

module.exports = { saveToLocal };
