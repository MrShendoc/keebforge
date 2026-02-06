/**
 * KeebForge Admin Setup Script
 * Run this once to set your admin credentials
 */

const readline = require('readline');
const fs = require('fs-extra');
const path = require('path');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const configPath = path.join(__dirname, 'config.json');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise(resolve => {
    rl.question(prompt, resolve);
  });
}

async function setup() {
  console.log(`
╔═══════════════════════════════════════════════════╗
║          KEEBFORGE ADMIN SETUP                    ║
╚═══════════════════════════════════════════════════╝
`);

  // Load existing config
  let config = {};
  try {
    config = await fs.readJson(configPath);
  } catch (e) {
    config = {
      admin: {},
      session: {},
      server: { port: 3001 },
      paths: {
        docs: '../docs',
        posts: '../docs/content/posts.json',
        categories: '../docs/content/categories.json',
        searchIndex: '../docs/content/search-index.json',
        templates: './templates'
      }
    };
  }

  // Get username
  const username = await question('Admin username (default: admin): ') || 'admin';
  
  // Get password
  let password = '';
  while (password.length < 8) {
    password = await question('Admin password (min 8 characters): ');
    if (password.length < 8) {
      console.log('Password must be at least 8 characters!');
    }
  }
  
  // Hash password
  console.log('\nHashing password...');
  const passwordHash = await bcrypt.hash(password, 12);
  
  // Generate session secret
  const sessionSecret = crypto.randomBytes(64).toString('hex');
  
  // Get port
  const portInput = await question('Server port (default: 3001): ');
  const port = parseInt(portInput) || 3001;
  
  // Update config
  config.admin = {
    username,
    passwordHash
  };
  
  config.session = {
    secret: sessionSecret,
    maxAge: 86400000 // 24 hours
  };
  
  config.server = {
    port
  };
  
  // Save config
  await fs.writeJson(configPath, config, { spaces: 2 });
  
  console.log(`
╔═══════════════════════════════════════════════════╗
║  ✓ Setup complete!                                ║
╠═══════════════════════════════════════════════════╣
║  Username: ${username.padEnd(38)}║
║  Password: ${'*'.repeat(Math.min(password.length, 8)).padEnd(38)}║
║  Port: ${port.toString().padEnd(42)}║
║                                                   ║
║  Start the server with: npm start                 ║
╚═══════════════════════════════════════════════════╝
`);

  rl.close();
}

setup().catch(err => {
  console.error('Setup failed:', err);
  process.exit(1);
});
