// modules/upahTarik/routes.js
const express = require('express');
const router = express.Router();
const upahTarikController = require('./controller');
const { authenticateJWT } = require('../../middleware/authMiddleware');
const tenantResolver = require('../../middleware/tenantResolver');

router.use(authenticateJWT);
router.use(tenantResolver);

router.get('/', upahTarikController.getAll.bind(upahTarikController));
router.get('/:id', upahTarikController.getById.bind(upahTarikController));
router.post('/', upahTarikController.create.bind(upahTarikController));
router.put('/:id', upahTarikController.update.bind(upahTarikController));
router.delete('/:id', upahTarikController.delete.bind(upahTarikController));

module.exports = router;
