const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db');

function defineInventoryAssetModel(schema) {
    return sequelize.define(
        'InventoryAsset',
        {
            id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
            branch_id: { type: DataTypes.UUID, allowNull: true },
            code: { type: DataTypes.STRING(32), allowNull: false, unique: true },
            name: { type: DataTypes.STRING(255), allowNull: false },
            category: { type: DataTypes.STRING(100), allowNull: true }, // mis: Kendaraan, Peralatan, dll
            acquisition_date: { type: DataTypes.DATE, allowNull: false },
            acquisition_cost: { type: DataTypes.DECIMAL(18,2), allowNull: false },
            salvage_value: { type: DataTypes.DECIMAL(18,2), allowNull: false, defaultValue: 0 },
            useful_life_months: { type: DataTypes.INTEGER, allowNull: false }, // umur manfaat
            method: { type: DataTypes.ENUM('straight_line','declining_balance'), defaultValue: 'straight_line' },
            is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
            note: { type: DataTypes.TEXT, allowNull: true },
            metadata: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} }
        },
        {
            schema,
            tableName: 'inventory_assets',
            timestamps: true,
            createdAt: 'created_at',
            updatedAt: 'updated_at',
            indexes: [{ unique: true, fields: ['code'] }, { fields: ['branch_id'] }]
        }
    );
}

module.exports = defineInventoryAssetModel;
