// modules/expense/model.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db');

function defineExpenseModel(schema) {
    return sequelize.define('Expense', {
        id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
        branch_id: { type: DataTypes.UUID, allowNull: true },
        expense_type: { type: DataTypes.ENUM('raw_material_purchase','product_purchase','payroll','operational','other'), allowNull: false },
        employee_id: { type: DataTypes.UUID, allowNull: true },
        supplier_name: { type: DataTypes.STRING(255), allowNull: true },
        product_id: { type: DataTypes.UUID, allowNull: true },
        rm_id: { type: DataTypes.UUID, allowNull: true },

        reference_no: { type: DataTypes.STRING(50), allowNull: true },
        description: { type: DataTypes.TEXT, allowNull: true },
        qty: { type: DataTypes.DECIMAL(12,2), allowNull: true },
        unit_cost: { type: DataTypes.INTEGER, allowNull: true },
        total: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },

        payment_status: { type: DataTypes.ENUM('lunas','hutang'), allowNull: false, defaultValue:'lunas' },
        transaction_type: { type: DataTypes.ENUM('tunai','transfer'), allowNull: false, defaultValue:'tunai' },
        paid_amount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        balance: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },

        spent_at: { type: DataTypes.DATE, allowNull: false },
        attachments: { type: DataTypes.ARRAY(DataTypes.JSONB), allowNull: true },
    }, {
        schema,
        tableName: 'expenses',
        timestamps: true,
        paranoid: true,
        indexes: [{ fields: ['expense_type'] }, { fields: ['branch_id'] }, { fields: ['spent_at'] }]
    });
}

module.exports = defineExpenseModel;
