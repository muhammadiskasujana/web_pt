const { Op } = require('sequelize');
const TenantModelLoader = require('../../tenants/loader');

class RawMaterialController {
    // Category
    async listCategory(req, res) {
        const schema = req.schema; if (!schema) return res.status(400).json({ error:'TENANT_REQUIRED' });
        const Category = TenantModelLoader.getModel('RawMaterialCategory', schema);
        const rows = await Category.findAll({ order: [['name','ASC']] });
        res.json({ categories: rows });
    }
    async createCategory(req, res) {
        const schema = req.schema; if (!schema) return res.status(400).json({ error:'TENANT_REQUIRED' });
        const Category = TenantModelLoader.getModel('RawMaterialCategory', schema);
        const c = await Category.create(req.body);
        res.status(201).json({ message:'Category created', category: c });
    }
    async updateCategory(req, res) {
        const schema = req.schema; const { id }=req.params;
        if (!schema) return res.status(400).json({ error:'TENANT_REQUIRED' });
        const Category = TenantModelLoader.getModel('RawMaterialCategory', schema);
        const c = await Category.findByPk(id); if (!c) return res.status(404).json({ error:'NOT_FOUND' });
        await c.update(req.body);
        res.json({ message:'Category updated', category: c });
    }
    async deleteCategory(req, res) {
        const schema = req.schema; const { id }=req.params;
        if (!schema) return res.status(400).json({ error:'TENANT_REQUIRED' });
        const Category = TenantModelLoader.getModel('RawMaterialCategory', schema);
        const c = await Category.findByPk(id); if (!c) return res.status(404).json({ error:'NOT_FOUND' });
        await c.destroy(); res.json({ message:'Category deleted' });
    }

    // Item
    async listItem(req, res) {
        const schema = req.schema; if (!schema) return res.status(400).json({ error:'TENANT_REQUIRED' });
        const { q } = req.query;
        const RM = TenantModelLoader.getModel('RawMaterial', schema);
        const where = {};
        if (q) where[Op.or] = [{ name: { [Op.iLike]: `%${q}%` } }, { code: { [Op.iLike]: `%${q}%` } }];
        const rows = await RM.findAll({ where, order: [['created_at','DESC']] });
        res.json({ items: rows });
    }
    async createItem(req, res) {
        const schema = req.schema; if (!schema) return res.status(400).json({ error:'TENANT_REQUIRED' });
        const RM = TenantModelLoader.getModel('RawMaterial', schema);
        const item = await RM.create(req.body);
        res.status(201).json({ message:'Item created', item });
    }
    async updateItem(req, res) {
        const schema = req.schema; const { id }=req.params;
        if (!schema) return res.status(400).json({ error:'TENANT_REQUIRED' });
        const RM = TenantModelLoader.getModel('RawMaterial', schema);
        const item = await RM.findByPk(id); if (!item) return res.status(404).json({ error:'NOT_FOUND' });
        await item.update(req.body);
        res.json({ message:'Item updated', item });
    }
    async deleteItem(req, res) {
        const schema = req.schema; const { id }=req.params;
        if (!schema) return res.status(400).json({ error:'TENANT_REQUIRED' });
        const RM = TenantModelLoader.getModel('RawMaterial', schema);
        const item = await RM.findByPk(id); if (!item) return res.status(404).json({ error:'NOT_FOUND' });
        await item.destroy(); res.json({ message:'Item deleted' });
    }

    // Stock & move (purchase/usage/transfer/adjustment)
    async move(req, res) {
        const schema = req.schema; if (!schema) return res.status(400).json({ error:'TENANT_REQUIRED' });
        const { rm_id, from_branch_id, to_branch_id, qty, reason, note, ref_no, moved_at } = req.body;
        if (!rm_id || !qty || !reason) return res.status(400).json({ error:'MISSING_FIELDS' });

        const RM = TenantModelLoader.getModel('RawMaterial', schema);
        const Stock = TenantModelLoader.getModel('RawMaterialStock', schema);
        const Move = TenantModelLoader.getModel('RawMaterialMove', schema);

        const item = await RM.findByPk(rm_id); if (!item) return res.status(400).json({ error:'INVALID_RM' });

        // helper upsert saldo cabang
        async function adj(branch_id, delta) {
            if (!branch_id) return;
            const [row] = await Stock.findOrCreate({ where: { branch_id, rm_id }, defaults: { qty: 0 } });
            const newQty = Number(row.qty) + Number(delta);
            await row.update({ qty: newQty });
        }

        // rules sederhana
        if (reason === 'purchase') {
            if (!to_branch_id) return res.status(400).json({ error:'TARGET_BRANCH_REQUIRED' });
            await adj(to_branch_id, +qty);
        } else if (reason === 'usage') {
            if (!from_branch_id) return res.status(400).json({ error:'SOURCE_BRANCH_REQUIRED' });
            await adj(from_branch_id, -qty);
        } else if (reason === 'transfer') {
            if (!from_branch_id || !to_branch_id) return res.status(400).json({ error:'BOTH_BRANCH_REQUIRED' });
            await adj(from_branch_id, -qty);
            await adj(to_branch_id, +qty);
        } else if (reason === 'adjustment') {
            if (!to_branch_id && !from_branch_id) return res.status(400).json({ error:'BRANCH_REQUIRED' });
            // konvensi: kalau ada to_branch_id → tambah; kalau ada from_branch_id → kurang
            if (to_branch_id) await adj(to_branch_id, +qty);
            if (from_branch_id) await adj(from_branch_id, -qty);
        } else {
            return res.status(400).json({ error:'INVALID_REASON' });
        }

        const mv = await Move.create({ rm_id, from_branch_id, to_branch_id, qty, reason, note, ref_no, moved_at });
        res.status(201).json({ message:'Move recorded', move: mv });
    }

    async stockByBranch(req, res) {
        const schema = req.schema; if (!schema) return res.status(400).json({ error:'TENANT_REQUIRED' });
        const { branch_id } = req.query;
        const Stock = TenantModelLoader.getModel('RawMaterialStock', schema);
        const RM = TenantModelLoader.getModel('RawMaterial', schema);
        const where = {}; if (branch_id) where.branch_id = branch_id;
        const rows = await Stock.findAll({
            where,
            include: [{ model: RM, as: 'item', attributes: ['id','code','name','unit'] }],
            order: [['created_at','DESC']]
        });
        res.json({ stock: rows });
    }

    async moves(req, res) {
        const schema = req.schema; if (!schema) return res.status(400).json({ error:'TENANT_REQUIRED' });
        const Move = TenantModelLoader.getModel('RawMaterialMove', schema);
        const rows = await Move.findAll({ order: [['moved_at','DESC'], ['created_at','DESC']] });
        res.json({ moves: rows });
    }
}

module.exports = new RawMaterialController();
