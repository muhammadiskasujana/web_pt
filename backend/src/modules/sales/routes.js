// modules/sales/routes.js
const express = require('express');
const router = express.Router();
const tenantResolver = require('../../middleware/tenantResolver');
const { authenticateJWT } = require('../../middleware/authMiddleware');
const ctrl = require('./controller');

// simple guard: owner/admin/manager for write
const canWrite = async (req,res,next)=>{
    const u = req.user;
    if(u.role==='master') return next();
    if(u.role==='tenant'){
        const User = require('../../tenants/loader').getModel('User', req.schema);
        const me = await User.findByPk(u.userId);
        if(['owner','admin','manager'].includes(me?.role)) return next();
    }
    return res.status(403).json({ error:'INSUFFICIENT_PERMISSIONS' });
};

router.use(authenticateJWT, tenantResolver);

// sales
router.get('/', ctrl.getAll.bind(ctrl));
router.get('/revision-requests', canWrite, ctrl.listRevisionRequests.bind(ctrl)); // ✅ harus di atas '/:id'
router.get('/:id', ctrl.getById.bind(ctrl));
// CETAK NOTA & SPK (HTML siap print)
router.get('/:id/print/nota', ctrl.printNota.bind(ctrl));
router.get('/:id/print/spk',  ctrl.printSPK.bind(ctrl));
router.post('/', canWrite, ctrl.create.bind(ctrl));
router.put('/:id', canWrite, ctrl.update.bind(ctrl));
router.delete('/:id', canWrite, ctrl.remove.bind(ctrl));

// revision / delete requests
router.post('/:id/revision-requests', canWrite, ctrl.createRevisionRequest.bind(ctrl));
router.post('/revision-requests/:reqId/approve', canWrite, ctrl.approveRequest.bind(ctrl));
router.post('/revision-requests/:reqId/reject', canWrite, ctrl.approveRequest.bind(ctrl));

// payments
router.post('/:id/payments', canWrite, ctrl.pay.bind(ctrl));

module.exports = router;
