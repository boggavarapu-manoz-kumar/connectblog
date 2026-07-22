const express = require('express');
const router = express.Router();
const seoController = require('../controllers/seo.controller');

// GET /api/seo/sitemap.xml
router.get('/sitemap.xml', seoController.generateSitemap);

module.exports = router;
