/**
 * KeebForge Admin API Server
 * Self-hosted Node.js backend for content management
 */

const express = require('express');
const session = require('express-session');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');

const auth = require('./auth');
const generate = require('./generate');
const config = require('./config.json');

const app = express();
const PORT = process.env.PORT || config.server.port || 3001;

// ============================================
// IMAGE UPLOAD CONFIG
// ============================================

const uploadsDir = path.join(__dirname, config.paths.docs, 'assets', 'uploads');
fs.ensureDirSync(uploadsDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = path.basename(file.originalname, ext)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const unique = Date.now().toString(36);
    cb(null, `${name}-${unique}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|gif|webp|svg|avif)$/i;
    if (allowed.test(path.extname(file.originalname))) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Trust proxy for rate limiting behind nginx
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, error: 'Too many requests' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, error: 'Too many login attempts' }
});

app.use('/api/', limiter);
app.use('/api/auth/login', authLimiter);

// CORS for development
app.use(cors({
  origin: true,
  credentials: true
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));

// Session configuration
app.use(session({
  name: 'keebforge_session',
  secret: config.session.secret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: config.session.maxAge || 86400000,
    sameSite: 'lax'
  }
}));

// ============================================
// AUTH ROUTES
// ============================================

app.post('/api/auth/login', auth.login);
app.post('/api/auth/logout', auth.logout);
app.get('/api/auth/check', auth.checkAuth);
app.post('/api/auth/password', auth.requireAuth, auth.changePassword);

// ============================================
// POSTS ROUTES
// ============================================

const postsPath = path.join(__dirname, config.paths.posts);

// Get all posts
app.get('/api/posts', auth.requireAuth, async (req, res) => {
  try {
    const data = await fs.readJson(postsPath);
    res.json({ success: true, posts: data.posts });
  } catch (error) {
    console.error('Error reading posts:', error);
    res.status(500).json({ success: false, error: 'Failed to read posts' });
  }
});

// Get single post
app.get('/api/posts/:slug', auth.requireAuth, async (req, res) => {
  try {
    const data = await fs.readJson(postsPath);
    const post = data.posts.find(p => p.slug === req.params.slug);
    
    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }
    
    res.json({ success: true, post });
  } catch (error) {
    console.error('Error reading post:', error);
    res.status(500).json({ success: false, error: 'Failed to read post' });
  }
});

// Create new post
app.post('/api/posts', auth.requireAuth, async (req, res) => {
  try {
    const data = await fs.readJson(postsPath);
    
    const {
      title, slug, category, categoryName, excerpt, summary,
      content, contentFormat, keyTakeaways, faqs, breadcrumbs,
      readTime, author, tags, status, publishDate
    } = req.body;
    
    if (!title || !slug) {
      return res.status(400).json({ success: false, error: 'Title and slug are required' });
    }
    
    if (data.posts.find(p => p.slug === slug)) {
      return res.status(400).json({ success: false, error: 'Post with this slug already exists' });
    }
    
    const newPost = {
      id: slug,
      title: generate.sanitizeContent(title),
      slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      category: category || 'guides',
      categoryName: categoryName || 'Guides',
      excerpt: generate.sanitizeContent(excerpt || ''),
      summary: generate.sanitizeContent(summary || excerpt || ''),
      content: content || '',
      contentFormat: contentFormat || 'markdown',
      keyTakeaways: keyTakeaways || [],
      faqs: faqs || [],
      breadcrumbs: breadcrumbs || [
        { label: 'Home', url: '/' },
        { label: categoryName || 'Guides', url: `/${category === 'best-of' ? 'best' : category}/` },
        { label: title }
      ],
      readTime: readTime || '5 min',
      author: author || 'KeebForge Editorial',
      tags: tags || [],
      status: status || 'draft',
      publishDate: publishDate || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    data.posts.push(newPost);
    await fs.writeJson(postsPath, data, { spaces: 2 });
    
    // Generate HTML if published and not future-dated
    if (newPost.status === 'published') {
      if (!newPost.publishDate || new Date(newPost.publishDate) <= new Date()) {
        await generate.generatePostHtml(newPost);
        await generate.updateSearchIndex(data.posts);
      }
    }
    
    res.json({ success: true, post: newPost });
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ success: false, error: 'Failed to create post' });
  }
});

// Update post
app.put('/api/posts/:slug', auth.requireAuth, async (req, res) => {
  try {
    const data = await fs.readJson(postsPath);
    const index = data.posts.findIndex(p => p.slug === req.params.slug);
    
    if (index === -1) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }
    
    const existingPost = data.posts[index];
    const updates = req.body;
    
    if (updates.slug && updates.slug !== req.params.slug) {
      if (data.posts.find(p => p.slug === updates.slug)) {
        return res.status(400).json({ success: false, error: 'Post with new slug already exists' });
      }
      await generate.deletePostHtml(req.params.slug);
    }
    
    const updatedPost = {
      ...existingPost,
      ...updates,
      id: updates.slug || existingPost.slug,
      updatedAt: new Date().toISOString()
    };
    
    if (updates.title) updatedPost.title = generate.sanitizeContent(updates.title);
    if (updates.excerpt) updatedPost.excerpt = generate.sanitizeContent(updates.excerpt);
    if (updates.summary) updatedPost.summary = generate.sanitizeContent(updates.summary);
    
    data.posts[index] = updatedPost;
    await fs.writeJson(postsPath, data, { spaces: 2 });
    
    // Regenerate HTML (skip future-dated)
    if (updatedPost.status === 'published') {
      if (!updatedPost.publishDate || new Date(updatedPost.publishDate) <= new Date()) {
        await generate.generatePostHtml(updatedPost);
      } else {
        await generate.deletePostHtml(updatedPost.slug);
      }
    } else {
      await generate.deletePostHtml(updatedPost.slug);
    }
    
    await generate.updateSearchIndex(data.posts);
    
    res.json({ success: true, post: updatedPost });
  } catch (error) {
    console.error('Error updating post:', error);
    res.status(500).json({ success: false, error: 'Failed to update post' });
  }
});

// Delete post
app.delete('/api/posts/:slug', auth.requireAuth, async (req, res) => {
  try {
    const data = await fs.readJson(postsPath);
    const index = data.posts.findIndex(p => p.slug === req.params.slug);
    
    if (index === -1) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }
    
    data.posts.splice(index, 1);
    await fs.writeJson(postsPath, data, { spaces: 2 });
    await generate.deletePostHtml(req.params.slug);
    await generate.updateSearchIndex(data.posts);
    
    res.json({ success: true, message: 'Post deleted' });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ success: false, error: 'Failed to delete post' });
  }
});

// ============================================
// CATEGORIES ROUTES
// ============================================

const categoriesPath = path.join(__dirname, config.paths.categories);

app.get('/api/categories', auth.requireAuth, async (req, res) => {
  try {
    const data = await fs.readJson(categoriesPath);
    res.json({ success: true, ...data });
  } catch (error) {
    console.error('Error reading categories:', error);
    res.status(500).json({ success: false, error: 'Failed to read categories' });
  }
});

app.post('/api/categories', auth.requireAuth, async (req, res) => {
  try {
    const data = await fs.readJson(categoriesPath);
    const { name, slug, description, color } = req.body;
    
    if (!name || !slug) {
      return res.status(400).json({ success: false, error: 'Name and slug required' });
    }
    
    if (data.categories.find(c => c.id === slug || c.slug === slug)) {
      return res.status(400).json({ success: false, error: 'Category already exists' });
    }
    
    const newCategory = {
      id: slug,
      name: generate.sanitizeContent(name),
      slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      description: generate.sanitizeContent(description || ''),
      color: color || '#6B7280'
    };
    
    data.categories.push(newCategory);
    data.subcategories[slug] = [];
    
    await fs.writeJson(categoriesPath, data, { spaces: 2 });
    
    res.json({ success: true, category: newCategory });
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ success: false, error: 'Failed to create category' });
  }
});

app.put('/api/categories/:id', auth.requireAuth, async (req, res) => {
  try {
    const data = await fs.readJson(categoriesPath);
    const index = data.categories.findIndex(c => c.id === req.params.id);
    
    if (index === -1) {
      return res.status(404).json({ success: false, error: 'Category not found' });
    }
    
    const updates = req.body;
    const updatedCategory = {
      ...data.categories[index],
      ...updates
    };
    
    if (updates.name) updatedCategory.name = generate.sanitizeContent(updates.name);
    if (updates.description) updatedCategory.description = generate.sanitizeContent(updates.description);
    
    data.categories[index] = updatedCategory;
    await fs.writeJson(categoriesPath, data, { spaces: 2 });
    
    res.json({ success: true, category: updatedCategory });
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ success: false, error: 'Failed to update category' });
  }
});

app.delete('/api/categories/:id', auth.requireAuth, async (req, res) => {
  try {
    const data = await fs.readJson(categoriesPath);
    const postsData = await fs.readJson(postsPath);
    
    const postsInCategory = postsData.posts.filter(p => p.category === req.params.id);
    if (postsInCategory.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete: ${postsInCategory.length} posts in this category`
      });
    }
    
    const index = data.categories.findIndex(c => c.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ success: false, error: 'Category not found' });
    }
    
    data.categories.splice(index, 1);
    delete data.subcategories[req.params.id];
    
    await fs.writeJson(categoriesPath, data, { spaces: 2 });
    
    res.json({ success: true, message: 'Category deleted' });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ success: false, error: 'Failed to delete category' });
  }
});

