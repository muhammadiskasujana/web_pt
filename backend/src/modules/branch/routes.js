const express = require('express');
const router = express.Router();
const { authenticateJWT } = require('../../middleware/authMiddleware');
const tenantResolver = require('../../middleware/tenantResolver');
const controller = require('./controller');

router.use(authenticateJWT, tenantResolver);

router.get('/', controller.list.bind(controller));
router.post('/', controller.create.bind(controller));
router.get('/:id', controller.get.bind(controller));
router.put('/:id', controller.update.bind(controller));
router.delete('/:id', controller.remove.bind(controller));

// transfer modal
router.post('/capital/transfer', controller.transferCapital.bind(controller));
router.get('/capital/transfers', controller.listTransfers.bind(controller));

module.exports = router;
