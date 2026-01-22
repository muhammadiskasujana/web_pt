const { Op, Sequelize } = require('sequelize');
const TenantModelLoader = require('../../tenants/loader');
const dayjs = require('dayjs');

function normalizeUUID(v) {
    if (v == null) return null;
    if (typeof v !== 'string') return null;
    const s = v.trim();
    if (!s) return null;
    // valid UUID v4 (longgar)
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s) ? s : null;
}

function pad(n, w=4) { return String(n).padStart(w, '0'); }

async function genAssetCode(sequelize, schema, trx) {
    // Format: AST-YYYYMM-#### (reset tiap bulan)
    const now = new Date();
    const ym = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}`;
    const prefix = `AST-${ym}-`;

    // Ambil max urutan existing untuk bulan ini
    const [rows] = await sequelize.query(
        `
    SELECT code FROM "${schema}".inventory_assets
    WHERE code LIKE :prefix
    ORDER BY code DESC
    LIMIT 1
    `,
        { replacements: { prefix: `${prefix}%` }, transaction: trx }
    );

    let next = 1;
    if (rows && rows.length) {
        const last = rows[0].code; // e.g. AST-202510-0032
        const num = parseInt(last.slice(-4), 10);
        next = isNaN(num) ? 1 : (num + 1);
    }
    return `${prefix}${pad(next, 4)}`;
}

class InventoryAssetController {
    async list(req, res) {
        const schema = req.schema; if (!schema) return res.status(400).json({ error:'TENANT_REQUIRED' });
        const { branch_id } = req.query;
        const InventoryAsset = TenantModelLoader.getModel('InventoryAsset', schema);
        const where = {};
        if (branch_id) where.branch_id = branch_id;
        const rows = await InventoryAsset.findAll({ where, order: [['created_at','DESC']] });
        res.json({ assets: rows });
    }
    // async create(req, res) {
    //     const schema = req.schema; if (!schema) return res.status(400).json({ error:'TENANT_REQUIRED' });
    //     const InventoryAsset = TenantModelLoader.getModel('InventoryAsset', schema);
    //     const a = await InventoryAsset.create(req.body);
    //     res.status(201).json({ message: 'Asset created', asset: a });
    // }
    async create(req, res) {
        const schema = req.schema;
        if (!schema) return res.status(400).json({ error:'TENANT_REQUIRED' });

        const InventoryAsset = TenantModelLoader.getModel('InventoryAsset', schema);
        const sequelize = InventoryAsset.sequelize;

        const out = await sequelize.transaction(async (trx) => {
            const body = { ...req.body };

            // —— Sanitize numeric
            body.acquisition_cost = Number(body.acquisition_cost || 0);
            body.salvage_value    = Number(body.salvage_value || 0);
            body.useful_life_months = Number(body.useful_life_months || 0);

            // —— Sanitize UUID
            body.branch_id = normalizeUUID(body.branch_id);

            // —— Default metadata
            if (body.metadata == null || typeof body.metadata !== 'object') body.metadata = {};

            // —— Generate code jika kosong (dari jawaban sebelumnya)
            if (!body.code || !body.code.trim()) {
                body.code = await genAssetCode(sequelize, schema, trx);
            }

            const a = await InventoryAsset.create(body, { transaction: trx });
            return a;
        });

        res.status(201).json({ message: 'Asset created', asset: out });
    }

    async get(req, res) {
        const schema = req.schema; const { id } = req.params;
        if (!schema) return res.status(400).json({ error:'TENANT_REQUIRED' });
        const InventoryAsset = TenantModelLoader.getModel('InventoryAsset', schema);
        const a = await InventoryAsset.findByPk(id);
        if (!a) return res.status(404).json({ error:'NOT_FOUND' });
        res.json({ asset: a });
    }
    async update(req, res) {
        const schema = req.schema; const { id } = req.params;
        if (!schema) return res.status(400).json({ error:'TENANT_REQUIRED' });
        const InventoryAsset = TenantModelLoader.getModel('InventoryAsset', schema);
        const a = await InventoryAsset.findByPk(id);
        if (!a) return res.status(404).json({ error:'NOT_FOUND' });
        await a.update(req.body);
        res.json({ message:'Asset updated', asset: a });
    }
    async remove(req, res) {
        const schema = req.schema; const { id } = req.params;
        if (!schema) return res.status(400).json({ error:'TENANT_REQUIRED' });
        const InventoryAsset = TenantModelLoader.getModel('InventoryAsset', schema);
        const a = await InventoryAsset.findByPk(id);
        if (!a) return res.status(404).json({ error:'NOT_FOUND' });
        await a.destroy();
        res.json({ message:'Asset deleted' });
    }

    // GET /api/assets/:id/depreciation/schedule
    async depreciationSchedule(req, res) {
        const schema = req.schema; const { id } = req.params;
        if (!schema) return res.status(400).json({ error:'TENANT_REQUIRED' });
        const InventoryAsset = TenantModelLoader.getModel('InventoryAsset', schema);
        const a = await InventoryAsset.findByPk(id);
        if (!a) return res.status(404).json({ error:'NOT_FOUND' });

        const start = dayjs(a.acquisition_date);
        const months = a.useful_life_months;
        const cost = Number(a.acquisition_cost);
        const salvage = Number(a.salvage_value);
        const base = Math.max(cost - salvage, 0);

        const schedule = [];
        if (a.method === 'straight_line') {
            const perMonth = months > 0 ? base / months : 0;
            for (let i=1; i<=months; i++){
                schedule.push({
                    period: i,
                    period_date: start.add(i, 'month').toDate(),
                    depreciation: Number(perMonth.toFixed(2)),
                    method: 'straight_line'
                });
            }
        } else {
            // declining_balance sederhana (contoh 2x/DB)
            const rate = 2 / (months || 1);
            let book = cost;
            for (let i=1; i<=months; i++){
                let dep = Number((book * rate/12).toFixed(2));
                if (book - dep < salvage) dep = book - salvage;
                schedule.push({
                    period: i,
                    period_date: start.add(i, 'month').toDate(),
                    depreciation: dep,
                    method: 'declining_balance'
                });
                book -= dep;
                if (book <= salvage) break;
            }
        }

        res.json({ asset: { id: a.id, name: a.name, method: a.method }, schedule });
    }
}

module.exports = new InventoryAssetController();
