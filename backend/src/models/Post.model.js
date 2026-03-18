const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Please add a post title'],
        trim: true,
        maxlength: [100, 'Title cannot be more than 100 characters']
    },
    content: {
        type: String,
        required: [true, 'Please add some content']
    },
    image: {
        type: String,
        default: 'https://via.placeholder.com/600x400.png?text=No+Image'
    },
    hashtags: [{
        type: String,
        trim: true
    }],
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    likes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    comments: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Comment'
    }],
    isArchived: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// ── Performance Indexes ───────────────────────────────────────────────────────
postSchema.index({ title: 'text', content: 'text', hashtags: 'text' });  // full-text search
postSchema.index({ author: 1, createdAt: -1 });                           // profile posts (paginated)
postSchema.index({ isArchived: 1, createdAt: -1 });                        // feed match + sort (compound — replaces 2 separate indexes)
postSchema.index({ likes: 1 });                                            // trending sort by like count

module.exports = mongoose.model('Post', postSchema);
