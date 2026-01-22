const express = require('express');
const authController = require('../controllers/authController');
const { authenticateJWT } = require('../middleware/authMiddleware');
const tenantResolver = require('../middleware/tenantResolver');

const router = express.Router();

// Public routes
// Generic (kept): auto-routes to master or tenant if tenantResolver is present
router.post('/login', authController.login.bind(authController));
router.post('/refresh', authController.refreshToken.bind(authController));

// Master-specific routes
router.post('/master/login', authController.masterLogin.bind(authController));
router.post('/master/refresh', authController.masterRefresh.bind(authController));

// Tenant-specific routes (requires tenant context)
router.post('/tenant/login', tenantResolver, authController.tenantLogin.bind(authController));
router.post('/tenant/refresh', tenantResolver, authController.tenantRefresh.bind(authController));

// Protected routes
router.post('/logout', authenticateJWT, authController.logout.bind(authController));

// NEW: public GET that reads HttpOnly cookies server-side
router.get('/me', authController.getSession.bind(authController));

module.exports = router;