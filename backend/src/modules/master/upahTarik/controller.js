// modules/upahTarik/controller.js
const TenantModelLoader = require('../../tenants/loader');
const { Op } = require('sequelize');

class UpahTarikRateController {
    getModel(schema) {
        return TenantModelLoader.getModel('UpahTarikRate', schema);
    }

    async getAll(req, res) {
        try {
            const schema = req.schema;
            if (!schema) return res.status(400).json({ error: 'Tenant context missing', code: 'TENANT_REQUIRED' });

            const UpahTarikRate = this.getModel(schema);

            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const offset = (page - 1) * limit;

            const where = {};
            if (req.query.leasing_id) where.leasing_id = req.query.leasing_id;
            if (req.query.region_id) where.region_id = req.query.region_id;
            if (req.query.unit_type) where.unit_type = req.query.unit_type;
            if (req.query.active === 'false') {
                // biarkan, tidak filter aktif
            } else {
                where.is_active = true;
            }

            const { count, rows } = await UpahTarikRate.findAndCountAll({
                where,
                limit,
                offset,
                order: [['created_at', 'DESC']],
            });

            return res.json({
                data: rows,
                pagination: {
                    page,
                    limit,
                    total: count,
                    pages: Math.ceil(count / limit),
                },
            });
        } catch (err) {
            console.error('UpahTarikRate getAll error:', err);
            return res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
        }
    }

    async getById(req, res) {
        try {
            const schema = req.schema;
            const { id } = req.params;
            if (!schema) return res.status(400).json({ error: 'Tenant context missing', code: 'TENANT_REQUIRED' });

            const UpahTarikRate = this.getModel(schema);
            const rate = await UpahTarikRate.findByPk(id);
            if (!rate) return res.status(404).json({ error: 'Rate not found', code: 'NOT_FOUND' });

            return res.json({ data: rate });
        } catch (err) {
            console.error('UpahTarikRate getById error:', err);
            return res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
        }
    }

    async create(req, res) {
        try {
            const schema = req.schema;
            if (!schema) return res.status(400).json({ error: 'Tenant context missing', code: 'TENANT_REQUIRED' });

            const { leasing_id, gross_fee } = req.body;
            if (!leasing_id || !gross_fee) {
                return res.status(400).json({ error: 'leasing_id and gross_fee are required', code: 'MISSING_REQUIRED_FIELDS' });
            }

            const UpahTarikRate = this.getModel(schema);
            const rate = await UpahTarikRate.create(req.body);

            return res.status(201).json({ message: 'Rate created', data: rate });
        } catch (err) {
            console.error('UpahTarikRate create error:', err);
            return res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
        }
    }

    async update(req, res) {
        try {
            const schema = req.schema;
            const { id } = req.params;
            if (!schema) return res.status(400).json({ error: 'Tenant context missing', code: 'TENANT_REQUIRED' });

            const UpahTarikRate = this.getModel(schema);
            const rate = await UpahTarikRate.findByPk(id);
            if (!rate) return res.status(404).json({ error: 'Rate not found', code: 'NOT_FOUND' });

            await rate.update(req.body);
            return res.json({ message: 'Rate updated', data: rate });
        } catch (err) {
            console.error('UpahTarikRate update error:', err);
            return res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
        }
    }

    async delete(req, res) {
        try {
            const schema = req.schema;
            const { id } = req.params;
            if (!schema) return res.status(400).json({ error: 'Tenant context missing', code: 'TENANT_REQUIRED' });

            const UpahTarikRate = this.getModel(schema);
            const rate = await UpahTarikRate.findByPk(id);
            if (!rate) return res.status(404).json({ error: 'Rate not found', code: 'NOT_FOUND' });

            await rate.update({ is_active: false });
            return res.json({ message: 'Rate deactivated' });
        } catch (err) {
            console.error('UpahTarikRate delete error:', err);
            return res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
        }
    }
}

module.exports = new UpahTarikRateController();
