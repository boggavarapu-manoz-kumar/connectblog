import fs from 'fs';

async function generate() {
    const backendUrl = process.env.VITE_API_URL || 'https://connectblog-backend-qwe1.onrender.com';
    
    try {
        console.log(`Fetching sitemap from backend: ${backendUrl}/api/seo/sitemap.xml`);
        const response = await fetch(`${backendUrl}/api/seo/sitemap.xml`);
        
        if (!response.ok) {
            throw new Error(`Backend returned status ${response.status}`);
        }
        
        const xml = await response.text();
        
        if (xml.trim().toLowerCase().startsWith('<!doctype html>')) {
            throw new Error('Backend returned HTML. Invalid backend URL.');
        }

        fs.writeFileSync('public/sitemap.xml', xml);
        console.log('✅ Sitemap successfully generated at public/sitemap.xml');
    } catch (error) {
        console.error('⚠️ Failed to fetch dynamic sitemap from backend:', error.message);
        console.log('Generating fallback static sitemap...');
        
        const fallbackXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://connectblog.site/</loc>
    <changefreq>daily</changefreq>
  </url>
  <url>
    <loc>https://connectblog.site/explore</loc>
    <changefreq>hourly</changefreq>
  </url>
</urlset>`;
        
        fs.writeFileSync('public/sitemap.xml', fallbackXml);
        console.log('✅ Fallback sitemap created.');
    }
}

generate();
