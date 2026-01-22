const { DataTypes } = require("sequelize");
const sequelize = require("../../config/db");

function defineCustomerCategoryModel(schema) {
    return sequelize.define(
        "CustomerCategory",
        {
            id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
            name: { type: DataTypes.STRING(120), allowNull: false },
            description: { type: DataTypes.TEXT, allowNull: true },
            default_discount_percent: { type: DataTypes.DECIMAL(5,2), allowNull: false, defaultValue: 0.00 },
            is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        },
        {
            schema,
            tableName: "customer_categories",
            timestamps: true,
            createdAt: "created_at",
            updatedAt: "updated_at",
            indexes: [
                { unique: true, fields: ["name"], name: "customer_categories_name_unique_idx" },
                { fields: ["is_active"], name: "customer_categories_active_idx" },
            ],
        }
    );
}

module.exports = defineCustomerCategoryModel;
