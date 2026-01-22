// modules/receivable/controller.js
const { Op } = require('sequelize');
const TenantModelLoader = require('../../tenants/loader');

class ReceivableController {
    _m(schema){
        return {
            Receivable: TenantModelLoader.getModel('Receivable', schema),
            ReceivableSchedule: TenantModelLoader.getModel('ReceivableSchedule', schema),
            ReceivablePayment: TenantModelLoader.getModel('ReceivablePayment', schema),
            SalesOrder: TenantModelLoader.getModel('SalesOrder', schema),
        };
    }

    async list(req,res){
        try{
            const schema = req.schema; const { status, customer_name, page=1, limit=10 } = req.query;
            const { Receivable } = this._m(schema);
            const where = {};
            if(status) where.status = status;
            if(customer_name) where.customer_name = { [Op.iLike]: `%${customer_name}%` };

            const offset = (parseInt(page)-1)*parseInt(limit);
            const { count, rows } = await Receivable.findAndCountAll({
                where, order:[['createdAt','DESC']], limit:parseInt(limit), offset
            });
            res.json({ receivables: rows, pagination:{ page:parseInt(page), limit:parseInt(limit), total:count, pages: Math.ceil(count/parseInt(limit)) }});
        }catch(e){ console.error(e); res.status(500).json({error:'SERVER_ERROR'}); }
    }

    async get(req,res){
        try{
            const schema = req.schema; const { id } = req.params;
            const { Receivable, ReceivableSchedule, ReceivablePayment } = this._m(schema);
            const rc = await Receivable.findByPk(id, {
                include:[
                    { model: ReceivableSchedule, as:'schedules' },
                    { model: ReceivablePayment, as:'payments' }
                ]
            });
            if(!rc) return res.status(404).json({error:'RECEIVABLE_NOT_FOUND'});
            res.json({ receivable: rc });
        }catch(e){ console.error(e); res.status(500).json({error:'SERVER_ERROR'}); }
    }

    async pay(req,res){
        try{
            const schema = req.schema; const { id } = req.params;
            const { amount, method='tunai', reference_no=null, paid_at=new Date() } = req.body;
            if(!amount || amount<=0) return res.status(400).json({error:'INVALID_AMOUNT'});

            const m = this._m(schema);
            const rc = await m.Receivable.findByPk(id); if(!rc) return res.status(404).json({error:'RECEIVABLE_NOT_FOUND'});
            const so = await m.SalesOrder.findByPk(rc.sales_order_id);

            const sequelize = rc.sequelize;
            await sequelize.transaction(async (tx)=>{
                await m.ReceivablePayment.create({ receivable_id: id, amount:Number(amount), method, reference_no, paid_at }, { transaction: tx });

                // update schedules
                let rem = Number(amount);
                const scheds = await m.ReceivableSchedule.findAll({ where:{ receivable_id: id }, order:[['installment_no','ASC']], transaction: tx });
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

                const newRcBal = Math.max(0, rc.balance - Number(amount));
                if(newRcBal===0){
                    await rc.update({ balance:0, status:'closed', next_due_at:null }, { transaction: tx });
                }else{
                    const next = await m.ReceivableSchedule.findOne({ where:{ receivable_id: id, status:{ [Op.ne]:'paid' } }, order:[['due_at','ASC']], transaction: tx });
                    await rc.update({ balance:newRcBal, next_due_at: next?.due_at || rc.next_due_at }, { transaction: tx });
                }

                // reflect to SO
                if(so){
                    let newPaid = so.paid_amount + Number(amount);
                    if(newPaid>so.total) newPaid = so.total;
                    await so.update({ paid_amount:newPaid, balance: so.total - newPaid, payment_status: (so.total - newPaid)===0 ? 'lunas' : so.payment_status }, { transaction: tx });
                }
            });

            res.json({ message:'Receivable payment recorded', receivable: await m.Receivable.findByPk(id) });
        }catch(e){ console.error(e); res.status(500).json({error:'SERVER_ERROR'}); }
    }

