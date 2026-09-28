/**
 * AI WeatherWise - Dashboard Controller
 * Connects Weather, AI Summary, Forecast & Visualizers
 */

let currentWeatherData = null;
let currentCity = 'London';
let currentTempUnit = localStorage.getItem('weatherwise_unit') || 'C'; // 'C' or 'F'

function formatTemp(celsius) {
  if (celsius === undefined || celsius === null || isNaN(celsius)) return '--';
  if (currentTempUnit === 'F') {
    return `${Math.round((celsius * 9) / 5 + 32)}°F`;
  }
  return `${Math.round(celsius)}°C`;
}

function formatTempNum(celsius) {
  if (celsius === undefined || celsius === null || isNaN(celsius)) return 0;
  if (currentTempUnit === 'F') {
    return Math.round((celsius * 9) / 5 + 32);
  }
  return Math.round(celsius);
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
    renderWeatherHero(currentWeatherData);
    renderTemperatureTimeline(currentWeatherData);
    renderForecast(currentWeatherData.dailyForecast);
  }
};

document.addEventListener('DOMContentLoaded', () => {
  api.initNavbarUser();
  updateUnitToggleUI();

  // Parse URL query parameter if available (e.g. ?city=Tokyo)
  const urlParams = new URLSearchParams(window.location.search);
  const cityParam = urlParams.get('city');

  const user = api.getUser();
  const lastCity = localStorage.getItem('weatherwise_last_city');

  if (cityParam) {
    currentCity = cityParam;
  } else if (lastCity) {
    currentCity = lastCity;
  } else if (user && user.preferredLocation) {
    currentCity = user.preferredLocation;
  } else if (navigator.geolocation) {
    // Attempt graceful geolocation for first-time explorer
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        loadCoordinatesWeather(pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        loadCityWeather(currentCity);
      },
      { timeout: 3500 }
    );
    return;
  }

  // Bind Search Form & Worldwide Registered Location Autocomplete
  const searchForm = document.getElementById('searchForm');
  const searchInput = document.getElementById('searchInput');
  const searchContainer = document.querySelector('.search-container');

  if (searchInput && searchContainer) {
    api.setupLocationAutocomplete(searchInput, searchContainer, (loc) => {
      loadCoordinatesWeather(loc.latitude, loc.longitude, loc.name, loc.country || loc.admin1);
    });
  }

  if (searchForm) {
    searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const val = searchInput ? searchInput.value.trim() : '';
      if (val) {
        loadCityWeather(val);
      }
    });
  }

  // Load initial city weather
  loadCityWeather(currentCity);
});

async function loadCityWeather(city) {
  try {
    showDashboardLoading(true);
    currentCity = city;

    // 1. Fetch Weather Data
    const res = await api.get(`/weather/${encodeURIComponent(city)}`);
    if (!res.success || !res.data) {
      throw new Error(res.message || 'Failed to fetch weather data');
    }

    currentWeatherData = res.data;
    currentCity = currentWeatherData.city;
    localStorage.setItem('weatherwise_last_city', currentCity);

    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = currentCity;

    highlightQuickPill(currentCity);

    renderWeatherHero(currentWeatherData);
    renderAirQuality(currentWeatherData);
    renderTemperatureTimeline(currentWeatherData);
    renderSunArc(currentWeatherData);
    renderUvCard(currentWeatherData);
    renderForecast(currentWeatherData.dailyForecast);

    // 2. Fetch AI Insights in parallel
    fetchAiInsights(currentWeatherData);

    // Check if city is already in favorites
    checkFavoriteStatus(currentWeatherData.city);

  } catch (error) {
    api.showAlert('dashAlertContainer', error.message || 'Could not retrieve weather for this city.', 'error');
  } finally {
    showDashboardLoading(false);
  }
}

async function loadCoordinatesWeather(lat, lon, cityName, countryName) {
  try {
    showDashboardLoading(true);
    let url = `/weather/coordinates?lat=${lat}&lon=${lon}`;
    if (cityName) url += `&city=${encodeURIComponent(cityName)}`;
    if (countryName) url += `&country=${encodeURIComponent(countryName)}`;

    const res = await api.get(url);
    if (!res.success || !res.data) {
      throw new Error(res.message || 'Failed to fetch local weather');
    }

    currentWeatherData = res.data;
    currentCity = currentWeatherData.city;
    localStorage.setItem('weatherwise_last_city', currentCity);

    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      if (cityName && countryName) {
        searchInput.value = `${cityName}, ${countryName}`;
      } else {
        searchInput.value = currentWeatherData.city;
      }
    }

    highlightQuickPill(currentCity);

    renderWeatherHero(currentWeatherData);
    renderAirQuality(currentWeatherData);
    renderTemperatureTimeline(currentWeatherData);
    renderSunArc(currentWeatherData);
    renderUvCard(currentWeatherData);
    renderForecast(currentWeatherData.dailyForecast);

    fetchAiInsights(currentWeatherData);
    checkFavoriteStatus(currentWeatherData.city);

    api.showAlert('dashAlertContainer', `Live meteorological observation loaded for ${currentWeatherData.city}`, 'success');
  } catch (error) {
    api.showAlert('dashAlertContainer', error.message || 'Could not retrieve location weather', 'error');
  } finally {
    showDashboardLoading(false);
  }
}