// ============================================
// IMAGE ROUTES
// ============================================

// Upload image
app.post('/api/upload', auth.requireAuth, upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No image file provided' });
  }

  const imageUrl = `/keebforge/assets/uploads/${req.file.filename}`;
  res.json({
    success: true,
    image: {
      name: req.file.filename,
      url: imageUrl,
      size: req.file.size
    }
  });
});

// List images
app.get('/api/images', auth.requireAuth, async (req, res) => {
  try {
    await fs.ensureDir(uploadsDir);
    const files = await fs.readdir(uploadsDir);
    const images = [];

    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      if (/\.(jpg|jpeg|png|gif|webp|svg|avif)$/.test(ext)) {
        const stat = await fs.stat(path.join(uploadsDir, file));
        images.push({
          name: file,
          url: `/keebforge/assets/uploads/${file}`,
          size: stat.size,
          modified: stat.mtime
        });
      }
    }

    images.sort((a, b) => new Date(b.modified) - new Date(a.modified));
    res.json({ success: true, images });
  } catch (error) {
    console.error('Error listing images:', error);
    res.status(500).json({ success: false, error: 'Failed to list images' });
  }
});

// Delete image
app.delete('/api/images/:filename', auth.requireAuth, async (req, res) => {
  try {
    const filename = req.params.filename;
    // Sanitize filename to prevent path traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ success: false, error: 'Invalid filename' });
    }

    const filePath = path.join(uploadsDir, filename);
    if (await fs.pathExists(filePath)) {
      await fs.remove(filePath);
      res.json({ success: true, message: 'Image deleted' });
    } else {
      res.status(404).json({ success: false, error: 'Image not found' });
    }
  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({ success: false, error: 'Failed to delete image' });
  }
});

