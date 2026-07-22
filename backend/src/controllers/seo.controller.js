const Post = require('../models/Post.model');
const User = require('../models/User.model');
const asyncHandler = require('express-async-handler');

const generateSitemap = asyncHandler(async (req, res) => {
    // 1. Fetch public data
    const posts = await Post.find({ isArchived: false })
        .select('_id updatedAt')
        .sort({ createdAt: -1 })
        .lean();
        
    const users = await User.find({})
        .select('_id updatedAt')
        .lean();

    const baseUrl = 'https://connectblog.site';
    const currentDate = new Date().toISOString();

    // 2. Generate XML
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    // Static pages
    const staticPages = [
        { url: '/', changefreq: 'daily', priority: '1.0' },
        { url: '/explore', changefreq: 'hourly', priority: '0.9' },
        { url: '/login', changefreq: 'monthly', priority: '0.5' },
        { url: '/register', changefreq: 'monthly', priority: '0.5' }
    ];

    staticPages.forEach(page => {
        xml += `  <url>\n`;
        xml += `    <loc>${baseUrl}${page.url}</loc>\n`;
        xml += `    <lastmod>${currentDate}</lastmod>\n`;
        xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
        xml += `    <priority>${page.priority}</priority>\n`;
        xml += `  </url>\n`;
    });

    // Dynamic Posts
    posts.forEach(post => {
        xml += `  <url>\n`;
        xml += `    <loc>${baseUrl}/posts/${post._id}</loc>\n`;
        xml += `    <lastmod>${new Date(post.updatedAt || new Date()).toISOString()}</lastmod>\n`;
        xml += `    <changefreq>weekly</changefreq>\n`;
        xml += `    <priority>0.8</priority>\n`;
        xml += `  </url>\n`;
    });

    // Dynamic Profiles
    users.forEach(user => {
        xml += `  <url>\n`;
        xml += `    <loc>${baseUrl}/profile/${user._id}</loc>\n`;
        xml += `    <lastmod>${new Date(user.updatedAt || new Date()).toISOString()}</lastmod>\n`;
        xml += `    <changefreq>daily</changefreq>\n`;
        xml += `    <priority>0.7</priority>\n`;
        xml += `  </url>\n`;
    });

    xml += `</urlset>`;

    // 3. Send Response
    res.header('Content-Type', 'application/xml');
    res.status(200).send(xml);
});

module.exports = {
    generateSitemap
};
