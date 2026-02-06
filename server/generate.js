/**
 * Static HTML generator for KeebForge posts
 */

const fs = require('fs-extra');
const path = require('path');
const { marked } = require('marked');
const sanitizeHtml = require('sanitize-html');

const config = require('./config.json');

/**
 * Sanitize markdown content
 */
function sanitizeContent(content) {
  return sanitizeHtml(content, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'img']),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
      a: ['href', 'name', 'target', 'rel'],
      '*': ['id', 'class']
    }
  });
}

/**
 * Convert markdown to HTML
 */
function markdownToHtml(markdown) {
  const html = marked(markdown, {
    gfm: true,
    breaks: true
  });
  return sanitizeContent(html);
}

/**
 * Generate breadcrumbs HTML
 */
function generateBreadcrumbs(breadcrumbs) {
  return breadcrumbs.map((crumb, i) => {
    if (crumb.url) {
      return `<a href="/keebforge${crumb.url}">${crumb.label}</a>`;
    }
    return `<span>${crumb.label}</span>`;
  }).join('<span class="breadcrumbs__separator">/</span>');
}

/**
 * Generate key takeaways HTML
 */
function generateKeyTakeaways(takeaways) {
  if (!takeaways || takeaways.length === 0) return '';
  
  const items = takeaways.map(t => `<li>${sanitizeContent(t)}</li>`).join('\n              ');
  
  return `
          <div class="key-takeaways">
            <div class="key-takeaways__title">🔑 Key Takeaways</div>
            <ul>
              ${items}
            </ul>
          </div>`;
}

/**
 * Generate FAQ HTML
 */
function generateFaqs(faqs) {
  if (!faqs || faqs.length === 0) return '';
  
  const items = faqs.map(faq => `
            <div class="faq__item">
              <button class="faq__question">${sanitizeContent(faq.question)}<span class="faq__icon">+</span></button>
              <div class="faq__answer">${sanitizeContent(faq.answer)}</div>
            </div>`).join('\n');
  
  return `
          <h2 id="faq">Frequently Asked Questions</h2>
          <div class="faq">
${items}
          </div>`;
}

/**
 * Load post template
 */
function loadTemplate() {
  const templatePath = path.join(__dirname, 'templates', 'post.html');
  return fs.readFileSync(templatePath, 'utf-8');
}

/**
 * Generate HTML file for a post
 */
async function generatePostHtml(post) {
  const template = loadTemplate();
  
  // Convert markdown content to HTML
  const contentHtml = markdownToHtml(post.content || '');
  
  // Generate components
  const breadcrumbsHtml = generateBreadcrumbs(post.breadcrumbs || []);
  const takeawaysHtml = generateKeyTakeaways(post.keyTakeaways);
  const faqsHtml = generateFaqs(post.faqs);
  
  // Replace placeholders in template
  let html = template
    .replace(/{{title}}/g, sanitizeContent(post.title))
    .replace(/{{slug}}/g, post.slug)
    .replace(/{{excerpt}}/g, sanitizeContent(post.excerpt || ''))
    .replace(/{{summary}}/g, sanitizeContent(post.summary || post.excerpt || ''))
    .replace(/{{category}}/g, sanitizeContent(post.categoryName || 'General'))
    .replace(/{{categorySlug}}/g, post.category === 'best-of' ? 'best' : post.category)
    .replace(/{{readTime}}/g, post.readTime || '5 min')
    .replace(/{{author}}/g, sanitizeContent(post.author || 'KeebForge Editorial'))
    .replace(/{{breadcrumbs}}/g, breadcrumbsHtml)
    .replace(/{{keyTakeaways}}/g, takeawaysHtml)
    .replace(/{{content}}/g, contentHtml)
    .replace(/{{faqs}}/g, faqsHtml);
  
  // Write file
  const postDir = path.join(__dirname, config.paths.docs, 'posts', post.slug);
  await fs.ensureDir(postDir);
  await fs.writeFile(path.join(postDir, 'index.html'), html, 'utf-8');
  
  console.log(`Generated: posts/${post.slug}/index.html`);
  return true;
}

/**
 * Update search index
 */
async function updateSearchIndex(posts) {
  const searchIndex = posts
    .filter(p => p.status === 'published')
    .map(p => ({
      title: p.title,
      slug: p.slug,
      url: `/posts/${p.slug}/`,
      category: p.categoryName,
      excerpt: p.excerpt,
      tags: p.tags || []
    }));
  
  const indexPath = path.join(__dirname, config.paths.searchIndex);
  await fs.writeJson(indexPath, searchIndex, { spaces: 2 });
  
  console.log(`Updated search index with ${searchIndex.length} posts`);
  return true;
}

/**
 * Delete post HTML file
 */
async function deletePostHtml(slug) {
  const postDir = path.join(__dirname, config.paths.docs, 'posts', slug);
  
  if (await fs.pathExists(postDir)) {
    await fs.remove(postDir);
    console.log(`Deleted: posts/${slug}/`);
    return true;
  }
  
  return false;
}

/**
 * Regenerate all posts
 */
async function regenerateAll() {
  const postsPath = path.join(__dirname, config.paths.posts);
  const data = await fs.readJson(postsPath);
  
  for (const post of data.posts) {
    if (post.status === 'published') {
      await generatePostHtml(post);
    }
  }
  
  await updateSearchIndex(data.posts);
  
  console.log('Regenerated all posts');
  return true;
}

module.exports = {
  generatePostHtml,
  updateSearchIndex,
  deletePostHtml,
  regenerateAll,
  markdownToHtml,
  sanitizeContent
};
