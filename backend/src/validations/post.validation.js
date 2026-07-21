const { z } = require('zod');

const createPostSchema = z.object({
    body: z.object({
        title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
        content: z.string().min(1, 'Content is required'),
        image: z.string().optional().nullable(),
        hashtags: z.array(z.string()).optional().default([])
    })
});

const updatePostSchema = z.object({
    body: z.object({
        title: z.string().min(1).max(200).optional(),
        content: z.string().min(1).optional(),
        image: z.string().optional().nullable(),
        hashtags: z.array(z.string()).optional()
    })
});

module.exports = {
    createPostSchema,
    updatePostSchema
};
