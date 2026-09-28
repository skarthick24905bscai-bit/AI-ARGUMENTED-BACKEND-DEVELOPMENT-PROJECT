/**
 * AI WeatherWise - Complete Admin Dashboard Controller
 */

let allCategories = [];

document.addEventListener('DOMContentLoaded', () => {
  api.initNavbarUser();

  const user = api.getUser();
  if (!user || user.role !== 'admin') {
    alert('Access Denied: Admin authentication required.');
    window.location.href = '/login.html';
    return;
  }

  // Load initial tab
  switchAdminTab('overview');
  loadCategoriesCache();

  // Bind Post Creation Form
  const postForm = document.getElementById('adminPostForm');
  if (postForm) {
    postForm.addEventListener('submit', handleSavePost);
  }

  // Bind Category Form
  const catForm = document.getElementById('adminCategoryForm');
  if (catForm) {
    catForm.addEventListener('submit', handleSaveCategory);
  }
});

window.switchAdminTab = (tabName) => {
  document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
  document.querySelectorAll('.admin-tab-pane').forEach((p) => (p.style.display = 'none'));

  const activeBtn = document.getElementById(`tabBtn-${tabName}`);
  const activePane = document.getElementById(`tabPane-${tabName}`);

  if (activeBtn) activeBtn.classList.add('active');
  if (activePane) activePane.style.display = 'block';

  if (tabName === 'overview') loadOverviewMetrics();
  else if (tabName === 'posts') loadAdminPosts();
  else if (tabName === 'users') loadAdminUsers();
  else if (tabName === 'categories') loadAdminCategories();
  else if (tabName === 'comments') loadAdminComments();
};

// =========================================================================
// 1. Overview & System Health
// =========================================================================
async function loadOverviewMetrics() {
  try {
    const res = await api.get('/analytics');
    if (!res.success || !res.data) return;

    const { users, content, comments, activity, system } = res.data;

    // Stat numbers
    document.getElementById('statTotalUsers').textContent = users.total;
    document.getElementById('statActiveReaders').textContent = `${users.readers} Readers / ${users.admins} Admins`;

    document.getElementById('statTotalPosts').textContent = content.totalPosts;
    document.getElementById('statPublishedPosts').textContent = `${content.published} Published / ${content.draft} Drafts`;

    document.getElementById('statTotalComments').textContent = comments.total;
    document.getElementById('statPendingComments').textContent = `${comments.approved} Approved / ${comments.pending} Pending / ${comments.spam} Spam`;

    document.getElementById('statWeatherSearches').textContent = activity.weatherSearches;
    document.getElementById('statAiSummaries').textContent = `${activity.aiSummaries} AI Insights Generated`;

    // System health list
    const healthTable = document.getElementById('systemHealthTable');
    if (healthTable && system) {
      healthTable.innerHTML = `
        <tr>
          <td><strong>Database Engine</strong></td>
          <td>
            <span class="badge badge-success">${system.database}</span>
            ${system.databaseNote ? `<div style="font-size: 11px; color: var(--text-muted); margin-top: 5px; line-height: 1.4;">${system.databaseNote}</div>` : ''}
          </td>
        </tr>
        <tr><td><strong>AI Intelligence Engine</strong></td><td><span class="badge badge-info">${system.geminiAI}</span></td></tr>
        <tr><td><strong>Weather API Provider</strong></td><td><span class="badge badge-info">${system.weatherService}</span></td></tr>
        <tr><td><strong>Server Runtime</strong></td><td>Node.js ${system.nodeVersion}</td></tr>
        <tr><td><strong>Memory Utilization</strong></td><td>${system.memoryUsage}</td></tr>
        <tr><td><strong>Container Uptime</strong></td><td>${system.uptime} seconds</td></tr>
      `;
    }
  } catch (err) {
    api.showAlert('adminAlertContainer', 'Failed to load system analytics: ' + err.message, 'error');
  }
}

