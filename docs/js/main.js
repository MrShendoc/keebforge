/**
 * KeebForge Main JavaScript
 * Handles navigation, search, and core interactivity
 */

const BASE_PATH = '/keebforge';

// DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initNavigation();
  initSearch();
  initFAQ();
  initFilterChips();
  initScrollReveal();
});

/**
 * Theme Toggle
 */
function initTheme() {
  const toggle = document.querySelector('.theme-toggle');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
  
  // Get saved theme or detect from system
  function getTheme() {
    const saved = localStorage.getItem('keebforge-theme');
    if (saved) return saved;
    return prefersDark.matches ? 'dark' : 'light';
  }
  
  // Apply theme to document
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
  }
  
  // Initialize on load
  applyTheme(getTheme());
  
  // Toggle button handler
  if (toggle) {
    toggle.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || getTheme();
      const next = current === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      localStorage.setItem('keebforge-theme', next);
    });
  }
  
  // Listen for system preference changes
  prefersDark.addEventListener('change', (e) => {
    if (!localStorage.getItem('keebforge-theme')) {
      applyTheme(e.matches ? 'dark' : 'light');
    }
  });
}

/**
 * Scroll Reveal Animations
 */
function initScrollReveal() {
  const reveals = document.querySelectorAll('.scroll-reveal');
  
  if (!reveals.length) return;
  
  // Check for reduced motion preference
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    reveals.forEach(el => el.classList.add('scroll-reveal--visible'));
    return;
  }
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('scroll-reveal--visible');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  });
  
  reveals.forEach(el => observer.observe(el));
}

/**
 * Mobile Navigation Toggle
 */
function initNavigation() {
  const toggle = document.querySelector('.nav__toggle');
  const navList = document.querySelector('.nav__list');
  
  if (!toggle || !navList) return;
  
  toggle.addEventListener('click', () => {
    toggle.classList.toggle('open');
    navList.classList.toggle('open');
    document.body.style.overflow = navList.classList.contains('open') ? 'hidden' : '';
  });
  
  // Close menu on link click
  navList.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      toggle.classList.remove('open');
      navList.classList.remove('open');
      document.body.style.overflow = '';
    });
  });
  
  // Close on escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && navList.classList.contains('open')) {
      toggle.classList.remove('open');
      navList.classList.remove('open');
      document.body.style.overflow = '';
    }
  });
}

/**
 * Search Functionality
 */
let searchIndex = null;

async function loadSearchIndex() {
  if (searchIndex) return searchIndex;
  
  try {
    const response = await fetch(`${BASE_PATH}/content/search-index.json`);
    searchIndex = await response.json();
    return searchIndex;
  } catch (error) {
    console.error('Failed to load search index:', error);
    return [];
  }
}

function initSearch() {
  const searchBtn = document.querySelector('.search-btn');
  const searchModal = document.querySelector('.search-modal');
  const searchInput = document.querySelector('.search-modal__input');
  const searchClose = document.querySelector('.search-modal__close');
  const searchResults = document.querySelector('.search-modal__results');
  
  if (!searchBtn || !searchModal) return;
  
  // Open search
  searchBtn.addEventListener('click', async () => {
    searchModal.classList.add('open');
    searchInput?.focus();
    await loadSearchIndex();
  });
  
  // Close search
  searchClose?.addEventListener('click', () => {
    searchModal.classList.remove('open');
  });
  
  searchModal.addEventListener('click', (e) => {
    if (e.target === searchModal) {
      searchModal.classList.remove('open');
    }
  });
  
  document.addEventListener('keydown', (e) => {
    // Cmd/Ctrl + K to open search
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      searchModal.classList.add('open');
      searchInput?.focus();
      loadSearchIndex();
    }
    
    // Escape to close
    if (e.key === 'Escape' && searchModal.classList.contains('open')) {
      searchModal.classList.remove('open');
    }
  });
  
  // Search input handler
  searchInput?.addEventListener('input', debounce(async (e) => {
    const query = e.target.value.trim().toLowerCase();
    
    if (!query) {
      searchResults.innerHTML = '';
      return;
    }
    
    const index = await loadSearchIndex();
    const results = index.filter(item => {
      return item.title.toLowerCase().includes(query) ||
             item.excerpt.toLowerCase().includes(query) ||
             item.category.toLowerCase().includes(query) ||
             (item.tags && item.tags.some(tag => tag.toLowerCase().includes(query)));
    });
    
    renderSearchResults(results, searchResults);
  }, 200));
}

function renderSearchResults(results, container) {
  if (!results.length) {
    container.innerHTML = '<div class="search-modal__no-results">No results found</div>';
    return;
  }
  
  container.innerHTML = results.map(item => `
    <a href="${BASE_PATH}${item.url}" class="search-modal__result">
      <div class="search-modal__result-title">${item.title}</div>
      <div class="search-modal__result-excerpt">${item.excerpt}</div>
    </a>
  `).join('');
}

/**
 * FAQ Accordion
 */
function initFAQ() {
  const faqItems = document.querySelectorAll('.faq__item');
  
  faqItems.forEach(item => {
    const question = item.querySelector('.faq__question');
    
    question?.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      
      // Close all others
      faqItems.forEach(other => other.classList.remove('open'));
      
      // Toggle current
      if (!isOpen) {
        item.classList.add('open');
      }
    });
  });
}

/**
 * Filter Chips
 */
function initFilterChips() {
  const filterChips = document.querySelectorAll('.filter-chip');
  const cards = document.querySelectorAll('[data-category]');
  
  if (!filterChips.length) return;
  
  filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const category = chip.dataset.filter;
      
      // Update active chip
      filterChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      
      // Filter cards
      cards.forEach(card => {
        if (category === 'all' || card.dataset.category === category) {
          card.style.display = '';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });
}

/**
 * Utility: Debounce
 */
function debounce(fn, delay) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * Utility: Get base path for links
 */
function getBasePath() {
  return BASE_PATH;
}

// Export for use in other scripts
window.KeebForge = {
  BASE_PATH,
  getBasePath,
  loadSearchIndex
};
