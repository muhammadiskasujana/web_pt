const express = require('express');
const userController = require('./controller');
const { authenticateJWT, requireMaster } = require('../../middleware/authMiddleware');
const tenantResolver = require('../../middleware/tenantResolver');

const router = express.Router();

// Middleware: cek boleh kelola user (master, atau tenant owner/admin)
const canManageUsers = async (req, res, next) => {
    const currentUser = req.user;

    if (currentUser?.role === 'master') return next();

    if (currentUser?.role === 'tenant') {
        const schema = req.schema;
        if (!schema) {
            return res.status(400).json({ error: 'Tenant context missing', code: 'TENANT_REQUIRED' });
        }

        try {
            const TenantModelLoader = require('../../tenants/loader');
            const User = TenantModelLoader.getModel('User', schema);
            const tenantUser = await User.findByPk(currentUser.userId);

            if (!tenantUser || !['owner', 'admin'].includes(tenantUser.role)) {
                return res.status(403).json({
                    error: 'Only owners and admins can manage users in tenant',
                    code: 'INSUFFICIENT_PERMISSIONS'
                });
            }

            return next();
        } catch (error) {
            console.error('User permission check error:', error);
            return res.status(500).json({ error: 'Permission check failed', code: 'SERVER_ERROR' });
        }
    }

    return res.status(403).json({ error: 'Insufficient permissions', code: 'INSUFFICIENT_PERMISSIONS' });
};

// ============== Public routes (no auth) ==============
router.post('/validate-device', tenantResolver, userController.validateDevice.bind(userController));
router.post('/register', tenantResolver, userController.register.bind(userController));

// Password reset (OTP)
router.post('/request-password-reset', tenantResolver, userController.requestPasswordReset.bind(userController));
router.post('/reset-password', tenantResolver, userController.resetPasswordWithOTP.bind(userController));

// ============== Authenticated routes ==============
router.use(authenticateJWT);

// ---- Master-scoped (operasi lintas tenant) ----
// NOTE: tenantResolver di sini akan membaca req.params.tenantSchema (pastikan middleware mendukungnya)
router.get('/master/:tenantSchema', tenantResolver, canManageUsers, userController.getAll.bind(userController));
router.get('/master/:tenantSchema/:id', tenantResolver, canManageUsers, userController.getById.bind(userController));
router.post('/master/:tenantSchema', tenantResolver, requireMaster, userController.create.bind(userController));
router.put('/master/:tenantSchema/:id', tenantResolver, canManageUsers, userController.update.bind(userController));
router.delete('/master/:tenantSchema/:id', tenantResolver, canManageUsers, userController.delete.bind(userController));
router.put('/master/:tenantSchema/:id/reset-device', tenantResolver, canManageUsers, userController.resetDevice.bind(userController));

// ---- Tenant-scoped ----
router.get('/', tenantResolver, canManageUsers, userController.getAll.bind(userController));
router.get('/roles', tenantResolver, canManageUsers, userController.getAvailableRoles.bind(userController));
router.get('/:id', tenantResolver, canManageUsers, userController.getById.bind(userController));
router.post('/', tenantResolver, canManageUsers, userController.create.bind(userController));
router.put('/:id', tenantResolver, canManageUsers, userController.update.bind(userController));
router.delete('/:id', tenantResolver, canManageUsers, userController.delete.bind(userController));
router.put('/:id/reset-device', tenantResolver, canManageUsers, userController.resetDevice.bind(userController));

module.exports = router;
