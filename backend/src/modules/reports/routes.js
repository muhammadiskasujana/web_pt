// modules/reports/routes.js
const express = require('express');
const router = express.Router();
const tenantResolver = require('../../middleware/tenantResolver');
const { authenticateJWT } = require('../../middleware/authMiddleware');
const ctrl = require('./controller');

const canView = async (req,res,next)=>{
    const u = req.user;
    if(u.role==='master') return next();
    if(u.role==='tenant'){
        const User = require('../../tenants/loader').getModel('User', req.schema);
        const me = await User.findByPk(u.userId);
        if(['owner','admin','manager','viewer'].includes(me?.role)) return next();
    }
    return res.status(403).json({ error:'INSUFFICIENT_PERMISSIONS' });
};

router.use(authenticateJWT, tenantResolver);

router.get('/sales/summary', canView, ctrl.salesSummary.bind(ctrl));
router.get('/expenses/summary', canView, ctrl.expensesSummary.bind(ctrl));
router.get('/top-products', canView, ctrl.topProducts.bind(ctrl));
router.get('/charts/sales-vs-expenses', canView, ctrl.salesVsExpensesChart.bind(ctrl));
router.get('/charts/cashflow',          canView, ctrl.cashflowChart.bind(ctrl));
router.get('/charts/top-products',      canView, ctrl.topProductsChart.bind(ctrl)); // alias topProducts tapi format chart

module.exports = router;
