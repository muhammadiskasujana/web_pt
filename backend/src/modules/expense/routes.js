// modules/expense/routes.js
const express = require('express');
const router = express.Router();
const tenantResolver = require('../../middleware/tenantResolver');
const { authenticateJWT } = require('../../middleware/authMiddleware');
const ctrl = require('./controller');

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

router.get('/', ctrl.list.bind(ctrl));
router.get('/:id', ctrl.get.bind(ctrl));
router.post('/', canWrite, ctrl.create.bind(ctrl));
router.put('/:id', canWrite, ctrl.update.bind(ctrl));
router.delete('/:id', canWrite, ctrl.remove.bind(ctrl));

module.exports = router;
