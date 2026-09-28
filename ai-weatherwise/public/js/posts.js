/**
 * AI WeatherWise - Insights Blog & Comments Controller
 */

document.addEventListener('DOMContentLoaded', () => {
  api.initNavbarUser();

  // Check if we are on the single post page or posts list page
  const singlePostContainer = document.getElementById('singlePostContainer');
  const postsListContainer = document.getElementById('postsListContainer');

  if (singlePostContainer) {
    initSinglePost();
  } else if (postsListContainer) {
    initPostsList();
  }
});

// ==========================================
// Posts List Explorer
// ==========================================
async function initPostsList() {
  loadCategories();
  loadPosts();

  const searchInput = document.getElementById('postSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', debounce(() => {
      loadPosts();
    }, 400));
  }
}

async function loadCategories() {
  const container = document.getElementById('categoryFilters');
  if (!container) return;

  try {
    const res = await api.get('/categories');
    if (res.success && res.data) {
      container.innerHTML = `
        <button class="toggle-pill-btn active" onclick="filterByCategory('', this)">All Categories</button>
        ${res.data.map((c) => `
          <button class="toggle-pill-btn" onclick="filterByCategory('${c._id}', this)">${c.name}</button>
        `).join('')}
      `;
    }
  } catch (e) {}
}

let activeCategory = '';
window.filterByCategory = (catId, btnEl) => {
  activeCategory = catId;
  const buttons = document.querySelectorAll('#categoryFilters .toggle-pill-btn');
  buttons.forEach((b) => b.classList.remove('active'));
  if (btnEl) btnEl.classList.add('active');
  loadPosts();
};

