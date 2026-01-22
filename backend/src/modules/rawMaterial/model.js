const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db');

function defineRawMaterialCategoryModel(schema) {
    return sequelize.define('RawMaterialCategory', {
        id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
        name: { type: DataTypes.STRING(120), allowNull: false },
        description: { type: DataTypes.TEXT, allowNull: true },
        metadata: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} }
    }, { schema, tableName: 'rm_categories', timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });
}

function defineRawMaterialModel(schema) {
    return sequelize.define('RawMaterial', {
        id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
        category_id: { type: DataTypes.UUID, allowNull: true },
        code: { type: DataTypes.STRING(32), allowNull: false, unique: true },
        name: { type: DataTypes.STRING(255), allowNull: false },
        unit: { type: DataTypes.STRING(32), allowNull: false }, // kg, m, pcs
        min_stock: { type: DataTypes.DECIMAL(18,3), defaultValue: 0 },
        metadata: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
        is_active: { type: DataTypes.BOOLEAN, defaultValue: true }
    }, { schema, tableName: 'rm_items', timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });
}

function defineRawMaterialStockModel(schema) {
    return sequelize.define('RawMaterialStock', {
        // saldo per cabang per item
        id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
        branch_id: { type: DataTypes.UUID, allowNull: false },
        rm_id: { type: DataTypes.UUID, allowNull: false },
        qty: { type: DataTypes.DECIMAL(18,3), allowNull: false, defaultValue: 0 }
    }, { schema, tableName: 'rm_stock', timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at', indexes: [{ unique: true, fields: ['branch_id', 'rm_id'] }] });
}

function defineRawMaterialMoveModel(schema) {
    return sequelize.define('RawMaterialMove', {
        id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
        rm_id: { type: DataTypes.UUID, allowNull: false },
        from_branch_id: { type: DataTypes.UUID, allowNull: true }, // boleh null kalau pembelian
        to_branch_id: { type: DataTypes.UUID, allowNull: true },   // boleh null kalau pemakaian/produksi
        qty: { type: DataTypes.DECIMAL(18,3), allowNull: false },
        reason: { type: DataTypes.ENUM('purchase','usage','transfer','adjustment'), allowNull: false },
        note: { type: DataTypes.TEXT, allowNull: true },
        ref_no: { type: DataTypes.STRING(64), allowNull: true },
        moved_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
    }, { schema, tableName: 'rm_moves', timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at', indexes: [{ fields: ['rm_id'] }, { fields: ['moved_at'] }] });
}

module.exports = {
    defineRawMaterialCategoryModel,
    defineRawMaterialModel,
    defineRawMaterialStockModel,
    defineRawMaterialMoveModel
};
