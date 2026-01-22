// modules/docType/controller.js
const TenantModelLoader = require('../../tenants/loader');

class DocTypeController {
    getModel(schema) {
        return TenantModelLoader.getModel('DocType', schema);
    }

    async getAll(req, res) {
        try {
            const schema = req.schema;
            if (!schema) return res.status(400).json({ error: 'Tenant context missing', code: 'TENANT_REQUIRED' });

            const DocType = this.getModel(schema);
            const where = {};

            if (req.query.category) where.category = req.query.category;
            if (req.query.active === 'false') {
                // pakai scope all
            }

            const list = await DocType.scope('all').findAll({ where, order: [['sort_order', 'ASC'], ['name', 'ASC']] });

            return res.json({ data: list });
        } catch (err) {
            console.error('DocType getAll error:', err);
            return res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
        }
    }

    async getById(req, res) {
        try {
            const schema = req.schema;
            const { id } = req.params;
            if (!schema) return res.status(400).json({ error: 'Tenant context missing', code: 'TENANT_REQUIRED' });

            const DocType = this.getModel(schema);
            const doc = await DocType.scope('all').findByPk(id);
            if (!doc) return res.status(404).json({ error: 'Doc type not found', code: 'NOT_FOUND' });

            return res.json({ data: doc });
        } catch (err) {
            console.error('DocType getById error:', err);
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

            const DocType = this.getModel(schema);
            const doc = await DocType.create(req.body);

            return res.status(201).json({ message: 'Doc type created', data: doc });
        } catch (err) {
            if (err.name === 'SequelizeUniqueConstraintError') {
                return res.status(409).json({ error: 'Code already exists', code: 'CODE_EXISTS' });
            }
            console.error('DocType create error:', err);
            return res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
        }
    }

    async update(req, res) {
        try {
            const schema = req.schema;
            const { id } = req.params;
            if (!schema) return res.status(400).json({ error: 'Tenant context missing', code: 'TENANT_REQUIRED' });

            const DocType = this.getModel(schema);
            const doc = await DocType.scope('all').findByPk(id);
            if (!doc) return res.status(404).json({ error: 'Doc type not found', code: 'NOT_FOUND' });

            await doc.update(req.body);
            return res.json({ message: 'Doc type updated', data: doc });
        } catch (err) {
            console.error('DocType update error:', err);
            return res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
        }
    }

    async delete(req, res) {
        try {
            const schema = req.schema;
            const { id } = req.params;
            if (!schema) return res.status(400).json({ error: 'Tenant context missing', code: 'TENANT_REQUIRED' });

            const DocType = this.getModel(schema);
            const doc = await DocType.scope('all').findByPk(id);
            if (!doc) return res.status(404).json({ error: 'Doc type not found', code: 'NOT_FOUND' });

            await doc.update({ is_active: false });
            return res.json({ message: 'Doc type deactivated' });
        } catch (err) {
            console.error('DocType delete error:', err);
            return res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
        }
    }
}

module.exports = new DocTypeController();
