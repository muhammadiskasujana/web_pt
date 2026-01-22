const express = require('express');
const router = express.Router();
const { authenticateJWT } = require('../../middleware/authMiddleware');
const tenantResolver = require('../../middleware/tenantResolver');
const upload = require('../product/uploader'); // reuse

const controller = require('./controller');

router.use(authenticateJWT, tenantResolver);

router.get('/', controller.get.bind(controller));
router.post('/', upload.single('logo'), controller.create.bind(controller));
router.put('/', upload.single('logo'), controller.update.bind(controller));
router.delete('/logo', controller.deleteLogo.bind(controller));

module.exports = router;