// =========================================================================
// 2. Post Management
// =========================================================================
async function loadAdminPosts() {
  const tableBody = document.getElementById('adminPostsTableBody');
  if (!tableBody) return;

  try {
    tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 20px;">Loading posts...</td></tr>`;
    const res = await api.get('/posts');

    if (!res.success || !res.data || res.data.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 20px;">No posts created yet.</td></tr>`;
      return;
    }

    tableBody.innerHTML = res.data.map((post) => {
      let badgeClass = 'badge-warning';
      if (post.status === 'Published') badgeClass = 'badge-success';
      else if (post.status === 'Draft') badgeClass = 'badge-info';

      return `
        <tr>
          <td><strong>${escapeHtml(post.title)}</strong></td>
          <td>${escapeHtml(post.category?.name || 'General')}</td>
          <td><span class="badge ${badgeClass}">${post.status}</span></td>
          <td>${post.views || 0}</td>
          <td>${new Date(post.createdAt).toLocaleDateString()}</td>
          <td>
            <div style="display: flex; gap: 6px;">
              <button onclick="openEditPostModal('${post._id}')" class="btn-secondary" style="padding: 4px 10px; font-size: 11px;">Edit</button>
              <button onclick="deleteAdminPost('${post._id}')" class="btn-danger" style="padding: 4px 10px; font-size: 11px;">Delete</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    tableBody.innerHTML = `<tr><td colspan="6" style="color: var(--danger); padding: 20px;">${err.message}</td></tr>`;
  }
}

async function loadCategoriesCache() {
  try {
    const res = await api.get('/categories');
    if (res.success && res.data) {
      allCategories = res.data;
      const select = document.getElementById('postCategorySelect');
      if (select) {
        select.innerHTML = `<option value="">Select Category</option>` +
          allCategories.map((c) => `<option value="${c._id}">${c.name}</option>`).join('');
      }
    }
  } catch (e) {}
}

window.openNewPostModal = () => {
  document.getElementById('postModalTitle').textContent = 'Create New Article';
  document.getElementById('editPostId').value = '';
  document.getElementById('postTitleInput').value = '';
  document.getElementById('postSummaryInput').value = '';
  document.getElementById('postContentInput').value = '';
  document.getElementById('postTagsInput').value = '';
  document.getElementById('postStatusSelect').value = 'Published';
  document.getElementById('postCategorySelect').value = allCategories[0]?._id || '';

  const modal = document.getElementById('postEditModal');
  if (modal) modal.classList.add('open');
};

window.openEditPostModal = async (id) => {
  try {
    const res = await api.get(`/posts/${id}`);
    if (!res.success || !res.data) return;
    const post = res.data;

    document.getElementById('postModalTitle').textContent = 'Edit Article';
    document.getElementById('editPostId').value = post._id;
    document.getElementById('postTitleInput').value = post.title;
    document.getElementById('postSummaryInput').value = post.summary || '';
    document.getElementById('postContentInput').value = post.content;
    document.getElementById('postTagsInput').value = (post.tags || []).join(', ');
    document.getElementById('postStatusSelect').value = post.status;
    document.getElementById('postCategorySelect').value = post.category?._id || '';

    const modal = document.getElementById('postEditModal');
    if (modal) modal.classList.add('open');
  } catch (err) {
    api.showAlert('adminAlertContainer', err.message, 'error');
  }
};

window.closePostModal = () => {
  const modal = document.getElementById('postEditModal');
  if (modal) modal.classList.remove('open');
};

async function handleSavePost(e) {
  e.preventDefault();
  const id = document.getElementById('editPostId').value;
  const title = document.getElementById('postTitleInput').value.trim();
  const summary = document.getElementById('postSummaryInput').value.trim();
  const content = document.getElementById('postContentInput').value.trim();
  const tags = document.getElementById('postTagsInput').value.trim();
  const status = document.getElementById('postStatusSelect').value;
  const category = document.getElementById('postCategorySelect').value;

  try {
    const payload = { title, summary, content, tags, status, category };
    if (id) {
      await api.put(`/posts/${id}`, payload);
      api.showAlert('adminAlertContainer', 'Post updated successfully', 'success');
    } else {
      await api.post('/posts', payload);
      api.showAlert('adminAlertContainer', 'New post created successfully', 'success');
    }
    closePostModal();
    loadAdminPosts();
  } catch (err) {
    api.showAlert('modalAlertContainer', err.message, 'error');
  }
}

window.deleteAdminPost = async (id) => {
  if (!confirm('Are you sure you want to delete this post?')) return;
  try {
    await api.delete(`/posts/${id}`);
    api.showAlert('adminAlertContainer', 'Post deleted', 'info');
    loadAdminPosts();
  } catch (err) {
    api.showAlert('adminAlertContainer', err.message, 'error');
  }
};

// =========================================================================
// 3. User Management
// =========================================================================
async function loadAdminUsers() {
  const tableBody = document.getElementById('adminUsersTableBody');
  if (!tableBody) return;

  try {
    tableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 20px;">Loading users...</td></tr>`;
    const res = await api.get('/users');

    if (!res.success || !res.data) return;

    tableBody.innerHTML = res.data.map((u) => {
      const isSuspended = u.status === 'suspended';
      return `
        <tr>
          <td><strong>${escapeHtml(u.name)}</strong></td>
          <td>${escapeHtml(u.email)}</td>
          <td>
            <span class="badge ${u.role === 'admin' ? 'badge-warning' : 'badge-info'}">${u.role}</span>
          </td>
          <td>
            <span class="badge ${isSuspended ? 'badge-danger' : 'badge-success'}">${u.status || 'active'}</span>
          </td>
          <td>
            <div style="display: flex; gap: 6px;">
              <button onclick="toggleUserRole('${u._id}', '${u.role}')" class="btn-secondary" style="padding: 4px 8px; font-size: 11px;">
                Make ${u.role === 'admin' ? 'Reader' : 'Admin'}
              </button>
              <button onclick="toggleUserStatus('${u._id}', '${u.status || 'active'}')" class="btn-secondary" style="padding: 4px 8px; font-size: 11px;">
                ${isSuspended ? 'Activate' : 'Suspend'}
              </button>
              <button onclick="deleteAdminUser('${u._id}')" class="btn-danger" style="padding: 4px 8px; font-size: 11px;">Delete</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    tableBody.innerHTML = `<tr><td colspan="5" style="color: var(--danger);">${err.message}</td></tr>`;
  }
}

window.toggleUserRole = async (userId, currentRole) => {
  const newRole = currentRole === 'admin' ? 'reader' : 'admin';
  try {
    await api.put(`/users/${userId}`, { role: newRole });
    loadAdminUsers();
  } catch (err) {
    api.showAlert('adminAlertContainer', err.message, 'error');
  }
};

window.toggleUserStatus = async (userId, currentStatus) => {
  const newStatus = currentStatus === 'suspended' ? 'active' : 'suspended';
  try {
    await api.put(`/users/${userId}`, { status: newStatus });
    loadAdminUsers();
  } catch (err) {
    api.showAlert('adminAlertContainer', err.message, 'error');
  }
};

window.deleteAdminUser = async (userId) => {
  if (!confirm('Permanently delete this user account?')) return;
  try {
    await api.delete(`/users/${userId}`);
    api.showAlert('adminAlertContainer', 'User account deleted', 'info');
    loadAdminUsers();
  } catch (err) {
    api.showAlert('adminAlertContainer', err.message, 'error');
  }
};

// =========================================================================
// 4. Category Management
// =========================================================================
async function loadAdminCategories() {
  const tableBody = document.getElementById('adminCategoriesTableBody');
  if (!tableBody) return;

  try {
    const res = await api.get('/categories');
    if (!res.success || !res.data) return;

    allCategories = res.data;
    tableBody.innerHTML = res.data.map((c) => `
      <tr>
        <td><strong>${escapeHtml(c.name)}</strong></td>
        <td><code>${c.slug}</code></td>
        <td>${escapeHtml(c.description || '—')}</td>
        <td>
          <button onclick="deleteAdminCategory('${c._id}')" class="btn-danger" style="padding: 4px 8px; font-size: 11px;">Delete</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tableBody.innerHTML = `<tr><td colspan="4" style="color: var(--danger);">${err.message}</td></tr>`;
  }
}

async function handleSaveCategory(e) {
  e.preventDefault();
  const name = document.getElementById('catNameInput').value.trim();
  const description = document.getElementById('catDescInput').value.trim();

  if (!name) return;

  try {
    await api.post('/categories', { name, description });
    document.getElementById('catNameInput').value = '';
    document.getElementById('catDescInput').value = '';
    api.showAlert('adminAlertContainer', 'Category added', 'success');
    loadAdminCategories();
    loadCategoriesCache();
  } catch (err) {
    api.showAlert('adminAlertContainer', err.message, 'error');
  }
}

window.deleteAdminCategory = async (id) => {
  if (!confirm('Delete this category?')) return;
  try {
    await api.delete(`/categories/${id}`);
    loadAdminCategories();
    loadCategoriesCache();
  } catch (err) {
    api.showAlert('adminAlertContainer', err.message, 'error');
  }
};

// =========================================================================
// 5. Comment Moderation
// =========================================================================
async function loadAdminComments() {
  const tableBody = document.getElementById('adminCommentsTableBody');
  if (!tableBody) return;

  try {
    tableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 20px;">Loading comments queue...</td></tr>`;
    const res = await api.get('/comments');

    if (!res.success || !res.data || res.data.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 20px;">No comments in system.</td></tr>`;
      return;
    }

    tableBody.innerHTML = res.data.map((c) => {
      let badgeClass = 'badge-success';
      if (c.status === 'Pending') badgeClass = 'badge-warning';
      else if (c.status === 'Spam') badgeClass = 'badge-danger';

      return `
        <tr>
          <td><strong>${escapeHtml(c.userName)}</strong></td>
          <td>${escapeHtml(c.content)}</td>
          <td>${escapeHtml(c.post?.title || 'Unknown Post')}</td>
          <td><span class="badge ${badgeClass}">${c.status}</span></td>
          <td>
            <div style="display: flex; gap: 6px;">
              <button onclick="moderateCommentStatus('${c._id}', 'Approved')" class="btn-secondary" style="padding: 4px 8px; font-size: 11px;">Approve</button>
              <button onclick="moderateCommentStatus('${c._id}', 'Spam')" class="btn-secondary" style="padding: 4px 8px; font-size: 11px;">Mark Spam</button>
              <button onclick="deleteAdminComment('${c._id}')" class="btn-danger" style="padding: 4px 8px; font-size: 11px;">Delete</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    tableBody.innerHTML = `<tr><td colspan="5" style="color: var(--danger);">${err.message}</td></tr>`;
  }
}

window.moderateCommentStatus = async (id, status) => {
  try {
    await api.put(`/comments/${id}`, { status });
    loadAdminComments();
  } catch (err) {
    api.showAlert('adminAlertContainer', err.message, 'error');
  }
};

window.deleteAdminComment = async (id) => {
  if (!confirm('Delete this comment?')) return;
  try {
    await api.delete(`/comments/${id}`);
    loadAdminComments();
  } catch (err) {
    api.showAlert('adminAlertContainer', err.message, 'error');
  }
};

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
