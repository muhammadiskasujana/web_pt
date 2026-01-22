const { Op } = require("sequelize");
const TenantModelLoader = require("../../tenants/loader");

class CategoriesController {
    // generic list
    async list(req, res) {
        try {
            const schema = req.schema;
            const { type } = req.params; // 'product' | 'size' | 'unit' | 'customer'
            const { q, is_active, page = 1, limit = 20 } = req.query;
            if (!schema) return res.status(400).json({ error: "Tenant context missing", code: "TENANT_REQUIRED" });

            const { Model } = this._resolveModel(type, schema);
            const where = {};
            if (q) where.name = { [Op.iLike]: `%${q}%` };
            if (is_active !== undefined) where.is_active = is_active === "true";

            const { count, rows } = await Model.findAndCountAll({
                where,
                order: [["created_at", "DESC"]],
                limit: parseInt(limit),
                offset: (parseInt(page) - 1) * parseInt(limit),
            });

            res.json({ items: rows, pagination: { page: parseInt(page), limit: parseInt(limit), total: count, pages: Math.ceil(count / parseInt(limit)) } });
        } catch (err) {
            console.error("Categories list error:", err);
            res.status(500).json({ error: "Internal server error", code: "SERVER_ERROR" });
        }
    }

    async getById(req, res) {
        try {
            const schema = req.schema;
            const { type, id } = req.params;
            if (!schema) return res.status(400).json({ error: "Tenant context missing", code: "TENANT_REQUIRED" });

            const { Model } = this._resolveModel(type, schema);
            const item = await Model.findByPk(id);
            if (!item) return res.status(404).json({ error: "Not found", code: "NOT_FOUND" });
            res.json({ item });
        } catch (err) {
            console.error("Categories get error:", err);
            res.status(500).json({ error: "Internal server error", code: "SERVER_ERROR" });
        }
    }

    async create(req, res) {
        try {
            const schema = req.schema;
            const { type } = req.params;
            if (!schema) return res.status(400).json({ error: "Tenant context missing", code: "TENANT_REQUIRED" });

            const { Model } = this._resolveModel(type, schema);
            const payload = req.body;

            const created = await Model.create(payload);
            res.status(201).json({ message: "Created", item: created });
        } catch (err) {
            if (err.name === "SequelizeUniqueConstraintError") {
                return res.status(409).json({ error: "Name already exists", code: "NAME_EXISTS" });
            }
            console.error("Categories create error:", err);
            res.status(500).json({ error: "Internal server error", code: "SERVER_ERROR" });
        }
    }

    async update(req, res) {
        try {
            const schema = req.schema;
            const { type, id } = req.params;
            if (!schema) return res.status(400).json({ error: "Tenant context missing", code: "TENANT_REQUIRED" });

            const { Model } = this._resolveModel(type, schema);
            const item = await Model.findByPk(id);
            if (!item) return res.status(404).json({ error: "Not found", code: "NOT_FOUND" });

            await item.update(req.body);
            res.json({ message: "Updated", item });
        } catch (err) {
            if (err.name === "SequelizeUniqueConstraintError") {
                return res.status(409).json({ error: "Name already exists", code: "NAME_EXISTS" });
            }
            console.error("Categories update error:", err);
            res.status(500).json({ error: "Internal server error", code: "SERVER_ERROR" });
        }
    }

    async delete(req, res) {
        try {
            const schema = req.schema;
            const { type, id } = req.params;
            if (!schema) return res.status(400).json({ error: "Tenant context missing", code: "TENANT_REQUIRED" });

            const { Model } = this._resolveModel(type, schema);
            const item = await Model.findByPk(id);
            if (!item) return res.status(404).json({ error: "Not found", code: "NOT_FOUND" });

            await item.destroy();
            res.json({ message: "Deleted" });
        } catch (err) {
            console.error("Categories delete error:", err);
            res.status(500).json({ error: "Internal server error", code: "SERVER_ERROR" });
        }
    }

    _resolveModel(type, schema) {
        const mapping = {
            product: "ProductCategory",
            size: "SizeCategory",
            unit: "UnitCategory",
            customer: "CustomerCategory",
        };
        const modelName = mapping[type];
        if (!modelName) {
            const error = new Error("Invalid category type");
            error.status = 400;
            throw error;
        }
        return { Model: TenantModelLoader.getModel(modelName, schema), modelName };
    }
}

module.exports = new CategoriesController();
