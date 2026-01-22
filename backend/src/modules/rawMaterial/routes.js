const express = require('express');
const router = express.Router();
const { authenticateJWT } = require('../../middleware/authMiddleware');
const tenantResolver = require('../../middleware/tenantResolver');
const controller = require('./controller');

router.use(authenticateJWT, tenantResolver);

// categories
router.get('/categories', controller.listCategory.bind(controller));
router.post('/categories', controller.createCategory.bind(controller));
router.put('/categories/:id', controller.updateCategory.bind(controller));
router.delete('/categories/:id', controller.deleteCategory.bind(controller));

// items
router.get('/items', controller.listItem.bind(controller));
router.post('/items', controller.createItem.bind(controller));
router.put('/items/:id', controller.updateItem.bind(controller));
router.delete('/items/:id', controller.deleteItem.bind(controller));

// stock & movements
router.get('/stock', controller.stockByBranch.bind(controller));
router.get('/moves', controller.moves.bind(controller));
router.post('/moves', controller.move.bind(controller)); // purchase/usage/transfer/adjustment

module.exports = router;
