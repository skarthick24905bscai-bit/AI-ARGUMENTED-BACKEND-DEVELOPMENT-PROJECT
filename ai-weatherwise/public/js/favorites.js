/**
 * AI WeatherWise - Favorite Locations Controller
 */

document.addEventListener('DOMContentLoaded', () => {
  api.initNavbarUser();

  const user = api.getUser();
  if (!user) {
    const container = document.getElementById('favoritesContainer');
    if (container) {
      container.innerHTML = `
        <div style="text-align: center; padding: 48px 20px;">
          <h2 style="font-size: 22px; font-weight: 700; margin-bottom: 12px;">Sign in to Save Favorites</h2>
          <p style="color: var(--text-muted); margin-bottom: 24px;">Create an account or log in to manage your personalized list of favorite global cities.</p>
          <a href="/login.html" class="btn-primary-action" style="max-width: 220px; margin: 0 auto; text-decoration: none;">Sign In</a>
        </div>
      `;
    }
    return;
  }

  loadFavorites();

  // Wire up worldwide registered location autocomplete for Favorites Modal
  const favCityInput = document.getElementById('favCityInput');
  const favCountryInput = document.getElementById('favCountryInput');
  if (favCityInput && favCityInput.parentElement) {
    api.setupLocationAutocomplete(favCityInput, favCityInput.parentElement, (loc) => {
      favCityInput.value = loc.name;
      if (favCountryInput) {
        favCountryInput.value = loc.country || loc.admin1 || '';
      }
    });
  }

  // Add Location Form
  const addForm = document.getElementById('addFavoriteForm');
  if (addForm) {
    addForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const city = document.getElementById('favCityInput').value.trim();
      const country = document.getElementById('favCountryInput').value.trim();

      if (!city) return;

      try {
        const res = await api.post('/locations', { city, country });
        if (res.success) {
          api.showAlert('favAlertContainer', `${city} added to your favorites!`, 'success');
          document.getElementById('favCityInput').value = '';
          document.getElementById('favCountryInput').value = '';
          closeAddModal();
          loadFavorites();
        }
      } catch (err) {
        api.showAlert('modalAlertContainer', err.message, 'error');
      }
    });
  }
});

async function loadFavorites() {
  const container = document.getElementById('favoritesContainer');
  if (!container) return;

  try {
    container.innerHTML = `<div style="padding: 30px; text-align: center; color: var(--text-muted);">Loading your saved cities...</div>`;

    const res = await api.get('/locations');
    if (!res.success || !res.data || res.data.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 48px 20px; border: 2px dashed var(--border-light); border-radius: var(--radius-xl); background: var(--bg-canvas);">
          <div style="font-size: 32px; margin-bottom: 12px;">🌍</div>
          <h3 style="font-size: 18px; font-weight: 700; margin-bottom: 8px;">No favorite locations yet</h3>
          <p style="color: var(--text-muted); font-size: 14px; margin-bottom: 20px;">Save the cities you care about to monitor weather conditions at a glance.</p>
          <button onclick="openAddModal()" class="btn-secondary" style="border-radius: var(--radius-pill);">+ Add Your First City</button>
        </div>
      `;
      return;
    }

    // Render cards with weather data
    container.innerHTML = `<div class="favorites-grid" id="favCardsGrid"></div>`;
    const grid = document.getElementById('favCardsGrid');

    for (const loc of res.data) {
      const card = document.createElement('div');
      card.className = 'favorite-card';
      card.id = `fav-card-${loc._id}`;
      card.innerHTML = `
        <div>
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <h3 style="font-size: 18px; font-weight: 700;">${loc.city}</h3>
              <p style="font-size: 13px; color: var(--text-muted);">${loc.country}</p>
            </div>
            <button onclick="deleteFavorite('${loc._id}', event)" class="btn-danger" style="padding: 4px 8px; font-size: 11px;">Remove</button>
          </div>
          <div id="weather-for-${loc._id}" style="margin: 18px 0;">
            <span style="font-size: 13px; color: var(--text-muted);">Fetching current metrics...</span>
          </div>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-light); padding-top: 12px; margin-top: 10px;">
          <span style="font-size: 12px; color: var(--primary); font-weight: 600;">View in Dashboard →</span>
        </div>
      `;

      card.addEventListener('click', (e) => {
        // Prevent trigger if delete was clicked
        if (e.target.closest('button')) return;
        window.location.href = `/dashboard.html?city=${encodeURIComponent(loc.city)}`;
      });

      grid.appendChild(card);

      // Async fetch preview weather for card
      fetchCardWeather(loc._id, loc.city);
    }
  } catch (err) {
    container.innerHTML = `<div class="alert-box alert-error">Error loading favorites: ${err.message}</div>`;
  }
}

async function fetchCardWeather(locId, city) {
  const el = document.getElementById(`weather-for-${locId}`);
  if (!el) return;

  try {
    const res = await api.get(`/weather/${encodeURIComponent(city)}`);
    if (res.success && res.data) {
      const d = res.data;
      el.innerHTML = `
        <div style="display: flex; align-items: baseline; justify-content: space-between;">
          <span style="font-size: 32px; font-weight: 800; color: var(--text-main);">${d.temperature}°C</span>
          <span class="badge badge-info" style="font-weight: 700;">${d.condition}</span>
        </div>
        <div style="font-size: 12px; color: var(--text-muted); margin-top: 6px;">
          Humidity: ${d.humidity}% • Wind: ${d.windSpeed} km/h
        </div>
      `;
    }
  } catch (e) {
    el.innerHTML = `<span style="font-size: 12px; color: var(--text-light);">Weather unavailable</span>`;
  }
}

window.deleteFavorite = async (id, event) => {
  if (event) event.stopPropagation();
  if (!confirm('Remove this city from your favorite locations?')) return;

  try {
    await api.delete(`/locations/${id}`);
    api.showAlert('favAlertContainer', 'City removed from favorites', 'info');
    loadFavorites();
  } catch (err) {
    api.showAlert('favAlertContainer', err.message, 'error');
  }
};

window.openAddModal = () => {
  const modal = document.getElementById('addFavModal');
  if (modal) modal.classList.add('open');
};

window.closeAddModal = () => {
  const modal = document.getElementById('addFavModal');
  if (modal) modal.classList.remove('open');
};
