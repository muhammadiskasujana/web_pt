const { DataTypes } = require("sequelize");
const sequelize = require("../../config/db");
const { v4: uuidv4 } = require("uuid");

function defineProductCategoryModel(schema) {
    return sequelize.define(
        "ProductCategory",
        {
            id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
            name: { type: DataTypes.STRING(150), allowNull: false },
            description: { type: DataTypes.TEXT, allowNull: true },
            parent_id: { type: DataTypes.UUID, allowNull: true }, // optional kategori bertingkat
            is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        },
        {
            schema,
            tableName: "product_categories",
            timestamps: true,
            createdAt: "created_at",
            updatedAt: "updated_at",
            indexes: [
                { unique: true, fields: ["name"], name: "product_categories_name_unique_idx" },
                { fields: ["parent_id"], name: "product_categories_parent_idx" },
                { fields: ["is_active"], name: "product_categories_active_idx" },
            ],
        }
    );
}

module.exports = defineProductCategoryModel;
