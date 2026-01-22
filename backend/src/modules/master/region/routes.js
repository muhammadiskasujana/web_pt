// modules/region/routes.js
const express = require('express');
const router = express.Router();
const regionController = require('./controller');
const { authenticateJWT } = require('../../middleware/authMiddleware');
const tenantResolver = require('../../middleware/tenantResolver');

router.use(authenticateJWT);
router.use(tenantResolver);

router.get('/', regionController.getAll.bind(regionController));
router.get('/:id', regionController.getById.bind(regionController));
router.post('/', regionController.create.bind(regionController));
router.put('/:id', regionController.update.bind(regionController));
router.delete('/:id', regionController.delete.bind(regionController));

module.exports = router;