    // ========================= NEW: settle (single) =========================
    // POST /:id/settle  { method?, reference_no?, paid_at? }
    async settle(req,res){
        try{
            const schema = req.schema; const { id } = req.params;
            const { method='tunai', reference_no=null, paid_at=new Date() } = req.body || {};
            const m = this._m(schema);
            const rc = await m.Receivable.findByPk(id);
            if(!rc) return res.status(404).json({ error:'RECEIVABLE_NOT_FOUND' });
            if(rc.status === 'closed' || rc.balance === 0){
                return res.json({ message:'Receivable already closed', receivable: rc });
            }
            const so = await m.SalesOrder.findByPk(rc.sales_order_id);
            const amount = rc.balance; // pay the rest

            const sequelize = rc.sequelize;
            const updated = await sequelize.transaction(async (tx)=>{
                await m.ReceivablePayment.create({ receivable_id: id, amount, method, reference_no, paid_at }, { transaction: tx });

                // mark all remaining schedules as paid
                const scheds = await m.ReceivableSchedule.findAll({ where:{ receivable_id: id }, order:[['installment_no','ASC']], transaction: tx });
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

                await rc.update({ balance:0, status:'closed', next_due_at:null }, { transaction: tx });

                if(so){
                    let newPaid = so.paid_amount + amount;
                    if(newPaid>so.total) newPaid = so.total;
                    await so.update({ paid_amount:newPaid, balance: so.total - newPaid, payment_status: (so.total - newPaid)===0 ? 'lunas' : so.payment_status }, { transaction: tx });
                }

                return m.Receivable.findByPk(id, { transaction: tx });
            });

            res.json({ message:'Receivable settled (lunas).', receivable: updated });
        }catch(e){ console.error(e); res.status(500).json({error:'SERVER_ERROR'}); }
    }

    // ========================= NEW: bulk pay by amount (ordered) =========================
// POST /receivables/bulk/pay-amount
// Body: { ids: string[], total_amount: number, method?: 'tunai'|'transfer', reference_no?: string, paid_at?: Date }
// Aturan: semua ID kecuali terakhir diusahakan lunas penuh; sisa (jika ada) dibayarkan parsial ke ID terakhir.
    async bulkPayAmount(req, res) {
        try {
            const schema = req.schema;
            const {
                ids = [],
                total_amount,                // boleh
                amount,                      // alias dari FE
                method = 'tunai',
                reference_no = null,
                paid_at = new Date(),
            } = req.body || {};


            if (!Array.isArray(ids) || ids.length === 0) {
                return res.status(400).json({ error: 'NO_IDS' });
            }
            const TOTAL = Number(total_amount ?? amount);
            if (!Number.isFinite(TOTAL) || TOTAL <= 0) {
                return res.status(400).json({ error: 'INVALID_TOTAL_AMOUNT' });
            }

            const m = this._m(schema);

            // Ambil receivable yang dipilih, urut sesuai ids
            const rcs = [];
            for (const id of ids) {
                const rc = await m.Receivable.findByPk(id);
                if (!rc) {
                    return res.status(404).json({ error: `RECEIVABLE_NOT_FOUND:${id}` });
                }
                rcs.push(rc);
            }

            // === KUNCI: proses dari yang TERAKHIR dicentang ===
            const processOrder = [...rcs].reverse(); // terakhir → pertama
            let remaining = TOTAL;
            const results = [];            // { id, paid, closed, note? }
            const paidMap = new Map();     // id -> {paid, closed}


            // Helper untuk apply payment ke satu receivable (update payments, schedules, rc, dan SO)
            const applyPayment = async (rc, amount) => {
                if (amount <= 0) return { paid: 0, closed: rc.status === 'closed' || rc.balance === 0 };

                const so = await m.SalesOrder.findByPk(rc.sales_order_id);
                const sequelize = rc.sequelize;

                return sequelize.transaction(async (tx) => {
                    const payNow = Math.min(amount, Number(rc.balance || 0));
                    if (payNow <= 0) {
                        return { paid: 0, closed: rc.status === 'closed' || rc.balance === 0 };
                    }

                    // Catat payment
                    await m.ReceivablePayment.create(
                        {
                            receivable_id: rc.id,
                            amount: payNow,
                            method,
                            reference_no,
                            paid_at,
                        },
                        { transaction: tx }
                    );

                    // Update schedules (greedy)
                    const scheds = await m.ReceivableSchedule.findAll({
                        where: { receivable_id: rc.id },
                        order: [['installment_no', 'ASC']],
                        transaction: tx,
                    });

                    let rem = payNow;
                    for (const s of scheds) {
                        if (rem <= 0) break;
                        const left = Math.max(0, Number(s.amount) - Number(s.paid_amount));
                        const seg = Math.min(left, rem);
                        if (seg > 0) {
                            const paid_amount = Number(s.paid_amount) + seg;
                            const status = paid_amount >= Number(s.amount) ? 'paid' : 'partial';
                            await s.update({ paid_amount, status }, { transaction: tx });
                            rem -= seg;
                        }
                    }

                    // Update rc
                    const newBal = Math.max(0, Number(rc.balance) - payNow);
                    let nextDue = rc.next_due_at;
                    if (newBal === 0) {
                        await rc.update({ balance: 0, status: 'closed', next_due_at: null }, { transaction: tx });
                    } else {
                        const next = await m.ReceivableSchedule.findOne({
                            where: { receivable_id: rc.id, status: { [Op.ne]: 'paid' } },
                            order: [['due_at', 'ASC']],
                            transaction: tx,
                        });
                        nextDue = next?.due_at || nextDue;
                        await rc.update({ balance: newBal, status: 'open', next_due_at: nextDue }, { transaction: tx });
                    }

                    // Reflect ke SalesOrder
                    if (so) {
                        let newPaid = Number(so.paid_amount) + payNow;
                        if (newPaid > Number(so.total)) newPaid = Number(so.total);
                        const soBal = Number(so.total) - newPaid;
                        await so.update(
                            { paid_amount: newPaid, balance: soBal, payment_status: soBal === 0 ? 'lunas' : so.payment_status },
                            { transaction: tx }
                        );
                    }

                    return { paid: payNow, closed: newBal === 0 };
                });
            };

            for (const rc of processOrder) {
                if (remaining <= 0) {
                    paidMap.set(rc.id, { paid: 0, closed: rc.status === 'closed' || rc.balance === 0, note: 'no_remaining_amount' });
                    continue;
                }
                const need = Number(rc.balance || 0);
                if (need <= 0) {
                    paidMap.set(rc.id, { paid: 0, closed: true, note: 'already_closed_or_zero' });
                    continue;
                }
                const payNow = Math.min(remaining, need);
                const out = await applyPayment(rc, payNow);
                remaining -= out.paid;
                paidMap.set(rc.id, { ...out, note: out.paid < need ? 'partial' : 'full' });
            }

            // susun results mengikuti urutan input (biar FE gampang mapping)
            for (const id of ids) {
                results.push({ id, ...(paidMap.get(id) || { paid: 0, closed: false }) });
            }


            res.json({
                message: 'Bulk amount payment processed',
                total_requested: TOTAL,
                total_paid: TOTAL - Math.max(0, remaining),
                remaining_unallocated: Math.max(0, remaining),
                results,
            });
        } catch (e) {
            console.error(e);
            res.status(500).json({ error: 'SERVER_ERROR' });
        }
    }