function highlightQuickPill(city) {
  const pills = document.querySelectorAll('.toggle-pill-btn');
  pills.forEach((p) => {
    if (p.textContent.trim().toLowerCase() === city.toLowerCase()) {
      p.classList.add('active');
    } else if (!p.textContent.includes('Location')) {
      p.classList.remove('active');
    }
  });
}

window.detectUserLocation = () => {
  if (!navigator.geolocation) {
    api.showAlert('dashAlertContainer', 'Geolocation is not supported by your browser.', 'error');
    return;
  }

  api.showAlert('dashAlertContainer', 'Detecting your GPS position for real-time local weather...', 'info');

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      loadCoordinatesWeather(lat, lon);
    },
    (err) => {
      console.warn('Geolocation error:', err.message);
      api.showAlert('dashAlertContainer', `Location access denied or unavailable (${err.message}). Showing current search.`, 'error');
    },
    { timeout: 10000, enableHighAccuracy: true }
  );
};

window.refreshCurrentWeather = () => {
  if (currentWeatherData && currentWeatherData.latitude && currentWeatherData.longitude) {
    loadCoordinatesWeather(currentWeatherData.latitude, currentWeatherData.longitude);
  } else {
    loadCityWeather(currentCity);
  }
};

function renderWeatherHero(data) {
  const cityEl = document.getElementById('heroCityName');
  const tempEl = document.getElementById('heroTempLarge');
  const subTempEl = document.getElementById('heroTempSub');
  const condEl = document.getElementById('heroCondition');
  const pressureEl = document.getElementById('heroPressure');
  const visibilityEl = document.getElementById('heroVisibility');
  const humidityEl = document.getElementById('heroHumidity');
  const liveSourceEl = document.getElementById('heroLiveSource');
  const obsTimeEl = document.getElementById('heroObservationTime');

  if (cityEl) cityEl.textContent = `${data.city}, ${data.country}`;
  if (tempEl) tempEl.textContent = formatTemp(data.temperature);
  if (subTempEl) subTempEl.textContent = `Min ${formatTemp(data.tempMin)} / Max ${formatTemp(data.tempMax)} • Feels like ${formatTemp(data.feelsLike)}`;
  if (condEl) condEl.textContent = data.condition;
  if (pressureEl) pressureEl.textContent = `${data.pressure} hPa`;
  if (visibilityEl) visibilityEl.textContent = `${data.visibility} km`;
  if (humidityEl) humidityEl.textContent = `${data.humidity}%`;

  if (liveSourceEl) {
    liveSourceEl.textContent = data.isRealTime ? 'Live Real-Time Data' : 'Estimated Data';
  }
  if (obsTimeEl) {
    let timeStr = 'Live';
    if (data.observedAt && data.observedAt.includes('T')) {
      const timePart = data.observedAt.split('T')[1];
      const [h, m] = timePart.split(':');
      const hour = parseInt(h, 10);
      const ampm = hour >= 12 ? 'pm' : 'am';
      const h12 = hour % 12 || 12;
      timeStr = `${h12}:${m} ${ampm}`;
    }
    obsTimeEl.textContent = `Observed at ${timeStr} • ${data.source || 'Open-Meteo'}`;
  }

  // Side bar header
  const sideCity = document.getElementById('sideCity');
  const sideSub = document.getElementById('sideSub');
  const sideTemp = document.getElementById('sideTemp');
  if (sideCity) sideCity.textContent = data.city;
  if (sideSub) sideSub.textContent = `${data.condition} • ${data.country}`;
  if (sideTemp) sideTemp.textContent = formatTemp(data.temperature);
}

function renderAirQuality(data) {
  const aqiVal = document.getElementById('aqiVal');
  const aqiBadge = document.getElementById('aqiBadge');
  const aqiPointer = document.getElementById('aqiPointer');
  const windText = document.getElementById('windText');

  const aqi = data.aqi || 42;
  if (aqiVal) aqiVal.textContent = aqi;

  let badgeText = 'Good';
  let badgeClass = 'badge-success';
  let pointerPos = Math.min(100, Math.max(5, (aqi / 200) * 100));

  if (aqi > 150) {
    badgeText = 'Hazardous';
    badgeClass = 'badge-danger';
  } else if (aqi > 80) {
    badgeText = 'Moderate';
    badgeClass = 'badge-warning';
  }

  if (aqiBadge) {
    aqiBadge.textContent = `AQI • ${badgeText}`;
    aqiBadge.className = `badge ${badgeClass}`;
  }

  if (aqiPointer) {
    aqiPointer.style.left = `${pointerPos}%`;
  }

  if (windText) {
    windText.textContent = `${data.windSpeed} km/h • ${data.windDirection}`;
  }
}

