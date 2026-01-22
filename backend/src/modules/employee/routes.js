const express = require('express');
const router = express.Router();
const { authenticateJWT } = require('../../middleware/authMiddleware');
const tenantResolver = require('../../middleware/tenantResolver');
const upload = require('../product/uploader'); // reuse
const controller = require('./controller');

router.use(authenticateJWT, tenantResolver);

router.get('/', controller.list.bind(controller));
router.post('/', upload.single('photo'), controller.create.bind(controller));
router.get('/:id', controller.get.bind(controller));
router.put('/:id', upload.single('photo'), controller.update.bind(controller));
router.delete('/:id', controller.remove.bind(controller));
router.delete('/:id/photo', controller.deletePhoto.bind(controller));
// routes.js
router.put('/:id/active', controller.setActive.bind(controller));      // with body is_active
router.put('/:id/activate', controller.activate.bind(controller));     // no body
router.put('/:id/deactivate', controller.deactivate.bind(controller)); // no body

// buat akun user dari karyawan
router.post('/:id/create-user', controller.createUserForEmployee.bind(controller));

module.exports = router;
