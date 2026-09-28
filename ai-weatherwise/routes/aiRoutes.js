const express = require('express');
const router = express.Router();
const {
  getWeatherSummary,
  getWeatherRecommendation,
} = require('../controllers/aiController');

router.post('/summary', getWeatherSummary);
router.post('/weather-summary', getWeatherSummary);

router.post('/recommendation', getWeatherRecommendation);
router.post('/weather-recommendation', getWeatherRecommendation);

module.exports = router;
