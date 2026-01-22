// modules/pool/routes.js
const express = require('express');
const router = express.Router();
const poolController = require('./controller');
const { authenticateJWT } = require('../../middleware/authMiddleware');
const tenantResolver = require('../../middleware/tenantResolver');

router.use(authenticateJWT);
router.use(tenantResolver);

router.get('/', poolController.getAll.bind(poolController));
router.get('/:id', poolController.getById.bind(poolController));
router.post('/', poolController.create.bind(poolController));
router.put('/:id', poolController.update.bind(poolController));
router.delete('/:id', poolController.delete.bind(poolController));

module.exports = router;
