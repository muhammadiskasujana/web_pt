const express = require('express');
const userRoleController = require('./controller');
const { authenticateJWT, requireMaster } = require('../../middleware/authMiddleware');

const router = express.Router();

// All user role routes require authentication and master role
router.use(authenticateJWT, requireMaster);

// GET all user roles
router.get('/', userRoleController.getAll);

// GET user role by ID
router.get('/:id', userRoleController.getById);

// POST create user role
router.post('/', userRoleController.create);

// PUT update user role
router.put('/:id', userRoleController.update);

// DELETE user role
router.delete('/:id', userRoleController.delete);

module.exports = router;