const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db');

function defineBranchModel(schema) {
    return sequelize.define(
        'Branch',
        {
            id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
            code: { type: DataTypes.STRING(16), allowNull: false, unique: true },
            name: { type: DataTypes.STRING(255), allowNull: false },
            phone: { type: DataTypes.STRING(32), allowNull: true },
            email: { type: DataTypes.STRING(255), allowNull: true },
            address: { type: DataTypes.TEXT, allowNull: true },
            city: { type: DataTypes.STRING(100), allowNull: true },
            is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
            metadata: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} }
        },
        {
            schema,
            tableName: 'branches',
            timestamps: true,
            createdAt: 'created_at',
            updatedAt: 'updated_at',
            indexes: [{ unique: true, fields: ['code'] }]
        }
    );
}

function defineBranchCapitalTxnModel(schema) {
    return sequelize.define(
        'BranchCapitalTransaction',
        {
            id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
            from_branch_id: { type: DataTypes.UUID, allowNull: false },
            to_branch_id: { type: DataTypes.UUID, allowNull: false },
            amount: { type: DataTypes.DECIMAL(18,2), allowNull: false },
            note: { type: DataTypes.TEXT, allowNull: true },
            ref_no: { type: DataTypes.STRING(64), allowNull: true },
            txn_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
            metadata: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} }
        },
        {
            schema,
            tableName: 'branch_capital_transactions',
            timestamps: true,
            createdAt: 'created_at',
            updatedAt: 'updated_at',
            indexes: [{ fields: ['from_branch_id'] }, { fields: ['to_branch_id'] }, { fields: ['txn_at'] }]
        }
    );
}

module.exports = { defineBranchModel, defineBranchCapitalTxnModel };