async function loadPosts() {
  const container = document.getElementById('postsListContainer');
  const searchInput = document.getElementById('postSearchInput');
  const query = searchInput ? searchInput.value.trim() : '';

  try {
    container.innerHTML = `<div style="text-align: center; padding: 40px; color: var(--text-muted);">Loading articles...</div>`;

    let url = '/posts?';
    if (activeCategory) url += `category=${encodeURIComponent(activeCategory)}&`;
    if (query) url += `search=${encodeURIComponent(query)}&`;

    const res = await api.get(url);
    if (!res.success || !res.data || res.data.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 48px 20px; border: 2px dashed var(--border-light); border-radius: var(--radius-xl); background: var(--bg-canvas); grid-column: 1 / -1;">
          <h3 style="font-size: 18px; font-weight: 700; margin-bottom: 6px;">No meteorological articles found</h3>
          <p style="color: var(--text-muted); font-size: 14px;">Try searching for a different topic or select another category.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = res.data.map((post) => {
      const dateStr = post.publishedAt
        ? new Date(post.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : 'Recent';

      const catBadge = post.category ? `<span class="badge badge-info">${post.category.name}</span>` : '';
      const tagsHtml = (post.tags || []).map((t) => `<span class="tag-pill">#${t}</span>`).join('');

      return `
        <article class="post-card" onclick="window.location.href='/post.html?id=${post.slug || post._id}'" style="cursor: pointer;">
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              ${catBadge}
              <span style="font-size: 12px; color: var(--text-light);">${dateStr}</span>
            </div>
            <h2 class="post-card-title">${escapeHtml(post.title)}</h2>
            <p class="post-card-summary">${escapeHtml(post.summary || '')}</p>
            <div style="margin-top: 10px;">${tagsHtml}</div>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-light); padding-top: 14px; margin-top: 16px;">
            <span style="font-size: 13px; color: var(--text-muted); font-weight: 500;">By ${escapeHtml(post.author?.name || 'Editorial Team')}</span>
            <span style="font-size: 12px; color: var(--primary); font-weight: 600;">Read Article →</span>
          </div>
        </article>
      `;
    }).join('');
  } catch (err) {
    container.innerHTML = `<div class="alert-box alert-error">Error loading posts: ${err.message}</div>`;
  }
}

// ==========================================
// Single Post View & Comments
// ==========================================
let currentPostId = null;

async function initSinglePost() {
  const params = new URLSearchParams(window.location.search);
  const identifier = params.get('id');

  if (!identifier) {
    window.location.href = '/posts.html';
    return;
  }

  try {
    const res = await api.get(`/posts/${identifier}`);
    if (!res.success || !res.data) {
      throw new Error(res.message || 'Post not found');
    }

    const post = res.data;
    currentPostId = post._id;

    document.getElementById('postTitle').textContent = post.title;
    document.getElementById('postSummary').textContent = post.summary || '';
    document.getElementById('postAuthor').textContent = post.author?.name || 'Editorial Staff';
    document.getElementById('postDate').textContent = post.publishedAt
      ? new Date(post.publishedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      : 'Recently published';
    document.getElementById('postViews').textContent = `${post.views || 1} views`;

    if (post.category && document.getElementById('postCategoryBadge')) {
      document.getElementById('postCategoryBadge').textContent = post.category.name;
    }

    // Render Body Content (convert line breaks to readable paragraphs)
    const bodyEl = document.getElementById('postContentBody');
    if (bodyEl) {
      bodyEl.innerHTML = post.content
        .split('\n\n')
        .map((p) => `<p style="margin-bottom: 16px; line-height: 1.7; font-size: 16px; color: #1e293b;">${escapeHtml(p)}</p>`)
        .join('');
    }

    // Load Comments
    loadPostComments(currentPostId);

    // Bind Comment Form
    initCommentForm();
  } catch (err) {
    api.showAlert('postAlertContainer', err.message || 'Failed to load post', 'error');
  }
}

async function loadPostComments(postId) {
  const listEl = document.getElementById('commentsList');
  const countEl = document.getElementById('commentsCount');
  if (!listEl) return;

  try {
    const res = await api.get(`/comments/post/${postId}`);
    if (res.success && res.data) {
      if (countEl) countEl.textContent = `(${res.data.length})`;

      if (res.data.length === 0) {
        listEl.innerHTML = `<div style="color: var(--text-muted); font-size: 14px; padding: 16px 0;">No comments yet. Share your thoughts below!</div>`;
        return;
      }

      listEl.innerHTML = res.data.map((c) => `
        <div style="background: var(--bg-canvas); border: 1px solid var(--border-light); border-radius: var(--radius-lg); padding: 18px; margin-bottom: 14px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-weight: 700; font-size: 14px; color: var(--text-main);">${escapeHtml(c.userName)}</span>
              ${c.user?.role === 'admin' ? '<span class="badge badge-warning" style="font-size: 10px;">Admin</span>' : ''}
            </div>
            <span style="font-size: 12px; color: var(--text-light);">${new Date(c.createdAt).toLocaleDateString()}</span>
          </div>
          <p style="font-size: 14px; color: #334155; line-height: 1.6;">${escapeHtml(c.content)}</p>
        </div>
      `).join('');
    }
  } catch (e) {
    listEl.innerHTML = `<div style="color: var(--danger); font-size: 13px;">Unable to load comments.</div>`;
  }
}

function initCommentForm() {
  const form = document.getElementById('commentForm');
  const authPrompt = document.getElementById('commentAuthPrompt');
  const user = api.getUser();

  if (!user) {
    if (form) form.style.display = 'none';
    if (authPrompt) authPrompt.style.display = 'block';
    return;
  }

  if (form) {
    form.style.display = 'block';
    if (authPrompt) authPrompt.style.display = 'none';

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const contentInput = document.getElementById('commentContentInput');
      const content = contentInput.value.trim();

      if (!content || !currentPostId) return;

      try {
        const res = await api.post('/comments', { postId: currentPostId, content });
        if (res.success) {
          contentInput.value = '';
          api.showAlert('commentAlertContainer', 'Comment posted!', 'success');
          loadPostComments(currentPostId);
        }
      } catch (err) {
        api.showAlert('commentAlertContainer', err.message || 'Error posting comment', 'error');
      }
    });
  }
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
