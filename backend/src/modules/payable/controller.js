// modules/payable/controller.js
const { Op } = require('sequelize');
const TenantModelLoader = require('../../tenants/loader');

class PayableController {
    _m(schema){
        return {
            Payable: TenantModelLoader.getModel('Payable', schema),
            PayableSchedule: TenantModelLoader.getModel('PayableSchedule', schema),
            PayablePayment: TenantModelLoader.getModel('PayablePayment', schema),
            Expense: TenantModelLoader.getModel('Expense', schema),
        };
    }

    async list(req,res){
        try{
            const schema = req.schema; const { status, supplier_name, page=1, limit=10 } = req.query;
            const { Payable } = this._m(schema);
            const where = {};
            if(status) where.status = status;
            if(supplier_name) where.supplier_name = { [Op.iLike]: `%${supplier_name}%` };

            const offset = (parseInt(page)-1)*parseInt(limit);
            const { count, rows } = await Payable.findAndCountAll({ where, order:[[ 'createdAt','DESC' ]], limit:parseInt(limit), offset });
            res.json({ payables: rows, pagination:{ page:parseInt(page), limit:parseInt(limit), total:count, pages: Math.ceil(count/parseInt(limit)) }});
        }catch(e){ console.error(e); res.status(500).json({error:'SERVER_ERROR'}); }
    }

    async get(req,res){
        try{
            const schema = req.schema; const { id } = req.params;
            const m = this._m(schema);
            const p = await m.Payable.findByPk(id, { include:[{ model: m.PayableSchedule, as:'schedules' }, { model: m.PayablePayment, as:'payments' }] });
            if(!p) return res.status(404).json({error:'PAYABLE_NOT_FOUND'});
            res.json({ payable: p });
        }catch(e){ console.error(e); res.status(500).json({error:'SERVER_ERROR'}); }
    }

    async pay(req,res){
        try{
            const schema = req.schema; const { id } = req.params;
            const { amount, method='transfer', reference_no=null, paid_at=new Date() } = req.body;
            if(!amount || amount<=0) return res.status(400).json({error:'INVALID_AMOUNT'});

            const m = this._m(schema);
            const p = await m.Payable.findByPk(id); if(!p) return res.status(404).json({error:'PAYABLE_NOT_FOUND'});
            const exp = await m.Expense.findByPk(p.expense_id);

            const sequelize = p.sequelize;
            await sequelize.transaction(async (tx)=>{
                // save payment
                await m.PayablePayment.create({ payable_id:id, amount:Number(amount), method, reference_no, paid_at }, { transaction: tx });

                // apply to schedules
                let rem = Number(amount);
                const scheds = await m.PayableSchedule.findAll({ where:{ payable_id: id }, order:[[ 'installment_no','ASC' ]], transaction: tx });
                for(const s of scheds){
                    if(rem<=0) break;
                    const left = s.amount - s.paid_amount;
                    const payNow = Math.min(left, rem);
                    if(payNow>0){
                        const paid_amount = s.paid_amount + payNow;
                        const status = paid_amount===s.amount ? 'paid' : 'partial';
                        await s.update({ paid_amount, status }, { transaction: tx });
                        rem -= payNow;
                    }
                }

                // update payable & expense
                const newBal = Math.max(0, p.balance - Number(amount));
                if(newBal===0){
                    await p.update({ balance:0, status:'closed', next_due_at:null }, { transaction: tx });
                }else{
                    const next = await m.PayableSchedule.findOne({ where:{ payable_id:id, status:{ [Op.ne ]:'paid' } }, order:[[ 'due_at','ASC' ]], transaction: tx });
                    await p.update({ balance:newBal, next_due_at: next?.due_at || p.next_due_at }, { transaction: tx });
                }
                if(exp){
                    const newPaid = Math.min(exp.total, (exp.paid_amount || 0) + Number(amount));
                    await exp.update({ paid_amount:newPaid, balance: exp.total - newPaid, payment_status: (exp.total-newPaid)===0?'lunas':'hutang' }, { transaction: tx });
                }
            });

            res.json({ message:'Payable payment recorded', payable: await m.Payable.findByPk(id) });
        }catch(e){ console.error(e); res.status(500).json({error:'SERVER_ERROR'}); }
    }

