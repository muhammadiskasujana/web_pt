const { DataTypes } = require("sequelize");
const sequelize = require("../../config/db");
const crypto = require("crypto");

function defineProductModel(schema) {
    const Product = sequelize.define(
        "Product",
        {
            id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
            name: { type: DataTypes.STRING(255), allowNull: false },
            sku: { type: DataTypes.STRING(50), allowNull: false, unique: true, comment: "auto-generated unique SKU" },
            product_category_id: { type: DataTypes.UUID, allowNull: true },
            progress_category_id: { type: DataTypes.UUID, allowNull: true },
            size_category_id: { type: DataTypes.UUID, allowNull: true },
            unit_category_id: { type: DataTypes.UUID, allowNull: true },

            price_normal: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0.00 },

            is_stock: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
            stock: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },

            is_area: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
            // NOTE: jika perlu, bisa tambah price_per_area, min_area, dll via metadata:
            photo_url: { type: DataTypes.STRING(500), allowNull: true, validate: { isUrl: true } },
            photo_path: { type: DataTypes.STRING(500), allowNull: true }, // optional
            metadata: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
            is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        },
        {
            schema,
            tableName: "products",
            timestamps: true,
            createdAt: "created_at",
            updatedAt: "updated_at",
            indexes: [
                { unique: true, fields: ["sku"], name: "products_sku_unique_idx" },
                { fields: ["name"], name: "products_name_idx" },
                { fields: ["product_category_id"], name: "products_category_idx" },
                { fields: ["size_category_id"], name: "products_size_idx" },
                { fields: ["unit_category_id"], name: "products_unit_idx" },
                { fields: ["is_active"], name: "products_active_idx" },
            ],
            hooks: {
                beforeValidate: async (product) => {
                    if (!product.sku) {
                        // SKU: 3 huruf nama + timestamp hex pendek
                        const prefix = (product.name || "PRD")
                            .replace(/[^A-Za-z0-9]/g, "")
                            .toUpperCase()
                            .slice(0, 3)
                            .padEnd(3, "X");
                        const suffix = crypto.randomBytes(3).toString("hex").toUpperCase(); // 6 chars
                        product.sku = `${prefix}-${suffix}`;
                    } else {
                        product.sku = product.sku.toUpperCase().trim();
                    }
                },
            },
        }
    );

    return Product;
}

module.exports = defineProductModel;
