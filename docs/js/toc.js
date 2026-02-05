/**
 * KeebForge Table of Contents Generator
 * Auto-generates TOC from h2/h3 headings in post content
 */

document.addEventListener('DOMContentLoaded', () => {
  generateTOC();
});

function generateTOC() {
  const tocContainer = document.querySelector('.toc__list');
  const postContent = document.querySelector('.post__content');
  
  if (!tocContainer || !postContent) return;
  
  const headings = postContent.querySelectorAll('h2, h3');
  
  if (!headings.length) {
    // Hide TOC if no headings
    const tocWrapper = document.querySelector('.toc');
    if (tocWrapper) tocWrapper.style.display = 'none';
    return;
  }
  
  const tocItems = [];
  
  headings.forEach((heading, index) => {
    // Create ID if not present
    if (!heading.id) {
      heading.id = `section-${index + 1}`;
    }
    
    const level = heading.tagName.toLowerCase();
    const text = heading.textContent;
    const id = heading.id;
    
    tocItems.push({
      level,
      text,
      id
    });
  });
  
  // Render TOC
  tocContainer.innerHTML = tocItems.map(item => {
    const indent = item.level === 'h3' ? 'style="padding-left: 1rem;"' : '';
    return `<li ${indent}><a href="#${item.id}">${item.text}</a></li>`;
  }).join('');
  
  // Smooth scroll for TOC links
  tocContainer.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.querySelector(link.getAttribute('href'));
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // Update URL hash without jumping
        history.pushState(null, '', link.getAttribute('href'));
      }
    });
  });
  
  // Highlight active section on scroll
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const id = entry.target.id;
            tocContainer.querySelectorAll('a').forEach(link => {
              link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
            });
          }
        });
      },
      {
        rootMargin: '-20% 0px -80% 0px'
      }
    );
    
    headings.forEach(heading => observer.observe(heading));
  }
}
