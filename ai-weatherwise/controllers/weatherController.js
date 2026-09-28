const {
  fetchWeatherData,
  fetchWeatherByCoordinates,
  searchRegisteredWorldwideLocations,
} = require('../services/weatherService');
const Analytics = require('../models/Analytics');
const { isMongoConnected } = require('../config/db');
const { store, generateId } = require('../config/fallbackStore');

// @desc    Search registered worldwide locations with exact coordinates
// @route   GET /api/weather/search/locations?q=...
// @access  Public
const searchWorldwideLocationsController = async (req, res, next) => {
  try {
    const q = req.query.q || req.query.query || '';
    if (!q || q.trim().length < 2) {
      return res.status(200).json({
        success: true,
        data: [],
      });
    }

    const locations = await searchRegisteredWorldwideLocations(q);
    return res.status(200).json({
      success: true,
      data: locations,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current weather by GPS coordinates
// @route   GET /api/weather/coordinates?lat=...&lon=...&city=...&country=...
// @access  Public
const getWeatherCoordinates = async (req, res, next) => {
  try {
    const { lat, lon, city, country } = req.query;

    if (!lat || !lon) {
      return res.status(400).json({
        success: false,
        message: 'Both lat and lon parameters are required',
      });
    }

    const weatherData = await fetchWeatherByCoordinates(lat, lon, city, country);

    return res.status(200).json({
      success: true,
      message: 'Live real-time weather retrieved successfully',
      data: weatherData,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current weather for a city
// @route   GET /api/weather/:city
// @access  Public
const getWeather = async (req, res, next) => {
  try {
    const city = req.params.city;

    if (!city || !city.trim()) {
      return res.status(400).json({
        success: false,
        message: 'City parameter is required',
      });
    }

    const weatherData = await fetchWeatherData(city);

    // Track analytics event asynchronously
    try {
      if (isMongoConnected()) {
        await Analytics.create({
          eventType: 'weather_search',
          city: weatherData.city,
          user: req.user ? req.user._id : null,
          details: {
            temperature: weatherData.temperature,
            condition: weatherData.condition,
          },
          ip: req.ip || req.connection?.remoteAddress,
        });
      } else {
        store.analytics.push({
          _id: generateId(),
          eventType: 'weather_search',
          city: weatherData.city,
          user: req.user ? req.user._id : null,
          details: {
            temperature: weatherData.temperature,
            condition: weatherData.condition,
          },
          ip: req.ip || req.connection?.remoteAddress,
          timestamp: new Date(),
        });
      }
    } catch (trackErr) {
      console.warn('[WeatherController] Analytics logging skipped:', trackErr.message);
    }

    return res.status(200).json({
      success: true,
      message: 'Weather information retrieved successfully',
      data: weatherData,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getWeather,
  getWeatherCoordinates,
  searchWorldwideLocationsController,
};
