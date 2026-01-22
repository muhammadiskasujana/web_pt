const { DataTypes } = require("sequelize");
const sequelize = require("../../config/db");

function defineProductSpecialPriceModel(schema) {
    return sequelize.define(
        "ProductSpecialPrice",
        {
            id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
            product_id: { type: DataTypes.UUID, allowNull: false },
            customer_category_id: { type: DataTypes.UUID, allowNull: false },
            special_price: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
            valid_from: { type: DataTypes.DATE, allowNull: true },
            valid_to: { type: DataTypes.DATE, allowNull: true },
        },
        {
            schema,
            tableName: "product_special_prices",
            timestamps: true,
            createdAt: "created_at",
            updatedAt: "updated_at",
            indexes: [
                { unique: true, fields: ["product_id", "customer_category_id"], name: "psp_unique_product_customer_idx" },
                { fields: ["valid_from", "valid_to"], name: "psp_validity_idx" },
            ],
        }
    );
}

module.exports = defineProductSpecialPriceModel;
