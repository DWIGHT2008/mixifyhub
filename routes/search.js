const express = require('express');
const axios = require('axios');
const router = express.Router();

const UNSPLASH_KEY = process.env.UNSPLASH_KEY;
const PEXELS_KEY = process.env.PEXELS_KEY;

router.get('/', async (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).json({ error: 'Query is required' });

  try {
    const unsplashRes = await axios.get(`https://api.unsplash.com/search/photos`, {
      params: { query },
      headers: { Authorization: `Client-ID ${UNSPLASH_KEY}` }
    });

    const pexelsRes = await axios.get(`https://api.pexels.com/v1/search`, {
      params: { query, per_page: 15 },
      headers: { Authorization: PEXELS_KEY }
    });

    const unsplashPhotos = unsplashRes.data.results.map(photo => ({
      id: photo.id,
      src: photo.urls.small,
      full: photo.urls.full,
      alt: photo.alt_description,
      downloadLink: photo.links.download_location,
      source: 'unsplash'
    }));

    const pexelsPhotos = pexelsRes.data.photos.map(photo => ({
      id: `pexels-${photo.id}`,
      src: photo.src.medium,
      full: photo.src.original,
      alt: photo.alt || photo.photographer,
      downloadLink: photo.src.original,
      source: 'pexels'
    }));

    res.json([...unsplashPhotos, ...pexelsPhotos]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to fetch from APIs' });
  }
});

module.exports = router;