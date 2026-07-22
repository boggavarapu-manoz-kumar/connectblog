export default async function handler(req, res) {
    // Attempt to get the backend URL. Vercel exposes env vars defined in the dashboard.
    const backendUrl = process.env.VITE_API_URL || process.env.BACKEND_URL;
    
    if (!backendUrl) {
        res.setHeader('Content-Type', 'application/xml');
        return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://connectblog.site/</loc></url></urlset>`);
    }

    try {
        const response = await fetch(`${backendUrl}/api/seo/sitemap.xml`);
        
        if (!response.ok) {
            throw new Error(`Backend responded with status: ${response.status}`);
        }

        const xml = await response.text();
        
        // Ensure we don't accidentally serve an HTML error page as XML
        if (xml.trim().toLowerCase().startsWith('<!doctype html>')) {
            throw new Error('Backend returned HTML instead of XML. URL might be incorrect.');
        }
        
        res.setHeader('Content-Type', 'application/xml');
        res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
        res.status(200).send(xml);
    } catch (error) {
        console.error('Failed to generate sitemap:', error);
        // Fallback static sitemap so Google doesn't throw a format error
        res.setHeader('Content-Type', 'application/xml');
        res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://connectblog.site/</loc></url></urlset>`);
    }
}
