const { DataTypes } = require("sequelize");
const sequelize = require("../../config/db");

function defineUnitCategoryModel(schema) {
    return sequelize.define(
        "UnitCategory",
        {
            id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
            name: { type: DataTypes.STRING(100), allowNull: false },        // e.g. "Botol"
            abbreviation: { type: DataTypes.STRING(20), allowNull: true },  // e.g. "btl"
            is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        },
        {
            schema,
            tableName: "unit_categories",
            timestamps: true,
            createdAt: "created_at",
            updatedAt: "updated_at",
            indexes: [
                { unique: true, fields: ["name"], name: "unit_categories_name_unique_idx" },
                { fields: ["is_active"], name: "unit_categories_active_idx" },
            ],
        }
    );
}

module.exports = defineUnitCategoryModel;
