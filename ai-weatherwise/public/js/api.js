/**
 * AI WeatherWise - Central API Client & Auth State Management
 */

const API_BASE = '/api';

const api = {
  // Token & User Persistence
  getToken() {
    return localStorage.getItem('weatherwise_token');
  },

  setToken(token) {
    localStorage.setItem('weatherwise_token', token);
  },

  getUser() {
    try {
      const u = localStorage.getItem('weatherwise_user');
      return u ? JSON.parse(u) : null;
    } catch (e) {
      return null;
    }
  },

  setUser(user) {
    localStorage.setItem('weatherwise_user', JSON.stringify(user));
  },

  logout() {
    localStorage.removeItem('weatherwise_token');
    localStorage.removeItem('weatherwise_user');
    window.location.href = '/login.html';
  },

  // Base Request Method
  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/register')) {
          // Token expired or invalid
          this.logout();
        }
        throw new Error(data.message || `Request failed with status ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error.message);
      throw error;
    }
  },

  // HTTP Helper Methods
  get(endpoint, options = {}) {
    return this.request(endpoint, { method: 'GET', ...options });
  },

  post(endpoint, body, options = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
      ...options,
    });
  },

  put(endpoint, body, options = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
      ...options,
    });
  },

  delete(endpoint, options = {}) {
    return this.request(endpoint, { method: 'DELETE', ...options });
  },

  // Notification helper
  showAlert(containerId, message, type = 'error') {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = `
      <div class="alert-box alert-${type}">
        <span>${message}</span>
      </div>
    `;
    setTimeout(() => {
      if (container && container.innerHTML.includes(message)) {
        container.innerHTML = '';
      }
    }, 5000);
  },

  // Update navbar user profile state
  initNavbarUser() {
    const user = this.getUser();
    const nameEl = document.getElementById('navbarUserName');
    const roleEl = document.getElementById('navbarUserRole');
    const avatarEl = document.getElementById('navbarUserAvatar');
    const adminLink = document.getElementById('navAdminLink');

    if (user) {
      if (nameEl) nameEl.textContent = user.name;
      if (roleEl) roleEl.textContent = user.role.toUpperCase();
      if (avatarEl) avatarEl.textContent = user.name.charAt(0).toUpperCase();
      if (adminLink) {
        adminLink.style.display = user.role === 'admin' ? 'flex' : 'none';
      }
    } else {
      if (nameEl) nameEl.textContent = 'Guest Visitor';
      if (roleEl) roleEl.textContent = 'Sign In';
      if (avatarEl) avatarEl.textContent = 'G';
      if (adminLink) adminLink.style.display = 'none';
    }
  },

  // Setup Worldwide Registered Location Autocomplete Dropdown
  setupLocationAutocomplete(inputEl, parentEl, onSelect) {
    if (!inputEl || !parentEl) return;

    let dropdown = parentEl.querySelector('.location-suggestions-dropdown');
    if (!dropdown) {
      dropdown = document.createElement('div');
      dropdown.className = 'location-suggestions-dropdown';
      dropdown.style.display = 'none';
      parentEl.appendChild(dropdown);
    }

    let debounceTimer = null;
    let activeIndex = -1;
    let currentResults = [];

    const closeDropdown = () => {
      dropdown.style.display = 'none';
      dropdown.innerHTML = '';
      activeIndex = -1;
      currentResults = [];
    };

    const renderItems = (items) => {
      currentResults = items;
      activeIndex = -1;
      dropdown.innerHTML = '';

      if (!items || items.length === 0) {
        dropdown.innerHTML = `<div class="suggestion-empty">No registered worldwide location found</div>`;
        dropdown.style.display = 'block';
        return;
      }

      items.forEach((item, index) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'suggestion-item';
        btn.dataset.index = index;

        const sub = [item.admin1, item.country].filter(Boolean).join(', ');
        const latStr = Math.abs(item.latitude).toFixed(2) + '°' + (item.latitude >= 0 ? 'N' : 'S');
        const lonStr = Math.abs(item.longitude).toFixed(2) + '°' + (item.longitude >= 0 ? 'E' : 'W');

        btn.innerHTML = `
          <div class="suggestion-item-main">
            <div class="suggestion-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"></path><circle cx="12" cy="10" r="3"></circle></svg>
            </div>
            <div class="suggestion-text">
              <span class="suggestion-name">${item.name}</span>
              <span class="suggestion-sub">${sub || 'Global Location'}</span>
            </div>
          </div>
          <div class="suggestion-meta">
            ${item.countryCode ? `<span class="suggestion-badge">${item.countryCode}</span>` : ''}
            <span class="suggestion-badge" style="font-size: 10px;">${latStr}, ${lonStr}</span>
          </div>
        `;

        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          selectLocation(item);
        });

        dropdown.appendChild(btn);
      });

      dropdown.style.display = 'block';
    };

    const selectLocation = (item) => {
      inputEl.value = item.name;
      closeDropdown();
      if (typeof onSelect === 'function') {
        onSelect(item);
      }
    };

    inputEl.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      const query = inputEl.value.trim();
      if (query.length < 2) {
        closeDropdown();
        return;
      }

      debounceTimer = setTimeout(async () => {
        try {
          const res = await api.get(`/weather/search/locations?q=${encodeURIComponent(query)}`);
          if (res.success && Array.isArray(res.data)) {
            renderItems(res.data);
          }
        } catch (err) {
          console.warn('[LocationAutocomplete] Search error:', err.message);
        }
      }, 250);
    });

    inputEl.addEventListener('keydown', (e) => {
      const items = dropdown.querySelectorAll('.suggestion-item');
      if (dropdown.style.display === 'none' || items.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        activeIndex = (activeIndex + 1) % items.length;
        updateActiveItem(items);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        activeIndex = (activeIndex - 1 + items.length) % items.length;
        updateActiveItem(items);
      } else if (e.key === 'Enter' && activeIndex >= 0) {
        e.preventDefault();
        e.stopPropagation();
        if (currentResults[activeIndex]) {
          selectLocation(currentResults[activeIndex]);
        }
      } else if (e.key === 'Escape') {
        closeDropdown();
      }
    });

    const updateActiveItem = (items) => {
      items.forEach((it, idx) => {
        if (idx === activeIndex) {
          it.classList.add('active');
          it.scrollIntoView({ block: 'nearest' });
        } else {
          it.classList.remove('active');
        }
      });
    };

    document.addEventListener('click', (e) => {
      if (!parentEl.contains(e.target)) {
        closeDropdown();
      }
    });
  }
};

window.api = api;