    // ========================= NEW: bulk settle =========================
    // POST /bulk/settle  { ids: string[], method?, reference_no?, paid_at? }
    async bulkSettle(req,res){
        try{
            const schema = req.schema; const { ids=[], method='tunai', reference_no=null, paid_at=new Date() } = req.body || {};
            if(!Array.isArray(ids) || ids.length===0) return res.status(400).json({ error:'NO_IDS' });
            const m = this._m(schema);

            const results = { success:[], skipped:[], failed:[] };
            // process per receivable in isolated transactions to avoid long locks
            for(const id of ids){
                try{
                    const rc = await m.Receivable.findByPk(id);
                    if(!rc){ results.failed.push({ id, error:'RECEIVABLE_NOT_FOUND' }); continue; }
                    if(rc.status==='closed' || rc.balance===0){ results.skipped.push({ id, reason:'ALREADY_CLOSED' }); continue; }

                    const so = await m.SalesOrder.findByPk(rc.sales_order_id);
                    const amount = rc.balance;
                    const sequelize = rc.sequelize;

                    await sequelize.transaction(async (tx)=>{
                        await m.ReceivablePayment.create({ receivable_id: id, amount, method, reference_no, paid_at }, { transaction: tx });

                        // schedules
                        const scheds = await m.ReceivableSchedule.findAll({ where:{ receivable_id: id }, order:[['installment_no','ASC']], transaction: tx });
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

                        await rc.update({ balance:0, status:'closed', next_due_at:null }, { transaction: tx });

                        if(so){
                            let newPaid = so.paid_amount + amount;
                            if(newPaid>so.total) newPaid = so.total;
                            await so.update({ paid_amount:newPaid, balance: so.total - newPaid, payment_status: (so.total - newPaid)===0 ? 'lunas' : so.payment_status }, { transaction: tx });
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

module.exports = new ReceivableController();