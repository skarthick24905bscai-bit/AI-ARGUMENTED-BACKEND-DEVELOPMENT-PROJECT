/**
 * AI Service
 * Powered by Google Gemini (@google/genai)
 * Generates natural-language weather summaries and personalized activity/clothing recommendations.
 * Includes intelligent caching, automatic rate-limit cooldown, model cascade, and resilient fallback.
 */

let genAIInstance = null;
let quotaCooldownUntil = 0;

// In-memory cache for generated AI insights (15 min TTL)
const cache = {
  summaries: new Map(),
  recommendations: new Map(),
};

const getCacheKey = (data) => {
  const city = (data.city || '').toLowerCase().trim();
  const temp = Math.round(data.temperature || 0);
  const cond = (data.condition || '').toLowerCase().trim();
  return `${city}_${temp}_${cond}`;
};

const getGenAI = async () => {
  if (genAIInstance) return genAIInstance;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  try {
    const { GoogleGenAI } = await import('@google/genai');
    genAIInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
    return genAIInstance;
  } catch (err) {
    return null;
  }
};

const withTimeout = (promise, ms = 2500) => {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('AI request timeout')), ms)),
  ]);
};

/**
 * Execute Gemini model call with model cascade and graceful error handling
 */
const callGeminiWithFallback = async (ai, prompt) => {
  // If we are currently in quota cooldown, don't attempt to call the API
  if (Date.now() < quotaCooldownUntil) {
    return null;
  }

  const models = ['gemini-3.8-flash', 'gemini-3.1-flash-lite'];

  for (const model of models) {
    try {
      const response = await withTimeout(
        ai.models.generateContent({
          model,
          contents: prompt,
        }),
        2500
      );

      if (response && response.text) {
        return {
          text: response.text.trim(),
          source: model === 'gemini-3.8-flash' ? 'Gemini 3.8 Flash' : 'Gemini 3.1 Flash Lite',
        };
      }
    } catch (error) {
      const msg = (error.message || '').toLowerCase();
      // Check for 429 / RESOURCE_EXHAUSTED / quota exceeded
      if (error.status === 429 || msg.includes('429') || msg.includes('quota') || msg.includes('resource_exhausted')) {
        // Cooldown for 60 seconds to avoid spamming the rate-limited API
        quotaCooldownUntil = Date.now() + 60000;
        break; // Stop cascading on quota exhaustion
      }
      // Continue to next model if just this one failed
    }
  }

  return null;
};

/**
 * Generate natural-language weather summary
 */
const generateWeatherSummary = async (weatherData) => {
  const { city, temperature, condition, humidity, windSpeed, pressure, visibility } = weatherData;
  const cacheKey = getCacheKey(weatherData);

  // Check cache first
  const cached = cache.summaries.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < 15 * 60 * 1000)) {
    return {
      summary: cached.summary,
      source: cached.source + ' (Cached)',
    };
  }

  const ai = await getGenAI();

  if (ai) {
    const prompt = `You are AI WeatherWise, an intelligent meteorological companion.
Provide a concise, engaging 2-to-3 sentence natural language weather summary for ${city}.
Base your response STRICTLY on these real meteorological numbers:
- Temperature: ${temperature}°C
- Condition: ${condition}
- Humidity: ${humidity}%
- Wind Speed: ${windSpeed} km/h
- Pressure: ${pressure || 1013} hPa
- Visibility: ${visibility || 10} km

Do NOT invent new measurements. Output only the clear summary text.`;

    const result = await callGeminiWithFallback(ai, prompt);
    if (result) {
      cache.summaries.set(cacheKey, {
        summary: result.text,
        source: result.source,
        timestamp: Date.now(),
      });
      return {
        summary: result.text,
        source: result.source,
      };
    }
  }

  // Resilient Meteorological Intelligence Synthesis
  let tempDesc = 'mild and pleasant';
  if (temperature > 32) tempDesc = 'sweltering hot';
  else if (temperature > 24) tempDesc = 'pleasantly warm';
  else if (temperature < 5) tempDesc = 'crisp and chilly';
  else if (temperature <= 0) tempDesc = 'sub-zero freezing';

  const humidityDesc = humidity > 75 ? 'elevated moisture levels' : 'comfortable relative humidity';
  const windDesc = windSpeed > 20 ? `brisk winds gusting at ${windSpeed} km/h` : `a gentle breeze of ${windSpeed} km/h`;

  const fallbackSummary = `In ${city}, atmospheric conditions currently indicate ${condition.toLowerCase()} with a ${tempDesc} reading of ${temperature}°C. Ambient moisture registers at ${humidity}% with ${windDesc}, while barometric pressure holds stable near ${pressure || 1013} hPa.`;

  cache.summaries.set(cacheKey, {
    summary: fallbackSummary,
    source: 'WeatherWise Meteorological Engine',
    timestamp: Date.now(),
  });

  return {
    summary: fallbackSummary,
    source: 'WeatherWise Meteorological Engine',
  };
};

