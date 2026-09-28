/**
 * AI WeatherWise - Weather Search & Deep Meteorological Explorer
 */

let currentWeatherData = null;
let currentTempUnit = localStorage.getItem('weatherwise_unit') || 'C';

function formatTemp(celsius) {
  if (celsius === undefined || celsius === null || isNaN(celsius)) return '--';
  if (currentTempUnit === 'F') {
    return `${Math.round((celsius * 9) / 5 + 32)}°F`;
  }
  return `${Math.round(celsius)}°C`;
}

function updateUnitToggleUI() {
  const cEl = document.getElementById('unitC');
  const fEl = document.getElementById('unitF');
  if (cEl && fEl) {
    if (currentTempUnit === 'F') {
      cEl.classList.remove('active');
      fEl.classList.add('active');
    } else {
      cEl.classList.add('active');
      fEl.classList.remove('active');
    }
  }
}

window.toggleTemperatureUnit = () => {
  currentTempUnit = currentTempUnit === 'C' ? 'F' : 'C';
  localStorage.setItem('weatherwise_unit', currentTempUnit);
  updateUnitToggleUI();
  if (currentWeatherData) {
    renderWeatherInspector(currentWeatherData);
  }
};

document.addEventListener('DOMContentLoaded', () => {
  api.initNavbarUser();
  updateUnitToggleUI();

  const form = document.getElementById('weatherSearchForm');
  const cityInput = document.getElementById('weatherCityInput');

  // Bind worldwide registered location autocomplete
  if (cityInput && cityInput.parentElement) {
    cityInput.parentElement.style.position = 'relative';
    api.setupLocationAutocomplete(cityInput, cityInput.parentElement, (loc) => {
      fetchWeatherByCoordinates(loc.latitude, loc.longitude, loc.name, loc.country || loc.admin1);
    });
  }

  // Check URL params or localStorage
  const params = new URLSearchParams(window.location.search);
  const city = params.get('city') || localStorage.getItem('weatherwise_last_city') || 'London';
  if (cityInput) cityInput.value = city;

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const query = cityInput ? cityInput.value.trim() : '';
      if (query) {
        fetchFullWeather(query);
      }
    });
  }

  fetchFullWeather(city);
});

async function fetchWeatherByCoordinates(lat, lon, cityName, countryName) {
  const container = document.getElementById('weatherDetailsContainer');
  const loading = document.getElementById('weatherLoading');

  try {
    if (loading) loading.style.display = 'block';
    if (container) container.style.opacity = '0.5';

    let url = `/weather/coordinates?lat=${lat}&lon=${lon}`;
    if (cityName) url += `&city=${encodeURIComponent(cityName)}`;
    if (countryName) url += `&country=${encodeURIComponent(countryName)}`;

    const res = await api.get(url);
    if (!res.success || !res.data) {
      throw new Error(res.message || 'Could not retrieve location weather');
    }

    currentWeatherData = res.data;
    localStorage.setItem('weatherwise_last_city', currentWeatherData.city);

    const cityInput = document.getElementById('weatherCityInput');
    if (cityInput) {
      if (cityName && countryName) {
        cityInput.value = `${cityName}, ${countryName}`;
      } else {
        cityInput.value = currentWeatherData.city;
      }
    }

    renderWeatherInspector(currentWeatherData);
    loadAiForecast(currentWeatherData);
  } catch (err) {
    api.showAlert('weatherAlertContainer', err.message || 'Location weather error', 'error');
  } finally {
    if (loading) loading.style.display = 'none';
    if (container) container.style.opacity = '1';
  }
}

window.useMyLocationWeather = () => {
  if (!navigator.geolocation) {
    api.showAlert('weatherAlertContainer', 'Geolocation is not supported by your browser.', 'error');
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      fetchWeatherByCoordinates(pos.coords.latitude, pos.coords.longitude);
    },
    (err) => {
      api.showAlert('weatherAlertContainer', 'Could not detect GPS location. Please allow location access or search manually.', 'error');
    },
    { timeout: 8000 }
  );
};

async function fetchFullWeather(city) {
  const container = document.getElementById('weatherDetailsContainer');
  const loading = document.getElementById('weatherLoading');

  try {
    if (loading) loading.style.display = 'block';
    if (container) container.style.opacity = '0.5';

    const res = await api.get(`/weather/${encodeURIComponent(city)}`);
    if (!res.success || !res.data) {
      throw new Error(res.message || 'Could not retrieve weather');
    }

    currentWeatherData = res.data;
    localStorage.setItem('weatherwise_last_city', currentWeatherData.city);

    const cityInput = document.getElementById('weatherCityInput');
    if (cityInput) cityInput.value = currentWeatherData.city;

    renderWeatherInspector(currentWeatherData);

    // Get AI Recommendations
    loadAiForecast(currentWeatherData);
  } catch (err) {
    api.showAlert('weatherAlertContainer', err.message || 'City not found', 'error');
  } finally {
    if (loading) loading.style.display = 'none';
    if (container) container.style.opacity = '1';
  }
}