// ============================================
// UTILITY ROUTES
// ============================================

app.post('/api/regenerate', auth.requireAuth, async (req, res) => {
  try {
    await generate.regenerateAll();
    res.json({ success: true, message: 'All posts regenerated' });
  } catch (error) {
    console.error('Error regenerating:', error);
    res.status(500).json({ success: false, error: 'Failed to regenerate' });
  }
});

app.get('/api/stats', auth.requireAuth, async (req, res) => {
  try {
    const postsData = await fs.readJson(postsPath);
    const categoriesData = await fs.readJson(categoriesPath);
    
    const now = new Date();
    const published = postsData.posts.filter(p => 
      p.status === 'published' && (!p.publishDate || new Date(p.publishDate) <= now)
    ).length;
    const drafts = postsData.posts.filter(p => p.status === 'draft').length;
    const scheduled = postsData.posts.filter(p => 
      p.status === 'published' && p.publishDate && new Date(p.publishDate) > now
    ).length;
    
    res.json({
      success: true,
      stats: {
        totalPosts: postsData.posts.length,
        published,
        drafts,
        scheduled,
        categories: categoriesData.categories.length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get stats' });
  }
});

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════╗
║          KEEBFORGE ADMIN SERVER                   ║
╠═══════════════════════════════════════════════════╣
║  Running on port ${PORT}                             ║
║  API endpoint: http://localhost:${PORT}/api          ║
║                                                   ║
║  First time? Run: npm run setup                   ║
╚═══════════════════════════════════════════════════╝
  `);
});
