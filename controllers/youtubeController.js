const axios = require('axios');
const Channel = require('../models/Channel');
const Video = require('../models/Video');
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

function parseDuration(duration) {
    if (!duration || typeof duration !== 'string') return 0;
  
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  
    if (!match) return 0;
  
    const hours = parseInt(match[1] || 0);
    const minutes = parseInt(match[2] || 0);
    const seconds = parseInt(match[3] || 0);
  
    return (hours * 3600) + (minutes * 60) + seconds;
  }

exports.syncChannel = async (req, res) => {
  const { channelId } = req.params;

  try {
    // Fetch channel info
    const channelRes = await axios.get(`https://www.googleapis.com/youtube/v3/channels`, {
      params: {
        part: 'snippet,statistics',
        id: channelId,
        key: YOUTUBE_API_KEY
      }
    });

    const channelData = channelRes.data.items[0];
    const channel = await Channel.findOneAndUpdate(
      { channelId },
      {
        title: channelData.snippet.title,
        description: channelData.snippet.description,
        thumbnail: channelData.snippet.thumbnails.default.url,
        subscribers: channelData.statistics.subscriberCount
      },
      { upsert: true, new: true }
    );

    // Fetch latest videos
    const searchRes = await axios.get(`https://www.googleapis.com/youtube/v3/search`, {
      params: {
        part: 'snippet',
        channelId,
        maxResults: 25,
        order: 'date',
        type: 'video',
        key: YOUTUBE_API_KEY
      }
    });

    const videoIds = searchRes.data.items.map(item => item.id.videoId).join(',');

    const videoRes = await axios.get(`https://www.googleapis.com/youtube/v3/videos`, {
      params: {
        part: 'contentDetails,snippet',
        id: videoIds,
        key: YOUTUBE_API_KEY
      }
    });

    for (const item of videoRes.data.items) {
      const durationSec = parseDuration(item.contentDetails.duration);

      await Video.findOneAndUpdate(
        { videoId: item.id },
        {
          title: item.snippet.title,
          thumbnail: item.snippet.thumbnails.medium.url,
          publishedAt: item.snippet.publishedAt,
          duration: item.contentDetails.duration,
          isShort: durationSec < 60,
          channelId
        },
        { upsert: true, new: true }
      );
    }

    res.status(200).json({ message: 'YouTube data synced successfully!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to sync YouTube data', error: err.message });
  }
};

exports.getVideos = async (req, res) => {
  const { type } = req.query;

  try {
    const query = type === 'shorts'
      ? { isShort: true }
      : type === 'videos'
      ? { isShort: false }
      : {};

    const videos = await Video.find(query).sort({ publishedAt: -1 });
    res.json(videos);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching videos' });
  }
};

exports.getChannels = async (req, res) => {
  try {
    const channels = await Channel.find();
    res.json(channels);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching channels' });
  }
};