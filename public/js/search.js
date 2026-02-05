/**
 * KeebForge Search Enhancement
 * Provides additional search functionality
 */

(function() {
  const BASE_PATH = window.KeebForge?.BASE_PATH || '/keebforge';
  
  // Keyboard shortcuts hint
  function addSearchShortcutHint() {
    const searchBtn = document.querySelector('.search-btn');
    if (!searchBtn) return;
    
    // Detect OS for keyboard shortcut
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const shortcut = isMac ? '⌘K' : 'Ctrl+K';
    
    // Add shortcut badge
    const badge = document.createElement('span');
    badge.className = 'search-shortcut';
    badge.textContent = shortcut;
    badge.style.cssText = `
      background: var(--muted);
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 0.75rem;
      margin-left: 8px;
    `;
    
    searchBtn.appendChild(badge);
  }
  
  // Recent searches (localStorage)
  const RECENT_KEY = 'keebforge_recent_searches';
  const MAX_RECENT = 5;
  
  function getRecentSearches() {
    try {
      return JSON.parse(localStorage.getItem(RECENT_KEY)) || [];
    } catch {
      return [];
    }
  }
  
  function addRecentSearch(query) {
    if (!query.trim()) return;
    
    let recent = getRecentSearches();
    recent = recent.filter(q => q !== query);
    recent.unshift(query);
    recent = recent.slice(0, MAX_RECENT);
    
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(recent));
    } catch {
      // Storage full or disabled
    }
  }
  
  function showRecentSearches(container) {
    const recent = getRecentSearches();
    if (!recent.length) return;
    
    container.innerHTML = `
      <div style="padding: var(--space-md) var(--space-lg); color: var(--text-muted); font-size: 0.875rem;">
        Recent searches
      </div>
      ${recent.map(query => `
        <button class="search-modal__result" data-recent="${query}" style="text-align: left; border: none; background: none; cursor: pointer; display: block; width: 100%;">
          <div class="search-modal__result-title">${query}</div>
        </button>
      `).join('')}
    `;
    
    // Handle click on recent
    container.querySelectorAll('[data-recent]').forEach(btn => {
      btn.addEventListener('click', () => {
        const input = document.querySelector('.search-modal__input');
        if (input) {
          input.value = btn.dataset.recent;
          input.dispatchEvent(new Event('input'));
        }
      });
    });
  }
  
  // Initialize on load
  document.addEventListener('DOMContentLoaded', () => {
    addSearchShortcutHint();
    
    // Show recent on empty search
    const searchInput = document.querySelector('.search-modal__input');
    const searchResults = document.querySelector('.search-modal__results');
    
    if (searchInput && searchResults) {
      searchInput.addEventListener('focus', () => {
        if (!searchInput.value.trim()) {
          showRecentSearches(searchResults);
        }
      });
      
      // Track searches
      const searchModal = document.querySelector('.search-modal');
      searchResults.addEventListener('click', (e) => {
        const link = e.target.closest('a.search-modal__result');
        if (link && searchInput.value.trim()) {
          addRecentSearch(searchInput.value.trim());
        }
      });
    }
  });
})();