function renderTemperatureTimeline(data) {
  const slots = data.hourlyForecast && data.hourlyForecast.length > 0
    ? data.hourlyForecast
    : [
        { time: 'Now', temp: data.temperature, condition: data.condition },
        { time: 'In 2h', temp: data.temperature + 1, condition: data.condition },
        { time: 'In 4h', temp: data.temperature, condition: 'Partly Cloudy' },
        { time: 'In 6h', temp: data.temperature - 2, condition: 'Clear' },
      ];

  const nodesContainer = document.getElementById('tempNodes');
  if (!nodesContainer) return;

  nodesContainer.innerHTML = slots.map((s) => `
    <div class="node-slot">
      <div class="node-temp">${formatTemp(s.temp)}</div>
      <div class="node-time">${s.time}</div>
      ${s.condition ? `<div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">${s.condition}</div>` : ''}
    </div>
  `).join('');

  // Render SVG Spline with converted values
  renderTempSpline(slots.map((s) => formatTempNum(s.temp)));
}

function renderTempSpline(temps) {
  const svg = document.getElementById('tempSplineSvg');
  if (!svg || temps.length < 2) return;

  const min = Math.min(...temps) - 2;
  const max = Math.max(...temps) + 2;
  const range = max - min || 1;
  const height = 55;
  const width = 380;
  const step = width / (temps.length - 1);

  const points = temps.map((t, idx) => {
    const x = idx * step + 10;
    const y = height - ((t - min) / range) * (height - 15) + 8;
    return { x, y };
  });

  let pathD = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const mx = (p0.x + p1.x) / 2;
    pathD += ` C ${mx} ${p0.y}, ${mx} ${p1.y}, ${p1.x} ${p1.y}`;
  }

  const circles = points.map((p) => `
    <circle cx="${p.x}" cy="${p.y}" r="4" fill="#f97316" stroke="#ffffff" stroke-width="2" />
  `).join('');

  svg.innerHTML = `
    <path d="${pathD}" fill="none" stroke="#f97316" stroke-width="3" stroke-linecap="round" />
    ${circles}
  `;
}

function renderSunArc(data) {
  const sunriseEl = document.getElementById('sunriseTime');
  const sunsetEl = document.getElementById('sunsetTime');
  const sunIcon = document.getElementById('sunOrb');

  if (sunriseEl) sunriseEl.textContent = data.sunrise || '06:00 am';
  if (sunsetEl) sunsetEl.textContent = data.sunset || '06:45 pm';

  if (!sunIcon) return;

  let percent = 0.5;
  if (!data.isDay) {
    // Nocturnal / night time: place orb at resting dusk horizon
    percent = 0.05;
    sunIcon.setAttribute('fill', '#94a3b8');
  } else {
    sunIcon.setAttribute('fill', '#f97316');
    try {
      const parseHour = (str) => {
        if (!str) return 6;
        const m = str.match(/(\d+):(\d+)\s*(am|pm)?/i);
        if (!m) return 6;
        let h = parseInt(m[1], 10);
        const min = parseInt(m[2], 10);
        const ampm = (m[3] || '').toLowerCase();
        if (ampm === 'pm' && h < 12) h += 12;
        if (ampm === 'am' && h === 12) h = 0;
        return h + min / 60;
      };

      let nowHour = 12;
      if (data.observedAt && data.observedAt.includes('T')) {
        const timePart = data.observedAt.split('T')[1];
        const [h, min] = timePart.split(':');
        nowHour = parseInt(h, 10) + parseInt(min, 10) / 60;
      }

      const rise = parseHour(data.sunrise);
      const set = parseHour(data.sunset);
      const span = Math.max(1, set - rise);
      percent = (nowHour - rise) / span;
      percent = Math.max(0.08, Math.min(0.92, percent));
    } catch (e) {
      percent = 0.5;
    }
  }

  const angle = Math.PI * (1 - percent);
  const cx = 100 + 70 * Math.cos(angle);
  const cy = 80 - 70 * Math.sin(angle);
  sunIcon.setAttribute('cx', cx);
  sunIcon.setAttribute('cy', cy);
}

function renderUvCard(data) {
  const uvNum = document.getElementById('uvNum');
  const uvDesc = document.getElementById('uvDesc');
  const uv = data.uvIndex || 4;

  if (uvNum) uvNum.textContent = `${uv} UVI`;
  if (uvDesc) {
    if (uv > 7) uvDesc.textContent = 'Very High UV exposure. Sunscreen & hat advised.';
    else if (uv >= 3) uvDesc.textContent = 'Moderate risk of UV rays. Protection advised.';
    else uvDesc.textContent = 'Low UV exposure. Safe for most outdoor activities.';
  }
}

function renderForecast(forecastList) {
  const container = document.getElementById('forecastList');
  if (!container || !forecastList) return;

  container.innerHTML = forecastList.map((item) => `
    <div class="forecast-item">
      <div>
        <div class="forecast-date">${item.dayName}</div>
        <div class="forecast-cond">${item.date} • ${item.condition}</div>
      </div>
      <div class="forecast-temps">
        <span>${formatTemp(item.tempMax)}</span>
        <span class="temp-low"> / ${formatTemp(item.tempMin)}</span>
      </div>
    </div>
  `).join('');
}

async function fetchAiInsights(data) {
  const summaryBox = document.getElementById('aiSummaryText');
  const summarySource = document.getElementById('aiSummarySource');
  const recHeadline = document.getElementById('recHeadline');
  const recBody = document.getElementById('recBody');

  if (summaryBox) summaryBox.textContent = 'Generating Gemini meteorological analysis...';
  if (recBody) recBody.textContent = 'Consulting Gemini recommendations...';

  try {
    // 1. Summary
    const summaryRes = await api.post('/ai/summary', {
      city: data.city,
      temperature: data.temperature,
      condition: data.condition,
      humidity: data.humidity,
      windSpeed: data.windSpeed,
      pressure: data.pressure,
      visibility: data.visibility,
    });

    if (summaryRes.success) {
      if (summaryBox) summaryBox.textContent = summaryRes.summary;
      if (summarySource) summarySource.textContent = `Engine: ${summaryRes.data?.source || 'Gemini 3.8 Flash'}`;
    }

    // 2. Recommendation
    const recRes = await api.post('/ai/recommendation', {
      city: data.city,
      temperature: data.temperature,
      condition: data.condition,
      humidity: data.humidity,
      windSpeed: data.windSpeed,
    });

    if (recRes.success) {
      if (recHeadline) recHeadline.textContent = `${data.condition} • Activity Advisor`;
      if (recBody) recBody.textContent = recRes.recommendation;
    }
  } catch (err) {
    if (summaryBox) summaryBox.textContent = `Current meteorological conditions in ${data.city} are ${data.condition.toLowerCase()} at ${formatTemp(data.temperature)} with ${data.humidity}% humidity.`;
    if (recBody) recBody.textContent = 'Wear weather-appropriate clothing and check local forecasts before extended outdoor activities.';
  }
}

async function checkFavoriteStatus(city) {
  const btn = document.getElementById('favToggleBtn');
  if (!btn) return;

  const user = api.getUser();
  if (!user) {
    btn.style.display = 'none';
    return;
  }

  btn.style.display = 'inline-flex';
  btn.dataset.isFav = 'false';
  btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg> Save Favorite`;

  try {
    const res = await api.get('/locations');
    if (res.success && res.data) {
      const match = res.data.find((l) => l.city.toLowerCase() === city.toLowerCase());
      if (match) {
        btn.dataset.isFav = 'true';
        btn.dataset.favId = match._id;
        btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg> Saved in Favorites`;
      }
    }
  } catch (e) {}
}

window.toggleFavoriteCurrentCity = async () => {
  const btn = document.getElementById('favToggleBtn');
  if (!currentWeatherData) return;

  const user = api.getUser();
  if (!user) {
    window.location.href = '/login.html';
    return;
  }

  const isFav = btn.dataset.isFav === 'true';

  try {
    if (isFav) {
      const favId = btn.dataset.favId;
      if (favId) {
        await api.delete(`/locations/${favId}`);
        api.showAlert('dashAlertContainer', `${currentWeatherData.city} removed from favorites`, 'info');
      }
      btn.dataset.isFav = 'false';
      btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg> Save Favorite`;
    } else {
      const res = await api.post('/locations', {
        city: currentWeatherData.city,
        country: currentWeatherData.country,
      });
      if (res.success) {
        btn.dataset.isFav = 'true';
        btn.dataset.favId = res.data._id;
        btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg> Saved in Favorites`;
        api.showAlert('dashAlertContainer', `${currentWeatherData.city} added to your favorites!`, 'success');
      }
    }
  } catch (err) {
    api.showAlert('dashAlertContainer', err.message, 'error');
  }
};

window.quickSearchCity = (cityName) => {
  const searchInput = document.getElementById('searchInput');
  if (searchInput) searchInput.value = cityName;
  loadCityWeather(cityName);
};

function showDashboardLoading(isLoading) {
  const btn = document.getElementById('searchBtn');
  if (btn) btn.textContent = isLoading ? 'Loading...' : 'Search';
}
