// modules/expense/controller.js
const { Op } = require('sequelize');
const TenantModelLoader = require('../../tenants/loader');

function toNull(v) {
    return v === undefined || v === null || v === '' ? null : v;
}
function toNum(v, d=0) {
    if (v === '' || v === null || v === undefined) return d;
    const n = Number(v);
    return Number.isFinite(n) ? n : d;
}
function toDateOrNull(v) {
    if (!v) return null;
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
}

class ExpenseController {
    _m(schema){
        return {
            Expense: TenantModelLoader.getModel('Expense', schema),
            Product: TenantModelLoader.getModel('Product', schema),
            RawMaterial: TenantModelLoader.getModel('RawMaterial', schema),
            RawMaterialStock: TenantModelLoader.getModel('RawMaterialStock', schema),
            RawMaterialMove: TenantModelLoader.getModel('RawMaterialMove', schema),
            Payable: TenantModelLoader.getModel('Payable', schema),
            PayableSchedule: TenantModelLoader.getModel('PayableSchedule', schema),
        };
    }

    async list(req,res){
        try{
            const schema = req.schema; const { type, branch_id, date_from, date_to, page=1, limit=10 } = req.query;
            const { Expense } = this._m(schema);
            const where = {};
            if(type) where.expense_type = type;
            if(branch_id) where.branch_id = branch_id;
            if(date_from || date_to){
                where.spent_at = {};
                if(date_from) where.spent_at[Op.gte] = new Date(date_from);
                if(date_to) where.spent_at[Op.lte] = new Date(date_to);
            }
            const offset = (parseInt(page)-1)*parseInt(limit);
            const { count, rows } = await Expense.findAndCountAll({
                where,
                order:[['spent_at','DESC']],
                limit:parseInt(limit), offset
            });
            res.json({ expenses: rows, pagination:{ page:parseInt(page), limit:parseInt(limit), total:count, pages: Math.ceil(count/parseInt(limit)) }});
        }catch(e){ console.error(e); res.status(500).json({error:'SERVER_ERROR'}); }
    }

    async get(req,res){
        try{
            const schema = req.schema; const { id } = req.params;
            const { Expense } = this._m(schema);
            const exp = await Expense.findByPk(id);
            if(!exp) return res.status(404).json({error:'EXPENSE_NOT_FOUND'});
            res.json({ expense: exp });
        }catch(e){ console.error(e); res.status(500).json({error:'SERVER_ERROR'}); }
    }

    async create(req,res){
        try{
            const schema = req.schema; const u = req.user;
            const {
                expense_type,
                branch_id,            // bisa "" dari FE
                employee_id,
                supplier_name=null,
                product_id,
                rm_id,
                qty,
                unit_cost,
                total,
                payment_status='lunas',
                transaction_type='tunai',
                paid_amount=0,
                spent_at,
                description=null
            } = req.body;

            if(!expense_type || total==null) return res.status(400).json({error:'INVALID_PAYLOAD'});

            // 🔧 Normalisasi input
            const payload = {
                expense_type,
                branch_id: toNull(branch_id),
                employee_id: toNull(employee_id),
                supplier_name: supplier_name ?? null,
                product_id: toNull(product_id),
                rm_id: toNull(rm_id),
                description: description ?? null,
                qty: toNull(qty) === null ? null : toNum(qty, null),
                unit_cost: toNull(unit_cost) === null ? null : toNum(unit_cost, null),
                total: toNum(total, 0),
                payment_status,
                transaction_type,
                paid_amount: toNum(paid_amount, 0),
                balance: Math.max(0, toNum(total, 0) - toNum(paid_amount, 0)),
                spent_at: toDateOrNull(spent_at) || new Date(),
            };

            const m = this._m(schema);
            const sequelize = m.Expense.sequelize;

            const out = await sequelize.transaction(async (tx)=>{
                const exp = await m.Expense.create(payload, { transaction: tx });

                // Stock IN/adjustment terkait pembelian
                if(expense_type==='raw_material_purchase' && payload.rm_id && payload.qty){
                    await m.RawMaterialStock.create({ rm_id: payload.rm_id, branch_id: payload.branch_id, qty: Number(payload.qty) }, { transaction: tx });
                    await m.RawMaterialMove.create({
                        rm_id: payload.rm_id, from_branch_id: null, to_branch_id: payload.branch_id, qty: Number(payload.qty), type: 'in', note: 'purchase'
                    }, { transaction: tx });
                } else if(expense_type==='product_purchase' && payload.product_id && payload.qty){
                    const p = await m.Product.findByPk(payload.product_id, { transaction: tx });
                    if(p && p.is_stock){
                        await p.update({ stock: Number(p.stock||0) + Number(payload.qty) }, { transaction: tx });
                    }
                }

                // Auto payable jika hutang
                let payable = null;
                if(payload.payment_status==='hutang' && payload.balance>0){
                    payable = await m.Payable.create({
                        expense_id: exp.id,
                        supplier_name: payload.supplier_name || 'Unknown',
                        total_due: payload.balance,
                        balance: payload.balance,
                        installments_count: 1
                    }, { transaction: tx });

                    await m.PayableSchedule.create({
                        payable_id: payable.id, installment_no:1,
                        due_at: new Date(Date.now()+14*86400000),
                        amount: payload.balance, paid_amount:0, status:'unpaid'
                    }, { transaction: tx });
                }

                return { exp, payable };
            });

            res.status(201).json({ message:'Expense created', ...out });
        }catch(e){ console.error(e); res.status(500).json({error:'SERVER_ERROR'}); }
    }

    async update(req,res){
        try{
            const schema = req.schema; const { id } = req.params;
            const { Expense } = this._m(schema);
            const exp = await Expense.findByPk(id); if(!exp) return res.status(404).json({error:'EXPENSE_NOT_FOUND'});

            // 🔧 Normalisasi sebagian field yang sering kosong
            const body = { ...req.body };
            if ('branch_id' in body) body.branch_id = toNull(body.branch_id);
            if ('employee_id' in body) body.employee_id = toNull(body.employee_id);
            if ('product_id' in body) body.product_id = toNull(body.product_id);
            if ('rm_id' in body) body.rm_id = toNull(body.rm_id);
            if ('qty' in body) body.qty = toNull(body.qty) === null ? null : toNum(body.qty, null);
            if ('unit_cost' in body) body.unit_cost = toNull(body.unit_cost) === null ? null : toNum(body.unit_cost, null);
            if ('total' in body) body.total = toNum(body.total, 0);
            if ('paid_amount' in body) body.paid_amount = toNum(body.paid_amount, 0);
            if ('spent_at' in body) body.spent_at = toDateOrNull(body.spent_at);

            // Recompute balance if numbers provided
            if ('total' in body || 'paid_amount' in body) {
                const total = 'total' in body ? body.total : exp.total;
                const paid  = 'paid_amount' in body ? body.paid_amount : exp.paid_amount;
                body.balance = Math.max(0, Number(total) - Number(paid));
            }

            await exp.update(body);
            res.json({ message:'Expense updated', expense: exp });
        }catch(e){ console.error(e); res.status(500).json({error:'SERVER_ERROR'}); }
    }

    async remove(req,res){
        try{
            const schema = req.schema; const { id } = req.params;
            const { Expense } = this._m(schema);
            const exp = await Expense.findByPk(id); if(!exp) return res.status(404).json({error:'EXPENSE_NOT_FOUND'});
            await exp.destroy();
            res.json({ message:'Expense deleted' });
        }catch(e){ console.error(e); res.status(500).json({error:'SERVER_ERROR'}); }
    }
}

module.exports = new ExpenseController();
