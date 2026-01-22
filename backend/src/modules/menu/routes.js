const express = require('express');
const router = express.Router();
const ctrl = require('./controller');
const { authenticateJWT } = require('../../middleware/authMiddleware');
const tenantResolver  = require('../../middleware/tenantResolver');

router.use(authenticateJWT, tenantResolver);

// Read-only for app
router.get('/menus/tree', ctrl.getTree.bind(ctrl));

// Admin endpoints (optional, bisa batasi role di middleware sendiri)
router.post('/menus', ctrl.createMenu.bind(ctrl));
router.post('/menus/items', ctrl.upsertItem.bind(ctrl));
router.delete('/menus/items/:id', ctrl.removeItem.bind(ctrl));

module.exports = router;
