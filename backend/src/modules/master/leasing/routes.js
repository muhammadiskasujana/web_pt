// modules/leasing/routes.js
const express = require('express');
const router = express.Router();
const leasingController = require('./controller');
const { authenticateJWT } = require('../../middleware/authMiddleware');
const tenantResolver = require('../../middleware/tenantResolver');

router.use(authenticateJWT);
router.use(tenantResolver);

router.get('/', leasingController.getAll.bind(leasingController));
router.get('/:id', leasingController.getById.bind(leasingController));
router.post('/', leasingController.create.bind(leasingController));
router.put('/:id', leasingController.update.bind(leasingController));
router.delete('/:id', leasingController.delete.bind(leasingController));

module.exports = router;
