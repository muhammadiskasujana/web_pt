// ───────────────────────────────────────────────────────────────────────────────
// 3) ROUTES — src/modules/progres/routes.js
// ───────────────────────────────────────────────────────────────────────────────
const express = require('express');
const router = express.Router();
const ctrl = require('./controller');
const { authenticateJWT } = require('../../middleware/authMiddleware');
const tenantResolver  = require('../../middleware/tenantResolver');

// ----- Internal key guard (untuk WA / service-to-service) -----
function internalAuth(req, res, next) {
    const key = req.headers['x-internal-key'] || req.query.key;
    const expected = process.env.INTERNAL_SERVICE_KEY;
    if (!expected) {
        return res.status(500).json({ error: 'INTERNAL_SERVICE_KEY_NOT_SET' });
    }
    if (key && key === expected) return next();
    return res.status(401).json({ error: 'NO_TOKEN' });
}

// ♦ Penting: tenantResolver duluan agar schema selalu tersedia
router.use(tenantResolver);

// ===== Jalur INTERNAL (bebas JWT, pakai X-Internal-Key) =====
router.post('/internal/instances/:id/stages/:stage_id', internalAuth, ctrl.updateStageInternal.bind(ctrl));

// ===== Jalur ber-JWT (FE / API publik) =====
router.use(authenticateJWT);

// Categories
router.post('/categories', ctrl.createCategory.bind(ctrl));
router.get('/categories', ctrl.listCategories.bind(ctrl));
router.put('/categories/:id', ctrl.updateCategory.bind(ctrl));
router.delete('/categories/:id', ctrl.deleteCategory.bind(ctrl));

// Assign category → product
router.post('/assign', ctrl.assignCategoryToProduct.bind(ctrl));

// Instances
router.get('/instances', ctrl.listInstances.bind(ctrl));
router.get('/instances/:id', ctrl.getInstance.bind(ctrl));
router.post('/instances/:id/stages/:stage_id', ctrl.updateStage.bind(ctrl)); // JWT
router.post('/instances/:id/reassign', ctrl.reassignPIC.bind(ctrl));

module.exports = router;
