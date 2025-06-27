// youtube.js
const express = require('express');
const axios = require('axios');
const router = express.Router();

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

router.get('/api/youtube/search', async (req, res) => {
  try {
    const { query } = req.query;
    const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
      params: {
        key: YOUTUBE_API_KEY,
        part: 'snippet',
        q: query,
        type: 'video',
        maxResults: 10
      }
    });
    res.json(response.data);
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({ error: 'YouTube fetch failed' });
  }
});

router.get('/api/youtube/channel', async (req, res) => {
    try {
      const { id } = req.query;
      const response = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
        params: {
          key: YOUTUBE_API_KEY,
          part: 'snippet,statistics',
          id
        }
      });
      res.json(response.data);
    } catch (error) {
      res.status(500).json({ error: 'Channel fetch failed' });
    }
  });
module.exports = router;
