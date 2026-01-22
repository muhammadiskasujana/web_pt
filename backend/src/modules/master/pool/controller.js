// modules/pool/controller.js
const TenantModelLoader = require('../../tenants/loader');
const { Op } = require('sequelize');

class PoolController {
    getModel(schema) {
        return TenantModelLoader.getModel('Pool', schema);
    }

    async getAll(req, res) {
        try {
            const schema = req.schema;
            if (!schema) return res.status(400).json({ error: 'Tenant context missing', code: 'TENANT_REQUIRED' });

            const Pool = this.getModel(schema);
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const offset = (page - 1) * limit;

            const where = {};
            if (req.query.region_id) where.region_id = req.query.region_id;
            if (req.query.search) {
                const s = `%${req.query.search.trim()}%`;
                where[Op.or] = [
                    { code: { [Op.iLike]: s } },
                    { name: { [Op.iLike]: s } },
                    { city: { [Op.iLike]: s } },
                ];
            }

            const { count, rows } = await Pool.scope('all').findAndCountAll({
                where,
                limit,
                offset,
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
            console.error('Pool getAll error:', err);
            return res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
        }
    }

    async getById(req, res) {
        try {
            const schema = req.schema;
            const { id } = req.params;
            if (!schema) return res.status(400).json({ error: 'Tenant context missing', code: 'TENANT_REQUIRED' });

            const Pool = this.getModel(schema);
            const pool = await Pool.scope('all').findByPk(id);
            if (!pool) return res.status(404).json({ error: 'Pool not found', code: 'NOT_FOUND' });

            return res.json({ data: pool });
        } catch (err) {
            console.error('Pool getById error:', err);
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

            const Pool = this.getModel(schema);
            const pool = await Pool.create(req.body);
            return res.status(201).json({ message: 'Pool created', data: pool });
        } catch (err) {
            if (err.name === 'SequelizeUniqueConstraintError') {
                return res.status(409).json({ error: 'Pool code already exists', code: 'CODE_EXISTS' });
            }
            console.error('Pool create error:', err);
            return res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
        }
    }

    async update(req, res) {
        try {
            const schema = req.schema;
            const { id } = req.params;
            if (!schema) return res.status(400).json({ error: 'Tenant context missing', code: 'TENANT_REQUIRED' });

            const Pool = this.getModel(schema);
            const pool = await Pool.scope('all').findByPk(id);
            if (!pool) return res.status(404).json({ error: 'Pool not found', code: 'NOT_FOUND' });

            await pool.update(req.body);
            return res.json({ message: 'Pool updated', data: pool });
        } catch (err) {
            console.error('Pool update error:', err);
            return res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
        }
    }

    async delete(req, res) {
        try {
            const schema = req.schema;
            const { id } = req.params;
            if (!schema) return res.status(400).json({ error: 'Tenant context missing', code: 'TENANT_REQUIRED' });

            const Pool = this.getModel(schema);
            const pool = await Pool.scope('all').findByPk(id);
            if (!pool) return res.status(404).json({ error: 'Pool not found', code: 'NOT_FOUND' });

            await pool.update({ is_active: false });
            return res.json({ message: 'Pool deactivated' });
        } catch (err) {
            console.error('Pool delete error:', err);
            return res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
        }
    }
}

module.exports = new PoolController();
