// modules/leasing/controller.js
const TenantModelLoader = require('../../tenants/loader');
const { Op } = require('sequelize');

class LeasingController {
    getModel(schema) {
        return TenantModelLoader.getModel('Leasing', schema);
    }

    async getAll(req, res) {
        try {
            const schema = req.schema;
            if (!schema) return res.status(400).json({ error: 'Tenant context missing', code: 'TENANT_REQUIRED' });

            const Leasing = this.getModel(schema);
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const offset = (page - 1) * limit;

            const where = {};
            if (req.query.search) {
                const search = `%${req.query.search.trim()}%`;
                where[Op.or] = [
                    { code: { [Op.iLike]: search } },
                    { name: { [Op.iLike]: search } },
                ];
            }
            if (req.query.active === 'false') {
                // pakai scope all kalau mau lihat yang non-aktif juga
            }

            const { count, rows } = await Leasing.scope('all').findAndCountAll({
                where,
                limit,
                offset,
                order: [['name', 'ASC']],
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
            console.error('Leasing getAll error:', err);
            return res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
        }
    }

    async getById(req, res) {
        try {
            const schema = req.schema;
            const { id } = req.params;
            if (!schema) return res.status(400).json({ error: 'Tenant context missing', code: 'TENANT_REQUIRED' });

            const Leasing = this.getModel(schema);
            const leasing = await Leasing.scope('all').findByPk(id);
            if (!leasing) return res.status(404).json({ error: 'Leasing not found', code: 'NOT_FOUND' });

            return res.json({ data: leasing });
        } catch (err) {
            console.error('Leasing getById error:', err);
            return res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
        }
    }

    async create(req, res) {
        try {
            const schema = req.schema;
            if (!schema) return res.status(400).json({ error: 'Tenant context missing', code: 'TENANT_REQUIRED' });

            const { code, name } = req.body;
            if (!code || !name) {
                return res.status(400).json({ error: 'Code and name are required', code: 'MISSING_REQUIRED_FIELDS' });
            }

            const Leasing = this.getModel(schema);
            const leasing = await Leasing.create(req.body);
            return res.status(201).json({ message: 'Leasing created', data: leasing });
        } catch (err) {
            if (err.name === 'SequelizeUniqueConstraintError') {
                return res.status(409).json({ error: 'Leasing code already exists', code: 'CODE_EXISTS' });
            }
            console.error('Leasing create error:', err);
            return res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
        }
    }

    async update(req, res) {
        try {
            const schema = req.schema;
            const { id } = req.params;
            if (!schema) return res.status(400).json({ error: 'Tenant context missing', code: 'TENANT_REQUIRED' });

            const Leasing = this.getModel(schema);
            const leasing = await Leasing.scope('all').findByPk(id);
            if (!leasing) return res.status(404).json({ error: 'Leasing not found', code: 'NOT_FOUND' });

            await leasing.update(req.body);
            return res.json({ message: 'Leasing updated', data: leasing });
        } catch (err) {
            console.error('Leasing update error:', err);
            return res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
        }
    }

    async delete(req, res) {
        try {
            const schema = req.schema;
            const { id } = req.params;
            if (!schema) return res.status(400).json({ error: 'Tenant context missing', code: 'TENANT_REQUIRED' });

            const Leasing = this.getModel(schema);
            const leasing = await Leasing.scope('all').findByPk(id);
            if (!leasing) return res.status(404).json({ error: 'Leasing not found', code: 'NOT_FOUND' });

            // soft delete style: set is_active = false
            await leasing.update({ is_active: false });

            return res.json({ message: 'Leasing deactivated' });
        } catch (err) {
            console.error('Leasing delete error:', err);
            return res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
        }
    }
}

module.exports = new LeasingController();