/**
 * Generate personalized activity and clothing recommendations
 */
const generateRecommendation = async (weatherData) => {
  const { city, temperature, condition, humidity, windSpeed } = weatherData;
  const cacheKey = getCacheKey(weatherData);

  // Check cache first
  const cached = cache.recommendations.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < 15 * 60 * 1000)) {
    return {
      recommendation: cached.recommendation,
      source: cached.source + ' (Cached)',
    };
  }

  const ai = await getGenAI();

  if (ai) {
    const prompt = `You are AI WeatherWise, a personalized climate advisor.
Given the current weather metrics for ${city || 'this location'}:
- Temperature: ${temperature}°C
- Condition: ${condition}
- Humidity: ${humidity}%
- Wind Speed: ${windSpeed} km/h

Provide tailored, practical recommendations covering:
1. What clothing or gear to wear
2. Ideal outdoor or indoor activities
3. Health/hydration/comfort tip

Keep the tone helpful and direct in 2-3 concise sentences. Output only the advice.`;

    const result = await callGeminiWithFallback(ai, prompt);
    if (result) {
      cache.recommendations.set(cacheKey, {
        recommendation: result.text,
        source: result.source,
        timestamp: Date.now(),
      });
      return {
        recommendation: result.text,
        source: result.source,
      };
    }
  }

  // Resilient Expert Recommendation Engine
  let clothing = 'Comfortable layered casuals';
  let activity = 'Optimal for outdoor strolls, cafe dining, and routine commute.';
  let healthTip = 'Stay reasonably hydrated and enjoy the pleasant atmospheric conditions.';

  if (temperature >= 30) {
    clothing = 'Breathable lightweight linen or cotton, sunglasses, and UV protection';
    activity = 'Early morning runs, indoor fitness, or relaxed shaded activities.';
    healthTip = 'Drink at least 2.5L of water today and limit prolonged direct sun exposure between 11 AM and 3 PM.';
  } else if (condition.toLowerCase().includes('rain') || condition.toLowerCase().includes('drizzle')) {
    clothing = 'Water-resistant outer jacket, sturdy footwear, and a compact umbrella';
    activity = 'Great for cozy indoor reading, museum explorations, or sheltered transit.';
    healthTip = 'Watch for slippery sidewalks and keep personal electronics in protective bags.';
  } else if (temperature < 10) {
    clothing = 'Thermal inner wear, a warm wool coat or fleece jacket, and a scarf';
    activity = 'Invigorating brisk walks, indoor warm workouts, and hot beverage breaks.';
    healthTip = 'Protect extremities from cold wind exposure and moisturize dry skin.';
  }

  const fallbackRec = `Wear ${clothing}. ${activity} ${healthTip}`;

  cache.recommendations.set(cacheKey, {
    recommendation: fallbackRec,
    source: 'WeatherWise Lifestyle Advisor',
    timestamp: Date.now(),
  });

  return {
    recommendation: fallbackRec,
    source: 'WeatherWise Lifestyle Advisor',
  };
};

module.exports = {
  generateWeatherSummary,
  generateRecommendation,
};
