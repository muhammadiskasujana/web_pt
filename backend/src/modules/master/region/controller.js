// modules/region/controller.js
const TenantModelLoader = require('../../tenants/loader');
const { Op } = require('sequelize');

class RegionController {
    getModel(schema) {
        return TenantModelLoader.getModel('Region', schema);
    }

    async getAll(req, res) {
        try {
            const schema = req.schema;
            if (!schema) return res.status(400).json({ error: 'Tenant context missing', code: 'TENANT_REQUIRED' });

            const Region = this.getModel(schema);
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const offset = (page - 1) * limit;

            const where = {};
            if (req.query.search) {
                const s = `%${req.query.search.trim()}%`;
                where[Op.or] = [
                    { code: { [Op.iLike]: s } },
                    { name: { [Op.iLike]: s } },
                    { city: { [Op.iLike]: s } },
                    { province: { [Op.iLike]: s } },
                ];
            }

            if (req.query.active === 'false') {
                // pakai scope all
            }

            const { count, rows } = await Region.scope('all').findAndCountAll({
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
            console.error('Region getAll error:', err);
            return res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
        }
    }

    async getById(req, res) {
        try {
            const schema = req.schema;
            const { id } = req.params;
            if (!schema) return res.status(400).json({ error: 'Tenant context missing', code: 'TENANT_REQUIRED' });

            const Region = this.getModel(schema);
            const region = await Region.scope('all').findByPk(id);
            if (!region) return res.status(404).json({ error: 'Region not found', code: 'NOT_FOUND' });

            return res.json({ data: region });
        } catch (err) {
            console.error('Region getById error:', err);
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

            const Region = this.getModel(schema);
            const region = await Region.create(req.body);
            return res.status(201).json({ message: 'Region created', data: region });
        } catch (err) {
            if (err.name === 'SequelizeUniqueConstraintError') {
                return res.status(409).json({ error: 'Region code already exists', code: 'CODE_EXISTS' });
            }
            console.error('Region create error:', err);
            return res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
        }
    }

    async update(req, res) {
        try {
            const schema = req.schema;
            const { id } = req.params;
            if (!schema) return res.status(400).json({ error: 'Tenant context missing', code: 'TENANT_REQUIRED' });

            const Region = this.getModel(schema);
            const region = await Region.scope('all').findByPk(id);
            if (!region) return res.status(404).json({ error: 'Region not found', code: 'NOT_FOUND' });

            await region.update(req.body);
            return res.json({ message: 'Region updated', data: region });
        } catch (err) {
            console.error('Region update error:', err);
            return res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
        }
    }

    async delete(req, res) {
        try {
            const schema = req.schema;
            const { id } = req.params;
            if (!schema) return res.status(400).json({ error: 'Tenant context missing', code: 'TENANT_REQUIRED' });

            const Region = this.getModel(schema);
            const region = await Region.scope('all').findByPk(id);
            if (!region) return res.status(404).json({ error: 'Region not found', code: 'NOT_FOUND' });

            await region.update({ is_active: false });
            return res.json({ message: 'Region deactivated' });
        } catch (err) {
            console.error('Region delete error:', err);
            return res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
        }
    }
}

module.exports = new RegionController();
