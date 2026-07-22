export default async function handler(req, res) {
    const backendUrl = process.env.VITE_API_URL || 'https://connectblog.onrender.com';
    
    try {
        const response = await fetch(`${backendUrl}/api/seo/sitemap.xml`);
        const xml = await response.text();
        
        res.setHeader('Content-Type', 'application/xml');
        res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
        res.status(200).send(xml);
    } catch (error) {
        console.error('Failed to generate sitemap:', error);
        res.status(500).send('Error generating sitemap');
    }
}
