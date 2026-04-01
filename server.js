import express from 'express';
import cors from 'cors';
import { Readable } from 'stream';

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/twitter', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required' });

  try {
    // Extract ID from URL
    const match = url.match(/\/status\/(\d+)/);
    if (!match) return res.status(400).json({ error: 'O link não parece conter um ID válido do Twitter' });
    const id = match[1];

    const apiUrl = `https://cdn.syndication.twimg.com/tweet-result?id=${id}&lang=en&token=1`;
    const response = await fetch(apiUrl);

    if (!response.ok) {
      if (response.status === 404) {
        return res.status(404).json({ error: 'Tweet não encontrado ou indisponível para extração externa.' });
      }
      return res.status(response.status).json({ error: 'Erro ao conectar à API de Syndication do Twitter.' });
    }

    const data = await response.json();

    // Check main video or mediaDetails
    let variants = [];
    if (data.video && data.video.variants) {
      variants = data.video.variants;
    } else if (data.mediaDetails && data.mediaDetails[0] && data.mediaDetails[0].video_info) {
      variants = data.mediaDetails[0].video_info.variants;
    }

    if (!variants || variants.length === 0) {
      return res.status(404).json({ error: 'Nenhum vídeo foi encontrado neste tweet.' });
    }

    // Filter to mp4 and sort by highest bitrate
    const mp4Variants = variants
      .filter(v => v.type === 'video/mp4' || v.content_type === 'video/mp4')
      .sort((a, b) => {
        const brA = a.bitrate || 0;
        const brB = b.bitrate || 0;
        return brB - brA; // desc
      });

    if (mp4Variants.length === 0) {
      return res.status(404).json({ error: 'Vídeo MP4 não disponível.' });
    }

    res.json({ url: mp4Variants[0].src || mp4Variants[0].url });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/proxy-video', async (req, res) => {
  try {
    const mediaUrl = req.query.url;
    if (!mediaUrl) return res.status(400).send('URL required');

    // fetch with an empty/faked User-Agent if needed, Twitter usually allows direct mp4 links
    const response = await fetch(mediaUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    });

    if (!response.ok) return res.status(response.status).send('Failed to proxy video');

    res.setHeader('Content-Type', response.headers.get('content-type') || 'video/mp4');

    // Pipe the web stream to express response
    if (response.body) {
      Readable.fromWeb(response.body).pipe(res);
    } else {
      res.status(500).send('No body in response');
    }
  } catch (error) {
    res.status(500).send(error.message);
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`FiGif Backend rodando na porta ${PORT}`);
});
