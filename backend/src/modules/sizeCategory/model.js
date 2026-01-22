const { DataTypes } = require("sequelize");
const sequelize = require("../../config/db");

function defineSizeCategoryModel(schema) {
    return sequelize.define(
        "SizeCategory",
        {
            id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
            name: { type: DataTypes.STRING(100), allowNull: false },
            description: { type: DataTypes.TEXT, allowNull: true },
            unit: { type: DataTypes.STRING(20), allowNull: true, comment: "mis: cm, m, in" },
            is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        },
        {
            schema,
            tableName: "size_categories",
            timestamps: true,
            createdAt: "created_at",
            updatedAt: "updated_at",
            indexes: [
                { unique: true, fields: ["name"], name: "size_categories_name_unique_idx" },
                { fields: ["is_active"], name: "size_categories_active_idx" },
            ],
        }
    );
}

module.exports = defineSizeCategoryModel;
