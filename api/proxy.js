export default async function handler(req, res) {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'URL parameter is required' });
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to fetch resource' });
    }

    const contentType = response.headers.get('content-type');

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    // Pass original content type
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }

    // Handle M3U8 Playlists (Rewriting)
    if (contentType && (contentType.includes('application/vnd.apple.mpegurl') || contentType.includes('application/x-mpegurl') || url.endsWith('.m3u8'))) {
      const text = await response.text();
      const baseUrl = new URL(url); // Para resolver paths relativos

      const modifiedText = text.replace(/^(?!#)(?!\s)(.+)$/gm, (match) => {
        // match é a linha da URL (segmento ou playlist aninhada)
        let absoluteUrl = match.trim();

        // Resolve URL relativa se necessário
        if (!absoluteUrl.startsWith('http')) {
          absoluteUrl = new URL(absoluteUrl, baseUrl).href;
        }

        // Encapsula no nosso proxy
        return `/api/proxy?url=${encodeURIComponent(absoluteUrl)}`;
      });

      res.status(200).send(modifiedText);
    } else {
      // Binary / Segments / Other (Stream directly)
      const arrayBuffer = await response.arrayBuffer();
      res.status(200).send(Buffer.from(arrayBuffer));
    }

  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
