// ========================= routes =========================
// modules/receivable/routes.js
const express = require('express');
const router = express.Router();
const tenantResolver = require('../../middleware/tenantResolver');
const { authenticateJWT } = require('../../middleware/authMiddleware');
const ctrl = require('./controller');

const canReadWrite = async (req,res,next)=>{
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

router.get('/', canReadWrite, ctrl.list.bind(ctrl));
router.get('/:id', canReadWrite, ctrl.get.bind(ctrl));
router.post('/:id/payments', canReadWrite, ctrl.pay.bind(ctrl));

// NEW endpoints
router.post('/:id/settle', canReadWrite, ctrl.settle.bind(ctrl));
router.post('/bulk/settle', canReadWrite, ctrl.bulkSettle.bind(ctrl));
router.post('/bulk/pay-amount', canReadWrite, ctrl.bulkPayAmount.bind(ctrl));


module.exports = router;