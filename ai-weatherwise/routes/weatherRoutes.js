const express = require('express');
const router = express.Router();
const {
  getWeather,
  getWeatherCoordinates,
  searchWorldwideLocationsController,
} = require('../controllers/weatherController');

router.get('/search/locations', searchWorldwideLocationsController);
router.get('/coordinates', getWeatherCoordinates);
router.get('/:city', getWeather);

module.exports = router;
