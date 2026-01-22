const express = require('express');
const { authenticateJWT } = require('../../middleware/authMiddleware');
const tenantResolver = require('../../middleware/tenantResolver');
const controller = require('./controller');

const router = express.Router();
router.use(authenticateJWT, tenantResolver);

router.get('/', controller.list.bind(controller));
router.post('/', controller.create.bind(controller));
router.get('/:id', controller.get.bind(controller));
router.put('/:id', controller.update.bind(controller));
router.delete('/:id', controller.remove.bind(controller));

router.get('/:id/depreciation/schedule', controller.depreciationSchedule.bind(controller));

module.exports = router;
