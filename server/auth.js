/**
 * Authentication middleware for KeebForge Admin
 */

const bcrypt = require('bcryptjs');
const fs = require('fs-extra');
const path = require('path');

const configPath = path.join(__dirname, 'config.json');

/**
 * Load config from file
 */
function getConfig() {
  return fs.readJsonSync(configPath);
}

/**
 * Save config to file
 */
function saveConfig(config) {
  fs.writeJsonSync(configPath, config, { spaces: 2 });
}

/**
 * Verify password against stored hash
 */
async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

/**
 * Hash a new password
 */
async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

/**
 * Authentication middleware - checks if session is valid
 */
function requireAuth(req, res, next) {
  if (req.session && req.session.authenticated) {
    // Extend session on activity
    req.session.touch();
    return next();
  }
  
  res.status(401).json({
    success: false,
    error: 'Authentication required'
  });
}

/**
 * Login handler
 */
async function login(req, res) {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({
      success: false,
      error: 'Username and password required'
    });
  }
  
  try {
    const config = getConfig();
    
    // Check username
    if (username !== config.admin.username) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }
    
    // Check password
    const valid = await verifyPassword(password, config.admin.passwordHash);
    
    if (!valid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }
    
    // Set session
    req.session.authenticated = true;
    req.session.username = username;
    req.session.loginTime = Date.now();
    
    res.json({
      success: true,
      message: 'Login successful'
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
}

/**
 * Logout handler
 */
function logout(req, res) {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({
        success: false,
        error: 'Logout failed'
      });
    }
    
    res.clearCookie('keebforge_session');
    res.json({
      success: true,
      message: 'Logged out'
    });
  });
}

/**
 * Check auth status
 */
function checkAuth(req, res) {
  if (req.session && req.session.authenticated) {
    res.json({
      success: true,
      authenticated: true,
      username: req.session.username
    });
  } else {
    res.json({
      success: true,
      authenticated: false
    });
  }
}

/**
 * Change password handler
 */
async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body;
  
  if (!currentPassword || !newPassword) {
    return res.status(400).json({
      success: false,
      error: 'Current and new password required'
    });
  }
  
  if (newPassword.length < 8) {
    return res.status(400).json({
      success: false,
      error: 'New password must be at least 8 characters'
    });
  }
  
  try {
    const config = getConfig();
    
    // Verify current password
    const valid = await verifyPassword(currentPassword, config.admin.passwordHash);
    
    if (!valid) {
      return res.status(401).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }
    
    // Hash and save new password
    config.admin.passwordHash = await hashPassword(newPassword);
    saveConfig(config);
    
    res.json({
      success: true,
      message: 'Password changed successfully'
    });
    
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
}

module.exports = {
  requireAuth,
  login,
  logout,
  checkAuth,
  changePassword,
  hashPassword,
  getConfig,
  saveConfig
};
