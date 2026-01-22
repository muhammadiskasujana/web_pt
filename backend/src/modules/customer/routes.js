// modules/customer/routes.js
const express = require('express');
const router = express.Router();

const { authenticateJWT } = require('../../middleware/authMiddleware');
const tenantResolver = require('../../middleware/tenantResolver');
const controller = require('./controller');

// (opsional) guard sederhana: owner/admin/manager boleh kelola
const canManageCustomers = async (req, res, next) => {
    const currentUser = req.user;
    if (currentUser.role === 'master') return next();

    if (currentUser.role === 'tenant') {
        const schema = req.schema;
        try {
            const TenantModelLoader = require('../../tenants/loader');
            const User = TenantModelLoader.getModel('User', schema);
            const me = await User.findByPk(currentUser.userId);
            if (me && ['owner','admin','manager'].includes(me.role)) return next();
            return res.status(403).json({ error:'Only owner/admin/manager can manage customers', code:'INSUFFICIENT_PERMISSIONS' });
        } catch (e) {
            console.error('canManageCustomers error:', e);
            return res.status(500).json({ error:'Permission check failed', code:'SERVER_ERROR' });
        }
    }
    return res.status(403).json({ error:'Insufficient permissions', code:'INSUFFICIENT_PERMISSIONS' });
};

// All endpoints need auth + tenant
router.use(authenticateJWT, tenantResolver);

// Customers
router.get('/', canManageCustomers, controller.list.bind(controller));
router.get('/:id', canManageCustomers, controller.getById.bind(controller));
router.post('/', canManageCustomers, controller.create.bind(controller));
router.put('/:id', canManageCustomers, controller.update.bind(controller));
router.delete('/:id', canManageCustomers, controller.remove.bind(controller));

// Deposits
router.get('/:customerId/deposits/balance', canManageCustomers, controller.getDepositBalance.bind(controller));
router.get('/:customerId/deposits', canManageCustomers, controller.listDeposits.bind(controller));
router.post('/:customerId/deposits/credit', canManageCustomers, controller.creditDeposit.bind(controller));
router.post('/:customerId/deposits/debit', canManageCustomers, controller.debitDeposit.bind(controller));

// Portfolio
router.get('/:customerId/portfolio', canManageCustomers, controller.portfolio.bind(controller));

// Complaints
router.get('/:customerId/complaints', canManageCustomers, controller.listComplaints.bind(controller));
router.post('/:customerId/complaints', canManageCustomers, controller.createComplaint.bind(controller));
router.put('/:customerId/complaints/:complaintId/status', canManageCustomers, controller.updateComplaintStatus.bind(controller));

module.exports = router;