    // ========================= NEW: settle (single) =========================
    // POST /:id/settle  { method?, reference_no?, paid_at? }
    async settle(req,res){
        try{
            const schema = req.schema; const { id } = req.params;
            const { method='transfer', reference_no=null, paid_at=new Date() } = req.body || {};
            const m = this._m(schema);
            const p = await m.Payable.findByPk(id);
            if(!p) return res.status(404).json({ error:'PAYABLE_NOT_FOUND' });
            if(p.status === 'closed' || p.balance === 0){
                return res.json({ message:'Payable already closed', payable: p });
            }
            const exp = await m.Expense.findByPk(p.expense_id);
            const amount = p.balance; // pay the rest

            const sequelize = p.sequelize;
            const updated = await sequelize.transaction(async (tx)=>{
                await m.PayablePayment.create({ payable_id: id, amount, method, reference_no, paid_at }, { transaction: tx });

                // mark all remaining schedules as paid
                const scheds = await m.PayableSchedule.findAll({ where:{ payable_id: id }, order:[[ 'installment_no','ASC' ]], transaction: tx });
                let rem = amount;
                for(const s of scheds){
                    if(rem<=0) break;
                    const left = Math.max(0, s.amount - s.paid_amount);
                    const payNow = Math.min(left, rem);
                    const paid_amount = s.paid_amount + payNow;
                    const status = paid_amount >= s.amount ? 'paid' : (paid_amount>0 ? 'partial' : s.status);
                    await s.update({ paid_amount, status }, { transaction: tx });
                    rem -= payNow;
                }

                await p.update({ balance:0, status:'closed', next_due_at:null }, { transaction: tx });

                if(exp){
                    let newPaid = (exp.paid_amount || 0) + amount;
                    if(newPaid>exp.total) newPaid = exp.total;
                    await exp.update({ paid_amount:newPaid, balance: exp.total - newPaid, payment_status: (exp.total - newPaid)===0 ? 'lunas' : 'hutang' }, { transaction: tx });
                }

                return m.Payable.findByPk(id, { transaction: tx });
            });

            res.json({ message:'Payable settled (lunas).', payable: updated });
        }catch(e){ console.error(e); res.status(500).json({error:'SERVER_ERROR'}); }
    }

    // ========================= NEW: bulk settle =========================
    // POST /bulk/settle  { ids: string[], method?, reference_no?, paid_at? }
    async bulkSettle(req,res){
        try{
            const schema = req.schema; const { ids=[], method='transfer', reference_no=null, paid_at=new Date() } = req.body || {};
            if(!Array.isArray(ids) || ids.length===0) return res.status(400).json({ error:'NO_IDS' });
            const m = this._m(schema);

            const results = { success:[], skipped:[], failed:[] };
            // process per payable in isolated transactions to avoid long locks
            for(const id of ids){
                try{
                    const p = await m.Payable.findByPk(id);
                    if(!p){ results.failed.push({ id, error:'PAYABLE_NOT_FOUND' }); continue; }
                    if(p.status==='closed' || p.balance===0){ results.skipped.push({ id, reason:'ALREADY_CLOSED' }); continue; }

                    const exp = await m.Expense.findByPk(p.expense_id);
                    const amount = p.balance;
                    const sequelize = p.sequelize;

                    await sequelize.transaction(async (tx)=>{
                        await m.PayablePayment.create({ payable_id: id, amount, method, reference_no, paid_at }, { transaction: tx });

                        // schedules
                        const scheds = await m.PayableSchedule.findAll({ where:{ payable_id: id }, order:[[ 'installment_no','ASC' ]], transaction: tx });
                        let rem = amount;
                        for(const s of scheds){
                            if(rem<=0) break;
                            const left = Math.max(0, s.amount - s.paid_amount);
                            const payNow = Math.min(left, rem);
                            const paid_amount = s.paid_amount + payNow;
                            const status = paid_amount >= s.amount ? 'paid' : (paid_amount>0 ? 'partial' : s.status);
                            await s.update({ paid_amount, status }, { transaction: tx });
                            rem -= payNow;
                        }

                        await p.update({ balance:0, status:'closed', next_due_at:null }, { transaction: tx });

                        if(exp){
                            let newPaid = (exp.paid_amount || 0) + amount;
                            if(newPaid>exp.total) newPaid = exp.total;
                            await exp.update({ paid_amount:newPaid, balance: exp.total - newPaid, payment_status: (exp.total - newPaid)===0 ? 'lunas' : 'hutang' }, { transaction: tx });
                        }
                    });

                    results.success.push({ id });
                }catch(err){
                    console.error('bulkSettle item error', id, err);
                    results.failed.push({ id, error:'SETTLE_FAILED' });
                }
            }

            res.json({ message:'Bulk settle processed', results });
        }catch(e){ console.error(e); res.status(500).json({error:'SERVER_ERROR'}); }
    }
}

module.exports = new PayableController();