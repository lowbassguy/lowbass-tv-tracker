import express from 'express';
import { searchShowsFromTvmaze } from '../services/tvmazeService';

const router = express.Router();

// Search shows via TVmaze API
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const results = await searchShowsFromTvmaze(q);
    
    res.json({ results });
  } catch (error) {
    console.error('Search shows error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router; 