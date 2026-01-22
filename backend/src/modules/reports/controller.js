// modules/reports/controller.js
const { Op, fn, col, literal } = require('sequelize');
const TenantModelLoader = require('../../tenants/loader');

function dateOnly(d){ const dt = new Date(d); dt.setHours(0,0,0,0); return dt; }
function toISODate(d){ return dateOnly(d).toISOString().slice(0,10); }
function rangeDays(from, to){
    const out=[]; const d0 = dateOnly(from); const d1 = dateOnly(to);
    for(let d = new Date(d0); d <= d1; d.setDate(d.getDate()+1)) out.push(toISODate(d));
    return out;
}

class ReportsController {
    _m(schema){
        return {
            SalesOrder: TenantModelLoader.getModel('SalesOrder', schema),
            SalesOrderItem: TenantModelLoader.getModel('SalesOrderItem', schema),
            Expense: TenantModelLoader.getModel('Expense', schema),
            Receivable: TenantModelLoader.getModel('Receivable', schema),
            Payable: TenantModelLoader.getModel('Payable', schema),
            Product: TenantModelLoader.getModel('Product', schema),
        };
    }

    async salesSummary(req,res){
        try{
            const schema = req.schema; const { date_from, date_to, branch_id } = req.query;
            const { SalesOrder } = this._m(schema);
            const where = {};
            if(date_from || date_to){
                where.created_at = {};
                if(date_from) where.created_at[Op.gte] = new Date(date_from);
                if(date_to) where.created_at[Op.lte] = new Date(date_to);
            }
            if(branch_id) where.branch_id = branch_id;

            const total = await SalesOrder.sum('total', { where });
            const paid = await SalesOrder.sum('paid_amount', { where });
            const dpCount = await SalesOrder.count({ where: { ...where, payment_status:'dp' } });

            // series by day
            const series = await SalesOrder.findAll({
                attributes: [
                    [fn('DATE', col('created_at')), 'd'],
                    [fn('SUM', col('total')), 'total']
                ],
                where,
                group: [literal('DATE(created_at)')],
                order: [[literal('DATE(created_at)'), 'ASC']]
            });

            res.json({ total: total||0, paid: paid||0, dp_count: dpCount, series });
        }catch(e){ console.error(e); res.status(500).json({error:'SERVER_ERROR'}); }
    }

    async expensesSummary(req,res){
        try{
            const schema = req.schema; const { date_from, date_to, branch_id } = req.query;
            const { Expense } = this._m(schema);
            const where = {};
            if(date_from || date_to){
                where.spent_at = {};
                if(date_from) where.spent_at[Op.gte] = new Date(date_from);
                if(date_to) where.spent_at[Op.lte] = new Date(date_to);
            }
            if(branch_id) where.branch_id = branch_id;
            const total = await Expense.sum('total', { where });
            res.json({ total: total||0 });
        }catch(e){ console.error(e); res.status(500).json({error:'SERVER_ERROR'}); }
    }

    async topProducts(req,res){
        try{
            const schema = req.schema; const { date_from, date_to, limit=10 } = req.query;
            const { SalesOrderItem, SalesOrder, Product } = this._m(schema);

            const whereSO = {};
            if(date_from || date_to){
                whereSO.created_at = {};
                if(date_from) whereSO.created_at[Op.gte] = new Date(date_from);
                if(date_to)   whereSO.created_at[Op.lte] = new Date(date_to);
            }

            const rows = await SalesOrderItem.findAll({
                attributes: [
                    [col('SalesOrderItem.product_id'), 'product_id'],
                    [fn('SUM', col('SalesOrderItem.subtotal')), 'revenue'],
                    [fn('SUM', col('SalesOrderItem.qty')), 'qty'],
                ],
                include: [{ model: SalesOrder, as:'salesOrder', attributes: [], where: whereSO }],
                group: [col('SalesOrderItem.product_id')],
                order: [[literal('"revenue"'), 'DESC']],
                limit: parseInt(limit)
            });

            const ids = rows.map(r => r.get('product_id'));
            const products = await Product.findAll({ where:{ id: ids }, attributes:['id','name','sku'] });
            const map = new Map(products.map(p=>[p.id, p]));
            const list = rows.map(r=>({
                product_id: r.get('product_id'),
                product_name: map.get(r.get('product_id'))?.name,
                sku: map.get(r.get('product_id'))?.sku,
                revenue: Number(r.get('revenue')),
                qty: Number(r.get('qty')),
            }));

            res.json({ top_products: list });
        }catch(e){ console.error(e); res.status(500).json({error:'SERVER_ERROR'}); }
    }


    async salesVsExpensesChart(req,res){
        try{
            const schema = req.schema; const { date_from, date_to, branch_id } = req.query;
            const from = date_from ? new Date(date_from) : new Date(Date.now()-29*86400000);
            const to   = date_to   ? new Date(date_to)   : new Date();

            const days = rangeDays(from,to);

            const { SalesOrder, Expense } = this._m(schema);
            const whereSO = {}; const whereEX = {};
            if(branch_id){ whereSO.branch_id = branch_id; whereEX.branch_id = branch_id; }
            whereSO.created_at = { [Op.between]: [from, to] };
            whereEX.spent_at   = { [Op.between]: [from, to] };

            // agregasi per hari
            const soRows = await SalesOrder.findAll({
                attributes:[[fn('DATE', col('created_at')), 'd'], [fn('SUM', col('total')),'v']],
                where: whereSO, group:[literal('DATE(created_at)')]
            });
            const exRows = await Expense.findAll({
                attributes:[[fn('DATE', col('spent_at')), 'd'], [fn('SUM', col('total')),'v']],
                where: whereEX, group:[literal('DATE(spent_at)')]
            });

            const salesMap = new Map(soRows.map(r=>[String(r.get('d')), Number(r.get('v'))]));
            const expMap   = new Map(exRows.map(r=>[String(r.get('d')), Number(r.get('v'))]));

            const salesSeries = days.map(d=> salesMap.get(d) || 0);
            const expSeries   = days.map(d=> expMap.get(d) || 0);

            res.json({
                labels: days, // ['2025-02-01', ...]
                series: [
                    { name:'Penjualan', data: salesSeries },
                    { name:'Pengeluaran', data: expSeries },
                ]
            });
        }catch(e){ console.error(e); res.status(500).json({error:'SERVER_ERROR'}); }
    }

