/**
 * KeebForge Admin Panel JavaScript
 * Handles authentication, CRUD operations, WYSIWYG editor, image management, and UI interactions
 */

(function() {
  'use strict';

  // =========================================
  // Configuration
  // =========================================
  const API_BASE = window.location.hostname === 'localhost' 
    ? 'http://localhost:3001/api' 
    : '/api';
  
  // State
  let currentScreen = 'login';
  let posts = [];
  let categories = [];
  let editingPost = null;
  let editingCategory = null;
  let tinyEditor = null;
  let readTimeManualOverride = false;

  // =========================================
  // Utility Functions
  // =========================================
  
  function $(selector) {
    return document.querySelector(selector);
  }

  function $$(selector) {
    return document.querySelectorAll(selector);
  }

  function showScreen(screenId) {
    $$('.screen').forEach(s => s.classList.remove('active'));
    $(`#${screenId}-screen`).classList.add('active');
    currentScreen = screenId;

    // Initialize TinyMCE when entering editor
    if (screenId === 'editor') {
      initTinyMCE();
    } else {
      destroyTinyMCE();
    }
  }

  function showToast(message, type = 'info') {
    const container = $('#toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  function formatDate(dateString) {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  function formatDateTime(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    // Format for datetime-local input
    const pad = n => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  function slugify(text) {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function getPostStatus(post) {
    if (post.status === 'draft') return 'draft';
    if (post.publishDate && new Date(post.publishDate) > new Date()) return 'scheduled';
    return 'published';
  }

  async function api(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const config = {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
      config.body = JSON.stringify(options.body);
    }

    // For FormData, remove Content-Type to let browser set boundary
    if (options.body instanceof FormData) {
      delete config.headers['Content-Type'];
      config.body = options.body;
    }

    try {
      const response = await fetch(url, config);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Request failed');
      }
      
      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // =========================================
  // Theme Management
  // =========================================
  
  function initTheme() {
    const saved = localStorage.getItem('admin-theme');
    if (saved) {
      document.documentElement.setAttribute('data-theme', saved);
    }
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('admin-theme', next);
  }

  // =========================================
  // TinyMCE WYSIWYG Editor
  // =========================================

  function initTinyMCE() {
    if (tinyEditor) return; // Already initialized

    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';

    tinymce.init({
      selector: '#post-content',
      height: 500,
      menubar: 'file edit insert view format table',
      plugins: [
        'advlist', 'autolink', 'lists', 'link', 'image', 'charmap',
        'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
        'insertdatetime', 'media', 'table', 'help', 'wordcount',
        'codesample', 'emoticons'
      ],
      toolbar: 'undo redo | blocks | bold italic underline strikethrough | ' +
        'alignleft aligncenter alignright alignjustify | ' +
        'bullist numlist outdent indent | link image codesample | ' +
        'table emoticons | removeformat code fullscreen help',
      skin: isDark ? 'oxide-dark' : 'oxide',
      content_css: isDark ? 'dark' : 'default',
      content_style: 'body { font-family: Inter, -apple-system, sans-serif; font-size: 16px; line-height: 1.7; }',
      image_title: true,
      automatic_uploads: false,
      file_picker_types: 'image',
      file_picker_callback: function(callback, value, meta) {
        openImageLibrary(function(imageUrl) {
          callback(imageUrl, { alt: '' });
        });
      },
      setup: function(editor) {
        tinyEditor = editor;
        editor.on('input change keyup', updateEditorStats);
        editor.on('init', updateEditorStats);
      },
      promotion: false,
      branding: false
    });
  }

  function destroyTinyMCE() {
    if (tinyEditor) {
      tinymce.remove('#post-content');
      tinyEditor = null;
    }
  }

  function getEditorContent() {
    if (tinyEditor) {
      return tinyEditor.getContent();
    }
    return $('#post-content').value;
  }

  function setEditorContent(content) {
    if (tinyEditor) {
      tinyEditor.setContent(content || '');
    } else {
      $('#post-content').value = content || '';
    }
  }

  // =========================================
  // Word Count & Read Time
  // =========================================

  function updateEditorStats() {
    let text = '';
    if (tinyEditor) {
      text = tinyEditor.getContent({ format: 'text' }) || '';
    } else {
      text = ($('#post-content').value || '').replace(/<[^>]*>/g, '');
    }

    const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;
    const chars = text.length;
    const readMin = Math.max(1, Math.ceil(words / 200));

    $('#stat-words').textContent = `${words} word${words !== 1 ? 's' : ''}`;
    $('#stat-chars').textContent = `${chars} character${chars !== 1 ? 's' : ''}`;
    $('#stat-readtime').textContent = `~${readMin} min read`;

    // Auto-fill read time unless manually overridden
    if (!readTimeManualOverride) {
      $('#post-readtime').value = `${readMin} min`;
    }
  }

  // =========================================
  // Authentication
  // =========================================
  
  async function checkAuth() {
    try {
      const data = await api('/auth/check');
      if (data.authenticated) {
        showScreen('dashboard');
        loadDashboardData();
      } else {
        showScreen('login');
      }
    } catch (error) {
      showScreen('login');
    }
  }

  async function login(username, password) {
    const btn = $('#login-btn');
    const error = $('#login-error');
    
    btn.classList.add('loading');
    error.textContent = '';
    
    try {
      await api('/auth/login', {
        method: 'POST',
        body: { username, password }
      });
      
      showScreen('dashboard');
      loadDashboardData();
      showToast('Welcome back!', 'success');
    } catch (err) {
      error.textContent = err.message || 'Invalid credentials';
    } finally {
      btn.classList.remove('loading');
    }
  }

  async function logout() {
    try {
      await api('/auth/logout', { method: 'POST' });
    } catch (e) {
      // Ignore errors
    }
    showScreen('login');
    showToast('Logged out', 'info');
  }

  // =========================================
  // Dashboard Data
  // =========================================
  
  async function loadDashboardData() {
    await Promise.all([
      loadStats(),
      loadPosts(),
      loadCategories()
    ]);
  }

  async function loadStats() {
    try {
      const data = await api('/stats');
      $('#stat-posts').textContent = data.stats.totalPosts;
      $('#stat-published').textContent = data.stats.published;
      $('#stat-drafts').textContent = data.stats.drafts;
      $('#stat-scheduled').textContent = data.stats.scheduled || 0;
      $('#stat-categories').textContent = data.stats.categories;
    } catch (error) {
      showToast('Failed to load stats', 'error');
    }
  }

  async function loadPosts() {
    try {
      const data = await api('/posts');
      posts = data.posts || [];
      renderPostsTable();
    } catch (error) {
      showToast('Failed to load posts', 'error');
    }
  }

  async function loadCategories() {
    try {
      const data = await api('/categories');
      categories = data.categories || [];
      renderCategoriesTable();
      updateCategoryDropdowns();
    } catch (error) {
      showToast('Failed to load categories', 'error');
    }
  }

  // =========================================
  // Posts Table (with sorting)
  // =========================================
  
  function renderPostsTable() {
    const tbody = $('#posts-tbody');
    const searchTerm = ($('#posts-search').value || '').toLowerCase();
    const categoryFilter = $('#posts-filter').value;
    const sortValue = $('#posts-sort').value || 'updatedAt-desc';
    
    let filtered = posts.filter(post => {
      const matchesSearch = post.title.toLowerCase().includes(searchTerm) ||
                           (post.excerpt || '').toLowerCase().includes(searchTerm);
      const matchesCategory = !categoryFilter || post.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });

    // Sort
    const [sortField, sortDir] = sortValue.split('-');
    filtered.sort((a, b) => {
      let va, vb;
      if (sortField === 'title') {
        va = a.title.toLowerCase();
        vb = b.title.toLowerCase();
      } else if (sortField === 'publishDate') {
        va = a.publishDate || a.createdAt || '';
        vb = b.publishDate || b.createdAt || '';
      } else if (sortField === 'status') {
        va = getPostStatus(a);
        vb = getPostStatus(b);
      } else {
        va = a.updatedAt || '';
        vb = b.updatedAt || '';
      }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="loading">No posts found</td></tr>';
      return;
    }

    tbody.innerHTML = filtered.map(post => {
      const displayStatus = getPostStatus(post);
      return `
      <tr data-slug="${post.slug}">
        <td>
          <strong>${escapeHtml(post.title)}</strong>
          <br><small style="color: var(--text-dim)">${escapeHtml((post.excerpt || '').substring(0, 60))}...</small>
        </td>
        <td>
          <span class="color-dot" style="background: ${getCategoryColor(post.category)}"></span>
          ${escapeHtml(post.categoryName || post.category)}
        </td>
        <td>
          <span class="status-badge status-badge--${displayStatus}">${displayStatus}</span>
        </td>
        <td>${formatDate(post.publishDate)}</td>
        <td>${formatDate(post.updatedAt)}</td>
        <td>
          <div class="table-actions">
            <button class="btn btn--sm btn--secondary" onclick="editPost('${post.slug}')">Edit</button>
            <button class="btn btn--sm btn--ghost" onclick="confirmDeletePost('${post.slug}')">Delete</button>
          </div>
        </td>
      </tr>
    `;
    }).join('');
  }

  function getCategoryColor(categoryId) {
    const cat = categories.find(c => c.id === categoryId);
    return cat ? cat.color : '#6B7280';
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  }

  // =========================================
  // Categories Table
  // =========================================
  
  function renderCategoriesTable() {
    const tbody = $('#categories-tbody');

    if (categories.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="loading">No categories found</td></tr>';
      return;
    }

    tbody.innerHTML = categories.map(cat => {
      const postCount = posts.filter(p => p.category === cat.id).length;
      return `
        <tr data-id="${cat.id}">
          <td><strong>${escapeHtml(cat.name)}</strong></td>
          <td><code>${cat.slug}</code></td>
          <td><span class="color-dot" style="background: ${cat.color}"></span>${cat.color}</td>
          <td>${postCount}</td>
          <td>
            <div class="table-actions">
              <button class="btn btn--sm btn--secondary" onclick="editCategory('${cat.id}')">Edit</button>
              <button class="btn btn--sm btn--ghost" onclick="deleteCategory('${cat.id}')" ${postCount > 0 ? 'disabled title="Has posts"' : ''}>Delete</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  function updateCategoryDropdowns() {
    const selects = $$('#post-category, #posts-filter');
    
    selects.forEach(select => {
      const isFilter = select.id === 'posts-filter';
      select.innerHTML = isFilter ? '<option value="">All Categories</option>' : '';
      
      categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.id;
        option.textContent = cat.name;
        select.appendChild(option);
      });
    });
  }

  // =========================================
  // Post Editor
  // =========================================
  
  function newPost() {
    editingPost = null;
    readTimeManualOverride = false;
    $('#editor-title').textContent = 'New Post';
    $('#post-form').reset();
    $('#post-id').value = '';
    $('#post-author').value = 'KeebForge Editorial';
    $('#post-publishdate').value = '';
    $('#takeaways-list').innerHTML = '';
    $('#faqs-list').innerHTML = '';
    showScreen('editor');
    // Clear TinyMCE after init
    setTimeout(() => setEditorContent(''), 300);
  }

  window.editPost = async function(slug) {
    const post = posts.find(p => p.slug === slug);
    if (!post) {
      showToast('Post not found', 'error');
      return;
    }

    editingPost = post;
    readTimeManualOverride = false;
    $('#editor-title').textContent = 'Edit Post';
    
    // Fill form
    $('#post-id').value = post.id;
    $('#post-title').value = post.title;
    $('#post-slug').value = post.slug;
    $('#post-category').value = post.category;
    $('#post-excerpt').value = post.excerpt || '';
    $('#post-summary').value = post.summary || '';
    $('#post-readtime').value = post.readTime || '';
    $('#post-author').value = post.author || 'KeebForge Editorial';
    $('#post-tags').value = (post.tags || []).join(', ');
    $('#post-publishdate').value = formatDateTime(post.publishDate);
    
    // Fill takeaways
    const takeawaysList = $('#takeaways-list');
    takeawaysList.innerHTML = '';
    (post.keyTakeaways || []).forEach(t => addTakeaway(t));
    
    // Fill FAQs
    const faqsList = $('#faqs-list');
    faqsList.innerHTML = '';
    (post.faqs || []).forEach(f => addFaq(f.question, f.answer));
    
    showScreen('editor');
    // Set content in TinyMCE after init
    setTimeout(() => {
      setEditorContent(post.content || '');
      updateEditorStats();
    }, 300);
  };

  function addTakeaway(value = '') {
    const list = $('#takeaways-list');
    const item = document.createElement('div');
    item.className = 'dynamic-item';
    item.innerHTML = `
      <input type="text" class="takeaway-input" value="${escapeHtml(value)}" placeholder="Key takeaway...">
      <button type="button" class="btn btn--icon btn--ghost" onclick="this.parentElement.remove()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M18 6L6 18M6 6l12 12"/></svg>
      </button>
    `;
    list.appendChild(item);
  }

  function addFaq(question = '', answer = '') {
    const list = $('#faqs-list');
    const item = document.createElement('div');
    item.className = 'faq-item';
    item.innerHTML = `
      <input type="text" class="faq-question" value="${escapeHtml(question)}" placeholder="Question...">
      <textarea class="faq-answer" placeholder="Answer...">${escapeHtml(answer)}</textarea>
      <button type="button" class="btn btn--sm btn--ghost" onclick="this.parentElement.remove()">Remove</button>
    `;
    list.appendChild(item);
  }

  function collectFormData() {
    const takeaways = Array.from($$('.takeaway-input'))
      .map(input => input.value.trim())
      .filter(v => v);

    const faqs = Array.from($$('.faq-item')).map(item => ({
      question: item.querySelector('.faq-question').value.trim(),
      answer: item.querySelector('.faq-answer').value.trim()
    })).filter(f => f.question && f.answer);

    const category = $('#post-category').value;
    const categoryObj = categories.find(c => c.id === category);

    const publishDateVal = $('#post-publishdate').value;

    return {
      title: $('#post-title').value.trim(),
      slug: $('#post-slug').value.trim(),
      category: category,
      categoryName: categoryObj ? categoryObj.name : 'General',
      excerpt: $('#post-excerpt').value.trim(),
      summary: $('#post-summary').value.trim(),
      content: getEditorContent(),
      contentFormat: 'html',
      keyTakeaways: takeaways,
      faqs: faqs,
      readTime: $('#post-readtime').value.trim() || '5 min',
      author: $('#post-author').value.trim() || 'KeebForge Editorial',
      tags: $('#post-tags').value.split(',').map(t => t.trim()).filter(t => t),
      publishDate: publishDateVal ? new Date(publishDateVal).toISOString() : null
    };
  }

  async function savePost(status = 'draft') {
    const data = collectFormData();
    data.status = status;

    // If scheduled (future date), keep status as published but the generator will handle it
    if (status === 'published' && data.publishDate && new Date(data.publishDate) > new Date()) {
      data.status = 'published'; // Server will check date during generation
    }

    if (!data.title || !data.slug) {
      showToast('Title and slug are required', 'error');
      return;
    }

    try {
      if (editingPost) {
        await api(`/posts/${editingPost.slug}`, {
          method: 'PUT',
          body: data
        });
        showToast('Post updated', 'success');
      } else {
        await api('/posts', {
          method: 'POST',
          body: data
        });
        showToast('Post created', 'success');
      }

      await loadPosts();
      await loadStats();
      showScreen('dashboard');
    } catch (error) {
      showToast(error.message || 'Failed to save post', 'error');
    }
  }

  window.confirmDeletePost = function(slug) {
    const modal = $('#delete-post-modal');
    modal.classList.add('active');
    
    $('#confirm-delete-post').onclick = async () => {
      try {
        await api(`/posts/${slug}`, { method: 'DELETE' });
        showToast('Post deleted', 'success');
        await loadPosts();
        await loadStats();
        modal.classList.remove('active');
        
        if (currentScreen === 'editor') {
          showScreen('dashboard');
        }
      } catch (error) {
        showToast(error.message || 'Failed to delete post', 'error');
      }
    };
  };

  function previewPost() {
    const slug = $('#post-slug').value.trim();
    if (!slug) {
      showToast('Please enter a slug first', 'error');
      return;
    }
    const baseUrl = window.location.origin;
    const previewUrl = `${baseUrl}/keebforge/posts/${slug}/`;
    window.open(previewUrl, '_blank');
  }

  // =========================================
  // Image Management
  // =========================================

  let imagePickerCallback = null;

  function openImageLibrary(callback) {
    imagePickerCallback = callback || null;
    $('#image-modal').classList.add('active');
    loadImages();
  }

  async function loadImages() {
    const grid = $('#image-grid');
    grid.innerHTML = '<p class="image-grid__empty">Loading...</p>';

    try {
      const data = await api('/images');
      const images = data.images || [];

      if (images.length === 0) {
        grid.innerHTML = '<p class="image-grid__empty">No images uploaded yet</p>';
        return;
      }

      grid.innerHTML = images.map(img => `
        <div class="image-card" data-url="${escapeHtml(img.url)}">
          <div class="image-card__preview">
            <img src="${escapeHtml(img.url)}" alt="${escapeHtml(img.name)}" loading="lazy">
          </div>
          <div class="image-card__info">
            <span class="image-card__name" title="${escapeHtml(img.name)}">${escapeHtml(img.name)}</span>
            <span class="image-card__size">${formatFileSize(img.size)}</span>
          </div>
          <div class="image-card__actions">
            ${imagePickerCallback ? `<button class="btn btn--sm btn--primary" onclick="insertImage('${escapeHtml(img.url)}')">Insert</button>` : ''}
            <button class="btn btn--sm btn--ghost" onclick="copyImageUrl('${escapeHtml(img.url)}')">Copy URL</button>
            <button class="btn btn--sm btn--ghost" onclick="deleteImage('${escapeHtml(img.name)}')">Delete</button>
          </div>
        </div>
      `).join('');
    } catch (error) {
      grid.innerHTML = '<p class="image-grid__empty">Failed to load images</p>';
    }
  }

  function formatFileSize(bytes) {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }

  async function uploadImage(file) {
    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Upload failed');
      showToast(`Uploaded: ${file.name}`, 'success');
      loadImages();
    } catch (error) {
      showToast(error.message || 'Upload failed', 'error');
    }
  }

  window.insertImage = function(url) {
    if (imagePickerCallback) {
      imagePickerCallback(url);
      imagePickerCallback = null;
    } else if (tinyEditor) {
      tinyEditor.insertContent(`<img src="${url}" alt="" />`);
    }
    closeModal('image-modal');
  };

  window.copyImageUrl = function(url) {
    navigator.clipboard.writeText(url).then(() => {
      showToast('URL copied!', 'success');
    });
  };

  window.deleteImage = async function(filename) {
    if (!confirm(`Delete image "${filename}"?`)) return;
    try {
      await api(`/images/${encodeURIComponent(filename)}`, { method: 'DELETE' });
      showToast('Image deleted', 'success');
      loadImages();
    } catch (error) {
      showToast(error.message || 'Failed to delete image', 'error');
    }
  };

  // =========================================
  // Categories
  // =========================================
  
  function newCategory() {
    editingCategory = null;
    $('#category-modal-title').textContent = 'New Category';
    $('#category-form').reset();
    $('#category-id').value = '';
    $('#category-color').value = '#FF6A00';
    $('#category-modal').classList.add('active');
  }

  window.editCategory = function(id) {
    const cat = categories.find(c => c.id === id);
    if (!cat) return;

    editingCategory = cat;
    $('#category-modal-title').textContent = 'Edit Category';
    $('#category-id').value = cat.id;
    $('#category-name').value = cat.name;
    $('#category-slug').value = cat.slug;
    $('#category-description').value = cat.description || '';
    $('#category-color').value = cat.color || '#FF6A00';
    $('#category-modal').classList.add('active');
  };

  async function saveCategory(e) {
    e.preventDefault();
    
    const data = {
      name: $('#category-name').value.trim(),
      slug: $('#category-slug').value.trim(),
      description: $('#category-description').value.trim(),
      color: $('#category-color').value
    };

    try {
      if (editingCategory) {
        await api(`/categories/${editingCategory.id}`, {
          method: 'PUT',
          body: data
        });
        showToast('Category updated', 'success');
      } else {
        await api('/categories', {
          method: 'POST',
          body: data
        });
        showToast('Category created', 'success');
      }

      await loadCategories();
      await loadStats();
      closeModal('category-modal');
    } catch (error) {
      showToast(error.message || 'Failed to save category', 'error');
    }
  }

  window.deleteCategory = async function(id) {
    if (!confirm('Delete this category?')) return;

    try {
      await api(`/categories/${id}`, { method: 'DELETE' });
      showToast('Category deleted', 'success');
      await loadCategories();
      await loadStats();
    } catch (error) {
      showToast(error.message || 'Failed to delete category', 'error');
    }
  };

  // =========================================
  // Regenerate All
  // =========================================
  
  async function regenerateAll() {
    if (!confirm('Regenerate all HTML files? This may take a moment.')) return;

    try {
      await api('/regenerate', { method: 'POST' });
      showToast('All posts regenerated', 'success');
    } catch (error) {
      showToast(error.message || 'Failed to regenerate', 'error');
    }
  }

  // =========================================
  // Modal Helpers
  // =========================================
  
  window.closeModal = function(modalId) {
    $(`#${modalId}`).classList.remove('active');
    if (modalId === 'image-modal') {
      imagePickerCallback = null;
    }
  };

  // Close modal on backdrop click
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
      e.target.classList.remove('active');
      if (e.target.id === 'image-modal') {
        imagePickerCallback = null;
      }
    }
  });

  // =========================================
  // Event Listeners
  // =========================================
  
  function initEventListeners() {
    // Login form
    $('#login-form').addEventListener('submit', (e) => {
      e.preventDefault();
      login($('#username').value, $('#password').value);
    });

    // Logout
    $('#logout-btn').addEventListener('click', logout);

    // Theme toggle
    $('#theme-toggle').addEventListener('click', toggleTheme);

    // New post/category buttons
    $('#new-post-btn').addEventListener('click', newPost);
    $('#new-category-btn').addEventListener('click', newCategory);
    $('#regenerate-btn').addEventListener('click', regenerateAll);

    // Editor back button
    $('#editor-back').addEventListener('click', () => showScreen('dashboard'));

    // Save/Preview buttons
    $('#preview-btn').addEventListener('click', previewPost);
    $('#save-draft-btn').addEventListener('click', () => savePost('draft'));
    $('#publish-btn').addEventListener('click', () => savePost('published'));

    // Image library button
    $('#image-library-btn').addEventListener('click', () => openImageLibrary());

    // Category form
    $('#category-form').addEventListener('submit', saveCategory);

    // Tabs
    $$('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        $$('.tab').forEach(t => t.classList.remove('active'));
        $$('.tab-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        $(`#${tab.dataset.tab}-tab`).classList.add('active');
      });
    });

    // Posts search, filter, and sort
    $('#posts-search').addEventListener('input', () => renderPostsTable());
    $('#posts-filter').addEventListener('change', () => renderPostsTable());
    $('#posts-sort').addEventListener('change', () => renderPostsTable());

    // Auto-generate slug from title
    $('#post-title').addEventListener('input', (e) => {
      if (!editingPost) {
        $('#post-slug').value = slugify(e.target.value);
      }
    });

    // Category name to slug
    $('#category-name').addEventListener('input', (e) => {
      if (!editingCategory) {
        $('#category-slug').value = slugify(e.target.value);
      }
    });

    // Add takeaway/FAQ buttons
    $('#add-takeaway').addEventListener('click', () => addTakeaway());
    $('#add-faq').addEventListener('click', () => addFaq());

    // Read time manual override detection
    $('#post-readtime').addEventListener('input', () => {
      readTimeManualOverride = true;
    });

    // Image upload - file input
    $('#image-file-input').addEventListener('change', (e) => {
      Array.from(e.target.files).forEach(uploadImage);
      e.target.value = '';
    });

    // Image upload - drag and drop
    const dropArea = $('#image-upload-area');
    ['dragenter', 'dragover'].forEach(evt => {
      dropArea.addEventListener(evt, (e) => {
        e.preventDefault();
        dropArea.classList.add('drag-over');
      });
    });
    ['dragleave', 'drop'].forEach(evt => {
      dropArea.addEventListener(evt, (e) => {
        e.preventDefault();
        dropArea.classList.remove('drag-over');
      });
    });
    dropArea.addEventListener('drop', (e) => {
      const files = e.dataTransfer.files;
      Array.from(files).forEach(f => {
        if (f.type.startsWith('image/')) uploadImage(f);
      });
    });
  }

  // =========================================
  // Initialize
  // =========================================
  
  function init() {
    initTheme();
    initEventListeners();
    checkAuth();
  }

  // Start the app
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

