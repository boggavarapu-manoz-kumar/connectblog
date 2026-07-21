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
        default: ''
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
    likeCount: {
        type: Number,
        default: 0
    },
    isArchived: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual populate for comments
postSchema.virtual('comments', {
    ref: 'Comment',
    localField: '_id',
    foreignField: 'post'
});

// ── Performance Indexes ───────────────────────────────────────────────────────
postSchema.index({ title: 'text', content: 'text', hashtags: 'text' });  // full-text search
postSchema.index({ author: 1, createdAt: -1 });                           // profile posts (paginated)
postSchema.index({ isArchived: 1, createdAt: -1 });                        // feed match + sort
postSchema.index({ likeCount: -1, createdAt: -1 });                        // trending feed sort

module.exports = mongoose.model('Post', postSchema);
