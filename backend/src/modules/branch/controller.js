const TenantModelLoader = require('../../tenants/loader');

class BranchController {
    // CRUD cabang
    async list(req, res) {
        const schema = req.schema; if (!schema) return res.status(400).json({ error:'TENANT_REQUIRED' });
        const Branch = TenantModelLoader.getModel('Branch', schema);
        const rows = await Branch.findAll({ order: [['created_at','DESC']] });
        res.json({ branches: rows });
    }
    async create(req, res) {
        const schema = req.schema; if (!schema) return res.status(400).json({ error:'TENANT_REQUIRED' });
        const Branch = TenantModelLoader.getModel('Branch', schema);
        const b = await Branch.create(req.body);
        res.status(201).json({ message: 'Branch created', branch: b });
    }
    async get(req, res) {
        const schema = req.schema; const { id } = req.params;
        if (!schema) return res.status(400).json({ error:'TENANT_REQUIRED' });
        const Branch = TenantModelLoader.getModel('Branch', schema);
        const b = await Branch.findByPk(id);
        if (!b) return res.status(404).json({ error:'NOT_FOUND' });
        res.json({ branch: b });
    }
    async update(req, res) {
        const schema = req.schema; const { id } = req.params;
        if (!schema) return res.status(400).json({ error:'TENANT_REQUIRED' });
        const Branch = TenantModelLoader.getModel('Branch', schema);
        const b = await Branch.findByPk(id);
        if (!b) return res.status(404).json({ error:'NOT_FOUND' });
        await b.update(req.body);
        res.json({ message: 'Branch updated', branch: b });
    }
    async remove(req, res) {
        const schema = req.schema; const { id } = req.params;
        if (!schema) return res.status(400).json({ error:'TENANT_REQUIRED' });
        const Branch = TenantModelLoader.getModel('Branch', schema);
        const b = await Branch.findByPk(id);
        if (!b) return res.status(404).json({ error:'NOT_FOUND' });
        await b.destroy();
        res.json({ message: 'Branch deleted' });
    }

    // transfer modal antar cabang
    async transferCapital(req, res) {
        const schema = req.schema; if (!schema) return res.status(400).json({ error:'TENANT_REQUIRED' });
        const { from_branch_id, to_branch_id, amount, note, ref_no, txn_at } = req.body;
        if (!from_branch_id || !to_branch_id || !amount) return res.status(400).json({ error: 'MISSING_FIELDS' });

        const Branch = TenantModelLoader.getModel('Branch', schema);
        const BranchCapitalTransaction = TenantModelLoader.getModel('BranchCapitalTransaction', schema);

        const from = await Branch.findByPk(from_branch_id);
        const to = await Branch.findByPk(to_branch_id);
        if (!from || !to) return res.status(400).json({ error: 'INVALID_BRANCH' });

        const t = await BranchCapitalTransaction.create({
            from_branch_id, to_branch_id, amount, note, ref_no, txn_at
        });

        // (opsional) catat ke ledger GL kamu nanti; sekarang cukup transaksi modalnya dulu
        res.status(201).json({ message: 'Capital transferred', transaction: t });
    }

    async listTransfers(req, res) {
        const schema = req.schema; if (!schema) return res.status(400).json({ error:'TENANT_REQUIRED' });
        const Branch = TenantModelLoader.getModel('Branch', schema);
        const BranchCapitalTransaction = TenantModelLoader.getModel('BranchCapitalTransaction', schema);
        const rows = await BranchCapitalTransaction.findAll({
            include: [
                { model: Branch, as: 'fromBranch', attributes: ['id','code','name'] },
                { model: Branch, as: 'toBranch', attributes: ['id','code','name'] }
            ],
            order: [['txn_at','DESC']]
        });
        res.json({ transfers: rows });
    }
}

module.exports = new BranchController();
