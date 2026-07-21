const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
    const primaryUri = process.env.MONGO_URI || 'mongodb://localhost:27017/connectblog';
    const fallbackUri = 'mongodb://localhost:27017/connectblog';

    try {
        const conn = await mongoose.connect(primaryUri);
        logger.info(`MongoDB Connected (Primary): ${conn.connection.host}`);
    } catch (error) {
        logger.error(`Primary DB Connection Error: ${error.message}`);
        if (primaryUri !== fallbackUri) {
            logger.warn('Attempting fallback to local MongoDB...');
            try {
                const conn = await mongoose.connect(fallbackUri);
                logger.info(`MongoDB Connected (Fallback): ${conn.connection.host}`);
            } catch (fallbackError) {
                logger.error(`Fallback DB Connection Error: ${fallbackError.message}`);
                process.exit(1);
            }
        } else {
            process.exit(1);
        }
    }
};

module.exports = connectDB;

