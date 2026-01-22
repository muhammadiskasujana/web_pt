// modules/docType/routes.js
const express = require('express');
const router = express.Router();
const docTypeController = require('./controller');
const { authenticateJWT } = require('../../middleware/authMiddleware');
const tenantResolver = require('../../middleware/tenantResolver');

router.use(authenticateJWT);
router.use(tenantResolver);

router.get('/', docTypeController.getAll.bind(docTypeController));
router.get('/:id', docTypeController.getById.bind(docTypeController));
router.post('/', docTypeController.create.bind(docTypeController));
router.put('/:id', docTypeController.update.bind(docTypeController));
router.delete('/:id', docTypeController.delete.bind(docTypeController));

module.exports = router;
