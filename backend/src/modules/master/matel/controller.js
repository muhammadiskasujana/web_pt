// modules/matel/controller.js
const TenantModelLoader = require('../../tenants/loader');
const { Op } = require('sequelize');

class MatelController {
    getModel(schema) {
        return TenantModelLoader.getModel('Matel', schema);
    }

    async getAll(req, res) {
        try {
            const schema = req.schema;
            if (!schema) return res.status(400).json({ error: 'Tenant context missing', code: 'TENANT_REQUIRED' });

            const Matel = this.getModel(schema);

            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const offset = (page - 1) * limit;
            const where = {};

            if (req.query.search) {
                const search = `%${req.query.search.trim()}%`;
                where[Op.or] = [
                    { name: { [Op.iLike]: search } },
                    { phone: { [Op.iLike]: search } },
                    { nik: { [Op.iLike]: search } },
                ];
            }

            if (req.query.status) {
                where.status = req.query.status;
            }

            const { count, rows } = await Matel.findAndCountAll({
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
            console.error('Matel getAll error:', err);
            return res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
        }
    }

    async getById(req, res) {
        try {
            const schema = req.schema;
            const { id } = req.params;
            if (!schema) return res.status(400).json({ error: 'Tenant context missing', code: 'TENANT_REQUIRED' });

            const Matel = this.getModel(schema);
            const matel = await Matel.findByPk(id);
            if (!matel) return res.status(404).json({ error: 'Matel not found', code: 'NOT_FOUND' });

            return res.json({ data: matel });
        } catch (err) {
            console.error('Matel getById error:', err);
            return res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
        }
    }

    async create(req, res) {
        try {
            const schema = req.schema;
            if (!schema) return res.status(400).json({ error: 'Tenant context missing', code: 'TENANT_REQUIRED' });

            const { name, phone, nik, address, bank_account, status, photo_url, sppi, metadata } = req.body;
            if (!name || !phone) {
                return res.status(400).json({ error: 'Name and phone are required', code: 'MISSING_REQUIRED_FIELDS' });
            }

            const Matel = this.getModel(schema);
            const matel = await Matel.create({
                name,
                phone,
                nik,
                address,
                bank_account,
                status,
                photo_url,
                sppi,
                metadata,
            });

            return res.status(201).json({ message: 'Matel created', data: matel });
        } catch (err) {
            console.error('Matel create error:', err);
            return res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
        }
    }

    async update(req, res) {
        try {
            const schema = req.schema;
            const { id } = req.params;
            if (!schema) return res.status(400).json({ error: 'Tenant context missing', code: 'TENANT_REQUIRED' });

            const Matel = this.getModel(schema);
            const matel = await Matel.findByPk(id);
            if (!matel) return res.status(404).json({ error: 'Matel not found', code: 'NOT_FOUND' });

            await matel.update(req.body);
            return res.json({ message: 'Matel updated', data: matel });
        } catch (err) {
            console.error('Matel update error:', err);
            return res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
        }
    }

    async delete(req, res) {
        try {
            const schema = req.schema;
            const { id } = req.params;
            if (!schema) return res.status(400).json({ error: 'Tenant context missing', code: 'TENANT_REQUIRED' });

            const Matel = this.getModel(schema);
            const matel = await Matel.findByPk(id);
            if (!matel) return res.status(404).json({ error: 'Matel not found', code: 'NOT_FOUND' });

            await matel.destroy();
            return res.json({ message: 'Matel deleted' });
        } catch (err) {
            console.error('Matel delete error:', err);
            return res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
        }
    }
}

module.exports = new MatelController();