function renderWeatherInspector(d) {
  document.getElementById('inspCity').textContent = `${d.city}, ${d.country}`;
  document.getElementById('inspTemp').textContent = formatTemp(d.temperature);
  document.getElementById('inspCondition').textContent = d.condition;
  document.getElementById('inspDesc').textContent = d.description;

  const liveBadge = document.getElementById('inspLiveBadge');
  if (liveBadge) {
    liveBadge.textContent = d.isRealTime ? `● Real-Time • ${d.source || 'Open-Meteo'}` : 'Simulated Data';
  }

  document.getElementById('inspFeels').textContent = formatTemp(d.feelsLike);
  document.getElementById('inspHumidity').textContent = `${d.humidity}%`;
  document.getElementById('inspWind').textContent = `${d.windSpeed} km/h (${d.windDirection})`;
  document.getElementById('inspPressure').textContent = `${d.pressure} hPa`;
  document.getElementById('inspVisibility').textContent = `${d.visibility} km`;
  document.getElementById('inspUv').textContent = `${d.uvIndex} UVI`;
  document.getElementById('inspSunrise').textContent = d.sunrise;
  document.getElementById('inspSunset').textContent = d.sunset;

  // Render 5-day list
  const list = document.getElementById('inspForecastList');
  if (list && d.dailyForecast) {
    list.innerHTML = d.dailyForecast.map((f) => `
      <div class="forecast-item">
        <div>
          <div class="forecast-date">${f.dayName}</div>
          <div class="forecast-cond">${f.date} • ${f.condition}</div>
        </div>
        <div class="forecast-temps">
          <span>${formatTemp(f.tempMax)}</span>
          <span class="temp-low"> / ${formatTemp(f.tempMin)}</span>
        </div>
      </div>
    `).join('');
  }
}

window.useMyLocationWeather = () => {
  if (!navigator.geolocation) {
    api.showAlert('weatherAlertContainer', 'Geolocation is not supported by your browser.', 'error');
    return;
  }
  api.showAlert('weatherAlertContainer', 'Detecting your GPS position for real-time weather...', 'info');
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const { latitude, longitude } = pos.coords;
      const loading = document.getElementById('weatherLoading');
      const container = document.getElementById('weatherDetailsContainer');
      try {
        if (loading) loading.style.display = 'block';
        if (container) container.style.opacity = '0.5';
        const res = await api.get(`/weather/coordinates?lat=${latitude}&lon=${longitude}`);
        if (!res.success || !res.data) throw new Error(res.message || 'Could not retrieve live weather');
        currentWeatherData = res.data;
        localStorage.setItem('weatherwise_last_city', currentWeatherData.city);

        const cityInput = document.getElementById('weatherCityInput');
        if (cityInput) cityInput.value = currentWeatherData.city;

        renderWeatherInspector(currentWeatherData);
        loadAiForecast(currentWeatherData);
        api.showAlert('weatherAlertContainer', `Live real-time weather loaded for ${currentWeatherData.city}!`, 'success');
      } catch (err) {
        api.showAlert('weatherAlertContainer', err.message, 'error');
      } finally {
        if (loading) loading.style.display = 'none';
        if (container) container.style.opacity = '1';
      }
    },
    (err) => {
      api.showAlert('weatherAlertContainer', `Location access denied (${err.message}).`, 'error');
    }
  );
};

async function loadAiForecast(d) {
  const summaryBox = document.getElementById('inspAiSummary');
  const recBox = document.getElementById('inspAiRec');

  if (summaryBox) summaryBox.textContent = 'Analyzing atmospheric patterns with Gemini...';
  if (recBox) recBox.textContent = 'Generating personalized activity advice...';

  try {
    const summaryRes = await api.post('/ai/summary', {
      city: d.city,
      temperature: d.temperature,
      condition: d.condition,
      humidity: d.humidity,
      windSpeed: d.windSpeed,
      pressure: d.pressure,
      visibility: d.visibility,
    });

    if (summaryRes.success && summaryBox) {
      summaryBox.textContent = summaryRes.summary;
    }

    const recRes = await api.post('/ai/recommendation', {
      city: d.city,
      temperature: d.temperature,
      condition: d.condition,
      humidity: d.humidity,
      windSpeed: d.windSpeed,
    });

    if (recRes.success && recBox) {
      recBox.textContent = recRes.recommendation;
    }
  } catch (e) {
    if (summaryBox) summaryBox.textContent = `Conditions in ${d.city} are currently ${d.condition.toLowerCase()} at ${formatTemp(d.temperature)}.`;
    if (recBox) recBox.textContent = 'Pack an extra layer and plan outdoor events during optimal temperature windows.';
  }
}
