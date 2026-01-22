// modules/matel/routes.js
const express = require('express');
const router = express.Router();
const matelController = require('./controller');
const { authenticateJWT } = require('../../middleware/authMiddleware');
const tenantResolver = require('../../middleware/tenantResolver');

// Bisa pakai middleware canManageMasterData kalau mau dibedakan
// Sementara: cukup authenticate + tenantResolver
router.use(authenticateJWT);
router.use(tenantResolver);

// list + search
router.get('/', matelController.getAll.bind(matelController));
// detail
router.get('/:id', matelController.getById.bind(matelController));
// create
router.post('/', matelController.create.bind(matelController));
// update
router.put('/:id', matelController.update.bind(matelController));
// delete
router.delete('/:id', matelController.delete.bind(matelController));

module.exports = router;
