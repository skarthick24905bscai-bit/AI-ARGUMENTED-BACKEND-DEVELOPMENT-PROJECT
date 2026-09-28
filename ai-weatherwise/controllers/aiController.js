const { generateWeatherSummary, generateRecommendation } = require('../services/aiService');
const { fetchWeatherData } = require('../services/weatherService');
const Analytics = require('../models/Analytics');
const { isMongoConnected } = require('../config/db');
const { store, generateId } = require('../config/fallbackStore');

// @desc    Generate natural-language weather summary with Gemini
// @route   POST /api/ai/summary or POST /api/ai/weather-summary
// @access  Public
const getWeatherSummary = async (req, res, next) => {
  try {
    let { city, temperature, condition, humidity, windSpeed, pressure, visibility } = req.body;

    // If only city was passed, fetch the real weather data first
    if (city && (temperature === undefined || condition === undefined)) {
      const fetched = await fetchWeatherData(city);
      temperature = fetched.temperature;
      condition = fetched.condition;
      humidity = fetched.humidity;
      windSpeed = fetched.windSpeed;
      pressure = fetched.pressure;
      visibility = fetched.visibility;
    }

    if (!city || temperature === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Please provide weather metrics or a valid city name',
      });
    }

    const weatherData = {
      city,
      temperature,
      condition: condition || 'Clear',
      humidity: humidity || 60,
      windSpeed: windSpeed || 10,
      pressure: pressure || 1013,
      visibility: visibility || 10,
    };

    const aiResult = await generateWeatherSummary(weatherData);

    // Track analytics event
    try {
      if (isMongoConnected()) {
        await Analytics.create({
          eventType: 'ai_summary',
          city,
          user: req.user ? req.user._id : null,
          details: { source: aiResult.source },
          ip: req.ip,
        });
      } else {
        store.analytics.push({
          _id: generateId(),
          eventType: 'ai_summary',
          city,
          user: req.user ? req.user._id : null,
          details: { source: aiResult.source },
          ip: req.ip,
          timestamp: new Date(),
        });
      }
    } catch (e) {}

    return res.status(200).json({
      success: true,
      summary: aiResult.summary,
      data: {
        summary: aiResult.summary,
        source: aiResult.source,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Generate personalized activity/clothing recommendation with Gemini
// @route   POST /api/ai/recommendation or POST /api/ai/weather-recommendation
// @access  Public
const getWeatherRecommendation = async (req, res, next) => {
  try {
    let { city, temperature, condition, humidity, windSpeed } = req.body;

    if (city && (temperature === undefined || condition === undefined)) {
      const fetched = await fetchWeatherData(city);
      temperature = fetched.temperature;
      condition = fetched.condition;
      humidity = fetched.humidity;
      windSpeed = fetched.windSpeed;
    }

    if (temperature === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Weather temperature and condition are required for recommendations',
      });
    }

    const weatherData = {
      city: city || 'Current Location',
      temperature,
      condition: condition || 'Clear',
      humidity: humidity || 60,
      windSpeed: windSpeed || 10,
    };

    const aiResult = await generateRecommendation(weatherData);

    // Format matching exact PDF specification page 15:
    // {"success": true, "recommendation": "Stay hydrated, and wear light cotton clothes."}
    return res.status(200).json({
      success: true,
      recommendation: aiResult.recommendation,
      data: {
        recommendation: aiResult.recommendation,
        source: aiResult.source,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getWeatherSummary,
  getWeatherRecommendation,
};
