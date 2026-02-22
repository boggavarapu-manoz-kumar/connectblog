const mongoose = require('mongoose');
const Post = require('./src/models/Post.model');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/connectblog')
    .then(async () => {
        console.log("DB Connected, scanning for dead Catbox links...");
        // find posts with catbox.moe in the image field
        const result = await Post.updateMany(
            { image: { $regex: 'catbox.moe', $options: 'i' } },
            { $set: { image: 'https://via.placeholder.com/600x400.png?text=Image+Expired' } }
        );
        console.log(`Updated ${result.modifiedCount} old broken posts!`);
        process.exit(0);
    })
    .catch(err => {
        console.error("DB Error: ", err);
        process.exit(1);
    });