    async cashflowChart(req,res){
        try{
            const schema = req.schema; const { date_from, date_to } = req.query;
            const from = date_from ? new Date(date_from) : new Date(Date.now()-29*86400000);
            const to   = date_to   ? new Date(date_to)   : new Date();
            const days = rangeDays(from,to);

            const { SalesOrder, Expense, ReceivablePayment, PayablePayment } = {
                SalesOrder: TenantModelLoader.getModel('SalesOrder', schema),
                Expense: TenantModelLoader.getModel('Expense', schema),
                ReceivablePayment: TenantModelLoader.getModel('ReceivablePayment', schema),
                PayablePayment: TenantModelLoader.getModel('PayablePayment', schema),
            };

            // cash-in: penjualan lunas (paid_amount pada hari tsb) + pembayaran piutang
            const soRows = await SalesOrder.findAll({
                attributes:[[fn('DATE', col('created_at')), 'd'], [fn('SUM', col('paid_amount')),'v']],
                where:{ created_at:{ [Op.between]: [from,to] } }, group:[literal('DATE(created_at)')]
            });
            const rcPayRows = await ReceivablePayment.findAll({
                attributes:[[fn('DATE', col('paid_at')), 'd'], [fn('SUM', col('amount')),'v']],
                where:{ paid_at:{ [Op.between]: [from,to] } }, group:[literal('DATE(paid_at)')]
            });

            // cash-out: pengeluaran lunas + pembayaran utang
            const exRows = await Expense.findAll({
                attributes:[[fn('DATE', col('spent_at')), 'd'], [fn('SUM', col('paid_amount')),'v']],
                where:{ spent_at:{ [Op.between]: [from,to] } }, group:[literal('DATE(spent_at)')]
            });
            const pyPayRows = await PayablePayment.findAll({
                attributes:[[fn('DATE', col('paid_at')), 'd'], [fn('SUM', col('amount')),'v']],
                where:{ paid_at:{ [Op.between]: [from,to] } }, group:[literal('DATE(paid_at)')]
            });

            const map = (rows)=> new Map(rows.map(r=>[String(r.get('d')), Number(r.get('v'))]));
            const soMap = map(soRows), rcMap = map(rcPayRows), exMap = map(exRows), pyMap = map(pyPayRows);

            const cashIn  = days.map(d => (soMap.get(d)||0) + (rcMap.get(d)||0));
            const cashOut = days.map(d => (exMap.get(d)||0) + (pyMap.get(d)||0));
            const net     = cashIn.map((v,i)=> v - cashOut[i]);

            res.json({
                labels: days,
                series: [
                    { name:'Cash In', data: cashIn },
                    { name:'Cash Out', data: cashOut },
                    { name:'Net', data: net },
                ]
            });
        }catch(e){ console.error(e); res.status(500).json({error:'SERVER_ERROR'}); }
    }

    async topProductsChart(req,res){
        try{
            const schema = req.schema; const { date_from, date_to, limit=10 } = req.query;
            const { SalesOrderItem, SalesOrder, Product } = this._m(schema);

            const whereSO = {};
            if(date_from || date_to){
                whereSO.created_at = {};
                if(date_from) whereSO.created_at[Op.gte] = new Date(date_from);
                if(date_to)   whereSO.created_at[Op.lte] = new Date(date_to);
            }

            const rows = await SalesOrderItem.findAll({
                attributes: [
                    [col('SalesOrderItem.product_id'), 'product_id'],
                    [fn('SUM', col('SalesOrderItem.subtotal')), 'revenue'],
                    [fn('SUM', col('SalesOrderItem.qty')), 'qty'],
                ],
                include: [{ model: SalesOrder, as:'salesOrder', attributes: [], where: whereSO }],
                group: [col('SalesOrderItem.product_id')],
                order: [[literal('"revenue"'), 'DESC']],
                limit: parseInt(limit)
            });

            const ids = rows.map(r=>r.get('product_id'));
            const products = await Product.findAll({ where:{ id: ids }, attributes:['id','name','sku'] });
            const map = new Map(products.map(p=>[p.id, p]));

            const labels = rows.map(r => map.get(r.get('product_id'))?.name || 'Unknown');
            const seriesRevenue = rows.map(r => Number(r.get('revenue')));
            const seriesQty     = rows.map(r => Number(r.get('qty')));

            res.json({
                labels,
                series: [
                    { name:'Revenue', data: seriesRevenue },
                    { name:'Qty',     data: seriesQty }
                ]
            });
        }catch(e){ console.error(e); res.status(500).json({error:'SERVER_ERROR'}); }
    }

}

module.exports = new ReportsController();
